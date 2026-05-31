export function Toasts({ toasts }) {
  return (
    <div className="fixed right-3 top-14 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={`rounded-lg px-4 py-2 text-xs text-white shadow-lg ${toast.tone === 'error' ? 'bg-danger' : 'bg-cruzy'}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
