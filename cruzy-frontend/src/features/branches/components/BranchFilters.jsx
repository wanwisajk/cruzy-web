export function BranchFilters({ search, onSearch, regions, filterRegion, onFilterRegion }) {
  return (
    <div className="flex flex-col gap-3 mb-5">
      <div className="relative w-full min-w-0">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="ค้นหาสาขา..."
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl body-text focus:outline-none focus:ring-2 focus:ring-emerald-400 transition bg-white"
        />
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex gap-1.5 whitespace-nowrap">
          {[{ id: 'all', label: 'ทั้งหมด' }, ...regions.map((region) => ({ id: region.id, label: region.name }))].map((region) => (
            <button
              key={region.id}
              onClick={() => onFilterRegion(region.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl caption-strong transition-colors ${filterRegion === region.id ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {region.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}