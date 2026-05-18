import { h, mount, clear } from "../lib/dom.js";

const root = () => document.getElementById("modal-root");

export function openModal(contentNode, opts = {}) {
  const r = root();
  const onBackdrop = (e) => {
    if (opts.dismissable !== false && e.target.classList.contains("modal-backdrop")) {
      closeModal();
    }
  };
  const backdrop = h("div.modal-backdrop", { onclick: onBackdrop }, [
    h("div.modal-card", { onclick: (e) => e.stopPropagation() }, contentNode),
  ]);
  mount(r, backdrop);
  return closeModal;
}

export function closeModal() {
  const r = root();
  if (r) clear(r);
}
