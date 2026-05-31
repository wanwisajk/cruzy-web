export function Toasts({ toasts }) {
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`t ${toast.tone === 'error' ? 't-err' : 't-ok'}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
