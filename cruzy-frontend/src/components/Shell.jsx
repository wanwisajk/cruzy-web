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
  { id: 'warning', label: 'หนังสือเตือน', icon: FileWarning },
  { id: 'auditlog', label: 'Log', icon: ClipboardList, ownerOnly: true },
  { id: 'access', label: 'สิทธิ์', icon: LockKeyhole, ownerOnly: true }
];

export function Shell({ data, user, currentTab, setCurrentTab, currentBranch, setCurrentBranch, children, onLogout, alertCount }) {
  const branches = getScopeBranches(data, user);
  const availableMenus = menus.filter((menu) => !menu.ownerOnly || user.role === 'owner');

  function chooseTab(tab) {
    setCurrentTab(tab);
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <nav className="sticky top-0 z-30 flex h-12 items-center justify-between bg-cruzy px-4 text-white shadow-md">
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-bold">Cruzy Admin</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            {user.label || user.role}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-white/20 px-3 py-1 text-[11px] sm:inline">{user.name}</span>
          <button className="btn bg-white/15 px-2 py-1 text-white hover:bg-white/25" onClick={onLogout}>
            <LogOut size={14} />
            ออก
          </button>
        </div>
      </nav>
      <div className="flex h-[calc(100vh-48px)]">
        <aside className="w-[68px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white md:w-[220px]">
          <div className="border-b border-slate-200 p-3">
            <div className="mb-2 hidden text-[10px] font-bold uppercase tracking-wide text-slate-400 md:block">เมนู</div>
            <div className="space-y-1">
              {availableMenus.map((menu) => {
                const Icon = menu.icon;
                const active = currentTab === menu.id;
                return (
                  <button key={menu.id} onClick={() => chooseTab(menu.id)} className={`flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-semibold transition md:justify-start ${active ? 'bg-cruzy text-white' : 'text-slate-700 hover:bg-cruzy-50 hover:text-cruzy'}`}>
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
          <div className="p-3">
            <div className="mb-2 hidden text-[10px] font-bold uppercase tracking-wide text-slate-400 md:block">สาขา</div>
            <button onClick={() => setCurrentBranch('all')} className={`mb-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 px-2 py-2 text-xs transition md:justify-start ${currentBranch === 'all' ? 'border-cruzy-400 bg-cruzy-50 font-bold text-cruzy' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${currentBranch === 'all' ? 'bg-cruzy text-white' : 'bg-slate-100'}`}>ALL</span>
              <span className="hidden md:inline">ทุกสาขา</span>
            </button>
            {branches.map((branch, index) => {
              const showRegion = index === 0 || branches[index - 1].region !== branch.region;
              return (
                <div key={branch.id}>
                  {showRegion ? <div className="hidden px-2 pb-1 pt-2 text-[10px] font-bold uppercase text-slate-400 md:block">{data.regions[branch.region]?.name || branch.region}</div> : null}
                  <button onClick={() => setCurrentBranch(branch.id)} className={`mb-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 px-2 py-1.5 text-xs transition md:justify-start ${currentBranch === branch.id ? 'border-cruzy-400 bg-cruzy-50 font-bold text-cruzy' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${currentBranch === branch.id ? 'bg-cruzy text-white' : 'bg-slate-100'}`}>{branch.code}</span>
                    <span className="hidden truncate md:inline">{branch.name.split(' ').pop()}</span>
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
