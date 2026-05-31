import { Building2, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';

export function Login({ onLogin, loading, error }) {
  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onLogin(String(form.get('username') || '').trim(), String(form.get('password') || '').trim());
  }

  return (
    <div className="login-overlay">
      <form onSubmit={handleSubmit} className="login-box">
        <div className="logo mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-cruzy-50 text-cruzy">
          <Building2 size={34} />
        </div>
        <h1>Cruzy Admin</h1>
        <p className="sub">Dashboard</p>
        <div className="fg">
          <label>
            <span>Username</span>
            <input name="username" className="mt-1" placeholder="username" />
          </label>
        </div>
        <div className="fg">
          <label>
            <span>Password</span>
            <input name="password" type="password" className="mt-1" placeholder="password" />
          </label>
        </div>
        <Button type="submit" variant="primary" className="login-btn w-full" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          เข้าสู่ระบบ
        </Button>
        {error ? <div className="login-error">{error}</div> : null}
      </form>
    </div>
  );
}
