export function Content({ title, icon: Icon, stats, children }) {
  return (
    <div className="p-5">
      <div className="mb-4 flex items-center gap-2 text-cruzy">
        <Icon size={20} />
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      {stats.length ? (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {stats.map(([label, value]) => (
            <div key={label} className="stat border-cruzy">
              <div className="text-2xl font-bold text-cruzy">{value}</div>
              <div className="mt-1 text-[11px] text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function Table({ headers, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {headers.map((head) => (
              <th
                key={head}
                className="border-b-2 border-slate-200 bg-[#fafafa] px-3 py-2 text-left text-[11px] font-bold text-slate-500"
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
