export function Modal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-5 fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm card-noir rounded-lg p-6 ring-gold"
      >
        {children}
      </div>
    </div>
  );
}
