export function BranchStats({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className={`${stat.bg} rounded-2xl px-4 py-3`}>
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
