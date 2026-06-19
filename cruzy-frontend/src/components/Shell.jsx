import { useEffect, useState } from 'react';
import { AlertTriangle, Banknote, CalendarDays, ClipboardList, FileWarning, LockKeyhole, LogOut, Menu, Search, UserRound, UsersRound, X } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const branches = getScopeBranches(data, user);
  const availableMenus = menus.filter((menu) => {
    if (menu.ownerOnly) return user.role === 'owner';
    return true;
  });

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentTab, currentBranch]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const sidebarContent = (
    <>
      <div className="sb-section">
        <div className="sb-section-title">เมนู</div>
        <div className="space-y-1">
          {availableMenus.map((menu) => {
            const Icon = menu.icon;
            const active = currentTab === menu.id;
            return (
              <button key={menu.id} onClick={() => chooseTab(menu.id)} className={`sb-item ${active ? 'active' : ''}`}>
                <Icon size={17} />
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{menu.label}</span>
                  {menu.id === 'alerts' && alertCount ? <span className="rounded-full bg-danger px-1.5 py-0.5 caption text-white">{alertCount}</span> : null}
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
          <span className="truncate">ทุกสาขา</span>
        </button>
        {branches.map((branch, index) => {
          const showRegion = index === 0 || branches[index - 1].region !== branch.region;
          return (
            <div key={branch.id}>
              {showRegion ? <div className="sb-region">{data.regions[branch.region]?.name || branch.region}</div> : null}
              <button onClick={() => setCurrentBranch(branch.id)} className={`sb-branch ${currentBranch === branch.id ? 'active' : ''}`}>
                <span className="code">{branch.code}</span>
                <span className="truncate">{branch.name}</span>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <nav className="nav">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="nav-btn nav-menu lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="เปิดเมนู"
          >
            <Menu size={16} />
          </button>
          <h1 className="body-strong truncate">Cruzy Admin</h1>
          <span className="nav-badge">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            {user.label || user.role}
          </span>
        </div>
        <div className="nav-right">
          <span className="nav-user hidden md:inline">{user.name}</span>
          <button className="nav-btn" onClick={onLogout}>
            <LogOut size={14} />
            <span className="hidden sm:inline">ออก</span>
          </button>
        </div>
      </nav>
      <div className="relative flex min-h-[calc(100vh-56px)] lg:h-[calc(100vh-56px)]">
        <div
          className={`mobile-sidebar-overlay ${mobileMenuOpen ? 'open' : ''}`}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden={!mobileMenuOpen}
        />
        <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="sb-mobile-head lg:hidden">
            <div>
              <div className="body-strong text-gray-900">{user.name}</div>
              <div className="caption text-gray-500">{user.label || user.role}</div>
            </div>
            <button type="button" className="icon-btn" onClick={() => setMobileMenuOpen(false)} aria-label="ปิดเมนู">
              <X size={16} />
            </button>
          </div>
          {sidebarContent}
        </aside>
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
