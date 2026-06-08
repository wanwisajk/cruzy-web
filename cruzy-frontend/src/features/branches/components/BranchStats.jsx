export function BranchStats({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className={`${stat.bg} rounded-xl px-4 py-3`}>
          <p className={`heading-2 ${stat.color}`}>{stat.value}</p>
          <p className="caption text-slate-500 mt-0.5 body-emphasis">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

