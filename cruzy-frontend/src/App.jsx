import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { DateBar } from './components/DateBar';
import { Login } from './components/Login';
import { Shell } from './components/Shell';
import { Toasts } from './components/Toasts';
import { useToast } from './hooks/useToast';
import { api } from './lib/api';
import { fmtDate } from './lib/date';
import { hydrateConsoleData } from './lib/hydrate';
import { ScheduleView } from './views/ScheduleView';
import { AccessView, AlertsView, AuditLogView, CommissionView, InspectionView, LeaveView, SalesView, WarningView } from './views/SimpleViews';
import { EmployeeView } from './views/EmployeeView';

const sessionKey = 'cruzyAdminSession';

export default function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [currentTab, setCurrentTab] = useState('schedule');
  const [currentBranch, setCurrentBranch] = useState('all');
  const [from, setFrom] = useState(fmtDate(new Date()));
  const [to, setTo] = useState(fmtDate(new Date()));
  const [booting, setBooting] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const { toasts, push } = useToast();

  useEffect(() => {
    bootFromSession();
  }, []);

  async function loadData() {
    const payload = await api.consoleData();
    const hydrated = hydrateConsoleData(payload);
    setData(hydrated);
    setFrom(hydrated.initialDate);
    setTo(hydrated.initialDateTo);
    return hydrated;
  }

  async function bootFromSession() {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) {
      setBooting(false);
      return;
    }
    try {
      const session = JSON.parse(raw);
      if (!session.user) throw new Error('missing user');
      setUser(session.user);
      await loadData();
    } catch (error) {
      console.error(error);
      localStorage.removeItem(sessionKey);
      setUser(null);
    } finally {
      setBooting(false);
    }
  }

  async function handleLogin(username, password) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const result = await api.login(username, password);
      setUser(result.user);
      localStorage.setItem(sessionKey, JSON.stringify({ user: result.user, timestamp: Date.now() }));
      await loadData();
      push('เข้าสู่ระบบแล้ว');
    } catch (error) {
      setAuthError(error.message || 'Username หรือ Password ไม่ถูกต้อง');
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(sessionKey);
    setUser(null);
    setData(null);
    setCurrentTab('schedule');
    setCurrentBranch('all');
  }

  const alertCount = useMemo(() => {
    if (!data) return 0;
    return data.attendanceAlerts.filter((alert) => !alert.ack && (currentBranch === 'all' || alert.branch === currentBranch)).length;
  }, [data, currentBranch]);

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] text-cruzy">
        <Loader2 className="animate-spin" size={26} />
      </div>
    );
  }

  if (!user || !data) {
    return (
      <>
        <Login onLogin={handleLogin} loading={authLoading} error={authError} />
        <Toasts toasts={toasts} />
      </>
    );
  }

  return (
    <>
      <Shell
        data={data}
        user={user}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentBranch={currentBranch}
        setCurrentBranch={setCurrentBranch}
        onLogout={logout}
        alertCount={alertCount}
      >
        <DateBar from={from} to={to} setFrom={setFrom} setTo={setTo} />
        {currentTab === 'schedule' ? <ScheduleView data={data} setData={setData} user={user} currentBranch={currentBranch} from={from} to={to} toast={push} /> : null}
        {currentTab === 'leave' ? <LeaveView data={data} user={user} currentBranch={currentBranch} /> : null}
        {currentTab === 'employee' ? <EmployeeView data={data} user={user} currentBranch={currentBranch} setData={setData} toast={push} /> : null}
        {currentTab === 'sales' ? <SalesView data={data} user={user} currentBranch={currentBranch} from={from} to={to} /> : null}
        {currentTab === 'commission' ? <CommissionView data={data} user={user} currentBranch={currentBranch} /> : null}
        {currentTab === 'inspection' ? <InspectionView data={data} user={user} currentBranch={currentBranch} /> : null}
        {currentTab === 'alerts' ? <AlertsView data={data} user={user} currentBranch={currentBranch} /> : null}
        {currentTab === 'warning' ? <WarningView data={data} user={user} currentBranch={currentBranch} /> : null}
        {currentTab === 'auditlog' ? <AuditLogView data={data} user={user} currentBranch={currentBranch} /> : null}
        {currentTab === 'access' ? <AccessView data={data} user={user} currentBranch={currentBranch} /> : null}
      </Shell>
      <Toasts toasts={toasts} />
    </>
  );
}
