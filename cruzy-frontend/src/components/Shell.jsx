import { AlertTriangle, Banknote, CalendarDays, ClipboardList, FileWarning, LockKeyhole, LogOut, Search, Shield, UserRound, UsersRound } from 'lucide-react';
import { getScopeBranches } from '../lib/schedule';

const menus = [
  { id: 'schedule', label: 'ตารางงาน', icon: CalendarDays },
  { id: 'leave', label: 'การลา', icon: ClipboardList },
  { id: 'employee', label: 'พนักงาน', icon: UserRound },
  { id: 'sales', label: 'ยอดขาย', icon: Banknote },
  { id: 'commission', label: 'ค่าคอม', icon: UsersRound },
  { id: 'inspection', label: 'ตรวจร้าน', icon: Search },
  { id: 'alerts', label: 'แจ้งเตือน', icon: AlertTriangle },
  { id: 'warning-letters', label: 'หนังสือเตือน', icon: FileWarning },
  { id: 'auditlog', label: 'Log', icon: ClipboardList, ownerOnly: true },
  { id: 'access', label: 'สิทธิ์', icon: LockKeyhole, ownerOnly: true }
];

export function Shell({ data, user, currentTab, setCurrentTab, currentBranch, setCurrentBranch, children, onLogout, alertCount, navigate }) {
  const branches = getScopeBranches(data, user);
  const availableMenus = menus.filter((menu) => !menu.ownerOnly || user.role === 'owner');

  function chooseTab(tab) {
    setCurrentTab(tab);
    if (tab === 'leave') {
      navigate?.('/leave');
      return;
    }
    if (tab === 'commission') {
      navigate?.('/commission');
      return;
    }
    if (tab === 'inspection') {
      navigate?.('/inspection');
      return;
    }
    if (tab === 'alerts') {
      navigate?.('/alerts');
      return;
    }
    if (tab === 'warning-letters') {
      navigate?.('/warning-letters');
      return;
    }
    if (tab === 'auditlog') {
      navigate?.('/auditlog');
      return;
    }
    if (tab === 'access') {
      navigate?.('/access');
      return;
    }
    if (navigate) {
      navigate('/');
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <nav className="nav">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold">Cruzy Admin</h1>
          <span className="nav-badge">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            {user.label || user.role}
          </span>
        </div>
        <div className="nav-right">
          <span className="nav-user hidden sm:inline">{user.name}</span>
          <button className="nav-btn" onClick={onLogout}>
            <LogOut size={14} />
            ออก
          </button>
        </div>
      </nav>
      <div className="flex h-[calc(100vh-48px)]">
        <aside className="sidebar">
          <div className="sb-section">
            <div className="sb-section-title">เมนู</div>
            <div className="space-y-1">
              {availableMenus.map((menu) => {
                const Icon = menu.icon;
                const active = currentTab === menu.id;
                return (
                  <button key={menu.id} onClick={() => chooseTab(menu.id)} className={`sb-item ${active ? 'active' : ''}`}>
                    <Icon size={17} />
                    <span className="hidden md:inline">
                      {menu.label}
                      {menu.id === 'alerts' && alertCount ? <span className="ml-1 rounded-full bg-danger px-1.5 py-0.5 text-[10px] text-white">{alertCount}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="sb-section">
            <div className="sb-section-title">สาขา</div>
            <button onClick={() => setCurrentBranch('all')} className={`sb-branch ${currentBranch === 'all' ? 'active' : ''}`}>
              <span className="code">ALL</span>
              <span className="hidden md:inline">ทุกสาขา</span>
            </button>
            {branches.map((branch, index) => {
              const showRegion = index === 0 || branches[index - 1].region !== branch.region;
              return (
                <div key={branch.id}>
                  {showRegion ? <div className="sb-region">{data.regions[branch.region]?.name || branch.region}</div> : null}
                  <button onClick={() => setCurrentBranch(branch.id)} className={`sb-branch ${currentBranch === branch.id ? 'active' : ''}`}>
                    <span className="code">{branch.code}</span>
                    <span className="hidden md:inline">{branch.name.split(' ').pop()}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
