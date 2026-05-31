/**
 * sound.js — Natural multi-language TTS via Web Speech API
 *
 * Human-sounding tricks:
 *  1. Pick voice matching current UI language (uk/en/ru).
 *  2. Split at sentence boundaries → each utterance gets its own prosody.
 *  3. Slight random pitch/rate variation per sentence (±0.05) → avoids robotic monotone.
 *  4. Short silent pause between sentences via a 0-volume space utterance.
 *  5. rate 0.82 / pitch 0.88 → warmer, slower, cinematic feel.
 *  6. Chrome keep-alive: resume if synthesis pauses silently after ~15 s.
 *  7. Ukrainian fallback: if no premium uk voice found, use Russian TTS (better quality).
 */

import { getLang } from './i18n.js';

let _enabled = true;
let _voices  = [];
let _keepAliveTimer = null;

// ── Voice loading ──────────────────────────────────────────────────────────────
function loadVoices() {
  _voices = window.speechSynthesis?.getVoices() || [];
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

// ── Voice picker — returns { voice, bcp } ──────────────────────────────────────
function pickVoice() {
  const lang = getLang?.() || 'uk';

  if (lang === 'uk') {
    // Prefer neural/Google/premium Ukrainian voices
    const premiumUk =
      _voices.find(v => /google/i.test(v.name)                    && v.lang === 'uk-UA') ||
      _voices.find(v => /google/i.test(v.name)                    && v.lang?.startsWith('uk')) ||
      _voices.find(v => /(neural|enhanced|premium|polly)/i.test(v.name) && v.lang?.startsWith('uk'));
    if (premiumUk) return { voice: premiumUk, bcp: 'uk-UA' };

    // Fall back to Russian TTS — better quality than system uk voice on most platforms
    const ruVoice =
      _voices.find(v => /google/i.test(v.name) && v.lang === 'ru-RU') ||
      _voices.find(v => /google/i.test(v.name) && v.lang?.startsWith('ru')) ||
      _voices.find(v => v.lang === 'ru-RU') ||
      _voices.find(v => v.lang?.startsWith('ru'));
    if (ruVoice) return { voice: ruVoice, bcp: 'ru-RU' };

    // Last resort: whatever uk voice exists
    const anyUk = _voices.find(v => v.lang === 'uk-UA') || _voices.find(v => v.lang?.startsWith('uk'));
    return { voice: anyUk || _voices[0] || null, bcp: 'uk-UA' };
  }

  if (lang === 'en') {
    const voice =
      _voices.find(v => /google/i.test(v.name) && v.lang === 'en-US') ||
      _voices.find(v => /google/i.test(v.name) && v.lang?.startsWith('en')) ||
      _voices.find(v => v.lang === 'en-US') ||
      _voices.find(v => v.lang?.startsWith('en')) ||
      _voices[0] || null;
    return { voice, bcp: 'en-US' };
  }

  // ru
  const voice =
    _voices.find(v => /google/i.test(v.name) && v.lang === 'ru-RU') ||
    _voices.find(v => /google/i.test(v.name) && v.lang?.startsWith('ru')) ||
    _voices.find(v => v.lang === 'ru-RU') ||
    _voices.find(v => v.lang?.startsWith('ru')) ||
    _voices[0] || null;
  return { voice, bcp: 'ru-RU' };
}

// ── Text cleanup ───────────────────────────────────────────────────────────────
function clean(text) {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u2600-\u27FF]/g, '')
    .replace(/[^\p{L}\p{N}\s,.'!?:;—–\-]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Split at sentence endings for natural prosody per sentence
function sentences(text) {
  const parts = [];
  let buf = '';
  for (const ch of text) {
    buf += ch;
    if ('.!?'.includes(ch)) {
      const s = buf.trim();
      if (s) parts.push(s);
      buf = '';
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.length ? parts : [text];
}

// Small random variation to make consecutive sentences sound different
function jitter(base, amount) {
  return base + (Math.random() * 2 - 1) * amount;
}

// ── Chrome keep-alive fix ──────────────────────────────────────────────────────
function startKeepAlive() {
  stopKeepAlive();
  _keepAliveTimer = setInterval(() => {
    if (window.speechSynthesis?.paused) window.speechSynthesis.resume();
    if (!window.speechSynthesis?.speaking) stopKeepAlive();
  }, 4000);
}
function stopKeepAlive() {
  clearInterval(_keepAliveTimer);
  _keepAliveTimer = null;
}

// Queue a near-silent utterance as a pause between sentences
function makePause(voice, bcp) {
  const u = new SpeechSynthesisUtterance('\u00a0'); // non-breaking space
  u.lang   = bcp;
  u.volume = 0.01;
  u.rate   = 10;
  u.pitch  = 1;
  if (voice) u.voice = voice;
  return u;
}

// ── Public API ─────────────────────────────────────────────────────────────────
export function speak(text, { rate = 0.82, pitch = 0.88, volume = 1 } = {}) {
  if (!_enabled || !window.speechSynthesis) return;
  const cleaned = clean(text);
  if (!cleaned) return;

  window.speechSynthesis.cancel();
  stopKeepAlive();

  const { voice, bcp } = pickVoice();
  const parts = sentences(cleaned);

  parts.forEach((part, i) => {
    if (i > 0) {
      window.speechSynthesis.speak(makePause(voice, bcp));
    }

    const utt    = new SpeechSynthesisUtterance(part);
    utt.lang     = bcp;
    utt.rate     = Math.max(0.6, Math.min(1.1, jitter(rate,  0.04)));
    utt.pitch    = Math.max(0.6, Math.min(1.4, jitter(pitch, 0.05)));
    utt.volume   = volume;
    if (voice) utt.voice = voice;
    window.speechSynthesis.speak(utt);
  });

  startKeepAlive();
}

export function speakSilent() {
  window.speechSynthesis?.cancel();
  stopKeepAlive();
}
export function toggleSound() { _enabled = !_enabled; if (!_enabled) speakSilent(); return _enabled; }
export function isSoundOn()   { return _enabled; }
