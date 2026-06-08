export function Content({ title, icon: Icon, stats, action, children }) {
  return (
    <div className="app-page">
      <div className="page-header">
        <div className="page-heading">
          {Icon ? (
            <div className="page-icon">
              <Icon size={22} />
            </div>
          ) : null}
          <div className="page-heading-text">
            <h1 className="page-title">{title}</h1>
          </div>
        </div>
        {action}
        {stats?.length > 0 && (
          <div className="flex gap-6">
            {stats.map(([label, value]) => (
              <div key={label} className="text-right">
                <div className="stat-number text-cruzy">{value}</div>
                <div className="stat-label text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

export function Table({ headers, children }) {
  return (
    <div className="table-shell">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-3 text-left table-head text-slate-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}
