import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { DateBar } from './components/DateBar';
import { Login } from './components/Login';
import { Shell } from './components/Shell';
import { Toasts } from './components/Toasts';
import { useToast } from './hooks/useToast';
import { api } from './lib/api';
import { fmtDate } from './lib/date';
import { hydrateConsoleData } from './lib/hydrate';
import EmployeesPage from './pages/EmployeesPage.jsx';
import ScheduleDashboard from './pages/ScheduleDashboard.jsx';
import SalesDashboard from './pages/SaleDashboard.jsx';
import LeaveDashboard from './pages/LeaveDashboard.jsx';
import CommissionDashboard from './pages/CommissionDashboard.jsx';
import InspectionDashboard from './pages/InspectionDashboard.jsx';
import AlertPage, { buildDisciplineAlerts } from './pages/AlertPage.jsx';
import WarningLetterPage from './pages/WarningLetterPage.jsx';
import LogPage from './pages/LogPage.jsx';
import AccessDashboard from './pages/AccessDashboard.jsx';

const sessionKey = 'cruzyAdminSession';

export default function App() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [currentTab, setCurrentTab] = useState('schedule');
  const [currentBranch, setCurrentBranch] = useState('all');
  const [from, setFrom] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    return fmtDate(firstDay);
  });
  const [to, setTo] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);
    return fmtDate(lastDay);
  });
  const [booting, setBooting] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const { toasts, push } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    bootFromSession();
  }, []);

  async function loadData() {
    const payload = await api.consoleData();
    const hydrated = hydrateConsoleData(payload);
    setData(hydrated);
    const today = new Date(hydrated.initialDate);
    const dayOfWeek = today.getDay();
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);
    setFrom(fmtDate(firstDay));
    setTo(fmtDate(lastDay));
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
    const storedCount = data.attendanceAlerts.filter((alert) => (
      !alert.ack &&
      (currentBranch === 'all' || String(alert.branch) === String(currentBranch))
    )).length;
    const disciplineCount = buildDisciplineAlerts(data).filter((alert) => (
      currentBranch === 'all' || String(alert.branch_id) === String(currentBranch)
    )).length;
    return storedCount + disciplineCount;
  }, [data, currentBranch]);

  useEffect(() => {
    if (location.pathname === '/leave') {
      setCurrentTab('leave');
      return;
    }
    if (location.pathname === '/commission') {
      setCurrentTab('commission');
      return;
    }
    if (location.pathname === '/inspection') {
      setCurrentTab('inspection');
      return;
    }
    if (location.pathname === '/alerts') {
      setCurrentTab('alerts');
      return;
    }
    if (location.pathname === '/warning-letters') {
      setCurrentTab('warning-letters');
      return;
    }
    if (location.pathname === '/auditlog') {
      setCurrentTab('auditlog');
      return;
    }
    if (location.pathname === '/access') {
      setCurrentTab('access');
      return;
    }
  }, [location.pathname]);

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
        navigate={navigate}
      >
        {location.pathname !== '/leave' && location.pathname !== '/auditlog' ? // App.tsx
<DateBar from={from} to={to} setFrom={setFrom} setTo={setTo} initialDate={data.initialDate} /> : null}
        <Routes>
          <Route
            path="/leave"
            element={<LeaveDashboard data={data} currentBranch={currentBranch} />}
          />
          <Route
            path="/inspection"
            element={<InspectionDashboard user={user} currentBranch={currentBranch} from={from} to={to} />}
          />
          <Route
            path="/alerts"
            element={<AlertPage data={data} currentBranch={currentBranch} />}
          />
          <Route
            path="/auditlog"
            element={<LogPage />}
          />
          <Route
            path="/access"
            element={<AccessDashboard user={user} fallbackData={data} />}
          />
          <Route
            path="/*"
            element={
              <>
                {currentTab === 'schedule' ? <ScheduleDashboard data={data} setData={setData} user={user} currentBranch={currentBranch} from={from} to={to} toast={push} /> : null}
                {currentTab === 'employee' ? <EmployeesPage data={data} user={user} currentBranch={currentBranch} from={from} to={to} setData={setData} toast={push} /> : null}
                {currentTab === 'sales' ? <SalesDashboard data={data} user={user} currentBranch={currentBranch} from={from} to={to} /> : null}
  {currentTab === 'commission' ? <CommissionDashboard data={data} user={user} currentBranch={currentBranch} from={from} to={to} /> : null}                {currentTab === 'inspection' ? <InspectionDashboard user={user} currentBranch={currentBranch} from={from} to={to} /> : null}
                {currentTab === 'alerts' ? <AlertPage data={data} currentBranch={currentBranch} /> : null}
                {currentTab === 'warning-letters' ? <WarningLetterPage data={data} user={user} /> : null}
                {currentTab === 'access' ? <AccessDashboard user={user} fallbackData={data} /> : null}
              </>
            }
          />
        </Routes>
      </Shell>
      <Toasts toasts={toasts} />
    </>
  );
}
