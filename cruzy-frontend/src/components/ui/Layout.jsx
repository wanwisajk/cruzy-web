export function Content({ title, icon: Icon, stats, children }) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          {Icon && <Icon size={24} className="text-cruzy" />}
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        {stats?.length > 0 && (
          <div className="flex gap-6">
            {stats.map(([label, value]) => (
              <div key={label} className="text-right">
                <div className="text-2xl font-bold text-cruzy">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
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
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-slate-100">
          {headers.map((header) => (
            <th key={header} className="border border-slate-200 px-3 py-2 text-left text-xs font-bold text-slate-700">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {children}
      </tbody>
    </table>
  );
}
