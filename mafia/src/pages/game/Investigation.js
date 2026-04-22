import { Modal } from "@/components/ui/Modal";
import { hapticNotify } from "@/lib/telegram";

export function Investigation({ data, onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="text-center">
        <div className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Результат перевірки
        </div>
        <div className="mt-2 text-4xl">{data.isMafia ? "🩸" : "🌹"}</div>
        <div className="mt-3 font-display text-2xl">{data.name}</div>
        <div className={`mt-2 text-lg ${data.isMafia ? "blood-text" : "text-emerald-400"}`}>
          {data.isMafia ? "Це МАФІЯ." : "Це не мафія."}
        </div>
        <button
          onClick={() => { onClose(); hapticNotify("success"); }}
          className="mt-6 px-6 py-2 rounded-md border border-gold text-accent hover:bg-accent/10"
        >
          Закрити
        </button>
      </div>
    </Modal>
  );
}
