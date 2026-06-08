export function EmployeesContent({ title, icon: Icon, stats, children }) {
  const toneClasses = {
    emerald: 'border-t-emerald-700 bg-emerald-50/60',
    amber: 'border-t-amber-700 bg-amber-50/60',
    sky: 'border-t-sky-700 bg-sky-50/60',
    slate: 'border-t-slate-700 bg-slate-50/60'
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg"><Icon size={20} /></div>
        <h2 className="heading-3 text-slate-800 tracking-tight">{title}</h2>
      </div>
      {stats?.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(([label, value, tone = 'slate']) => (
            <div key={label} className={`bg-white border border-slate-200/60 shadow-sm p-4 rounded-xl flex flex-col justify-between min-h-85px ${toneClasses[tone]}`}>
              <div className="stat-number body-strong text-slate-800 tracking-tight">{value}</div>
              <div className="caption body-strong text-slate-400 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="pt-2">{children}</div>
    </div>
  );
}
