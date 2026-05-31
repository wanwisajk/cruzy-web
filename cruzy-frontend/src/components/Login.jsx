import { Building2, Loader2 } from 'lucide-react';

export function Login({ onLogin, loading, error }) {
  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onLogin(String(form.get('username') || '').trim(), String(form.get('password') || '').trim());
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#1B5E20,#2E7D32,#388E3C)] p-4">
      <form onSubmit={handleSubmit} className="w-95
       max-w-full rounded-2xl bg-white p-10 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-cruzy-50 text-cruzy">
          <Building2 size={34} />
        </div>
        <h1 className="text-[22px] font-bold text-cruzy">Cruzy Admin</h1>
        <p className="mb-6 text-xs text-slate-500">Dashboard</p>
        <label className="mb-3 block text-left">
          <span className="mb-1 block text-xs font-medium text-slate-500">Username</span>
          <input name="username" className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-cruzy" placeholder="username" />
        </label>
        <label className="mb-3 block text-left">
          <span className="mb-1 block text-xs font-medium text-slate-500">Password</span>
          <input name="password" type="password" className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-cruzy" placeholder="password" />
        </label>
        <button className="btn btn-primary mt-2 w-full py-3 text-sm" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          เข้าสู่ระบบ
        </button>
        {error ? <div className="mt-3 text-xs font-medium text-danger">{error}</div> : null}
      </form>
    </div>
  );
}
