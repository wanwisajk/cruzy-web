import { X } from 'lucide-react';

export function Modal({ title, children, footer, onClose }) {
  if (!title) return null;
  return (
    <div className="overlay open" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal">
        <div className="m-head">
          <h2>{title}</h2>
          <button className="m-close" onClick={onClose} aria-label="ปิด">
            <X size={20} />
          </button>
        </div>
        <div className="m-body">{children}</div>
        {footer ? <div className="m-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
