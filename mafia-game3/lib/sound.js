/**
 * sound.js — Natural Ukrainian TTS via Web Speech API
 *
 * Human-sounding tricks:
 *  1. Prefer "Google Українська" (Chrome) — most natural UA voice.
 *  2. Split at sentence boundaries → each utterance gets its own prosody.
 *  3. Slight random pitch/rate variation per sentence (±0.05) → avoids robotic monotone.
 *  4. Short silent pause between sentences via a 0-volume space utterance.
 *  5. rate 0.82 / pitch 0.88 → warmer, slower, cinematic feel.
 *  6. Chrome keep-alive: resume if synthesis pauses silently after ~15 s.
 */

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

function pickVoice() {
  // Priority: Google Ukrainian → any Ukrainian → Slavic → default
  return (
    _voices.find(v => /google/i.test(v.name) && v.lang === 'uk-UA')            ||
    _voices.find(v => /google/i.test(v.name) && v.lang?.startsWith('uk'))      ||
    _voices.find(v => v.lang === 'uk-UA')                                       ||
    _voices.find(v => v.lang?.startsWith('uk'))                                 ||
    _voices.find(v => ['pl','cs','sk','ru'].some(l => v.lang?.startsWith(l)))   ||
    _voices[0] || null
  );
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
function makePause(ms, voice) {
  const u = new SpeechSynthesisUtterance('\u00a0'); // non-breaking space
  u.lang   = 'uk-UA';
  u.volume = 0.01;
  u.rate   = 10;   // very fast → short pause in real time
  u.pitch  = 1;
  if (voice) u.voice = voice;
  return u;
}

// ── Public API ─────────────────────────────────────────────────────────────────
export function speak(text, { rate = 0.82, pitch = 0.88, volume = 1 } = {}) {
  if (!_enabled || !window.speechSynthesis) return;
  const t = clean(text);
  if (!t) return;

  window.speechSynthesis.cancel();
  stopKeepAlive();

  const voice = pickVoice();
  const parts = sentences(t);

  parts.forEach((part, i) => {
    // Insert a short pause before each sentence (except the first)
    if (i > 0) {
      window.speechSynthesis.speak(makePause(180, voice));
    }

    const utt    = new SpeechSynthesisUtterance(part);
    utt.lang     = 'uk-UA';
    // Slight per-sentence variation → sounds less robotic
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
