export function BranchToasts({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-2.5 rounded-xl body-strong text-white shadow-lg ${toast.type === 'err' ? 'bg-red-500' : 'bg-emerald-600'}`}
          style={{ animation: 'slideIn .2s ease' }}
        >
          {toast.msg}
        </div>
      ))}
    </div>
  );
}
