import { X } from 'lucide-react';

export function Modal({ title, children, footer, onClose }) {
  if (!title) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[90vh] w-[520px] max-w-full overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <button className="icon-btn border-0" onClick={onClose} aria-label="ปิด">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-4 py-3">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}
