import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ROLE_ICON } from "@/components/game/RoleBadge";
import { ROLE_DESC, ROLE_LABEL } from "@/lib/game";
import { haptic } from "@/lib/telegram";

export function RoleReveal({ player, onClose }) {
  const [shown, setShown] = useState(false);
  return (
    <Modal onClose={() => {}}>
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Ваша таємна роль
        </div>
        {!shown ? (
          <button
            onClick={() => { setShown(true); haptic("heavy"); }}
            className="mt-6 px-8 py-6 rounded-lg border border-gold bg-accent/5 hover:bg-accent/10 transition-colors"
          >
            <div className="text-3xl mb-2">🃏</div>
            <div className="font-display tracking-[0.2em]">ВІДКРИТИ</div>
          </button>
        ) : (
          <div className="fade-in">
            <div className="text-6xl mt-3">{ROLE_ICON[player.role]}</div>
            <div className="mt-3 font-display text-3xl gold-text">
              {ROLE_LABEL[player.role]}
            </div>
            <p className="mt-3 text-sm text-muted-foreground font-serif italic max-w-xs mx-auto">
              {ROLE_DESC[player.role]}
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full py-3 rounded-md bg-gradient-to-b from-[hsl(0_70%_42%)] to-[hsl(0_70%_28%)] text-white font-display tracking-[0.2em]"
            >
              ПОЧАТИ
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
