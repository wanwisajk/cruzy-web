import { BranchCard } from './BranchCard';
import { regionColor } from '../hooks/useBranches';

export function BranchList({ loading, regions, filtered, branches, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-2xl">⏳ กำลังโหลด...</p>
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-4xl mb-3">🏢</p>
        <p className="font-semibold">ไม่พบสาขา</p>
        <p className="text-sm mt-1">ลองเปลี่ยนตัวกรอง หรือเพิ่มสาขาใหม่</p>
      </div>
    );
  }

  return regions.map((region) => {
    const regionBranches = filtered.filter((branch) => branch.region_id === region.id);
    if (!regionBranches.length) return null;

    return (
      <div key={region.id} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${regionColor[region.id] || regionColor.default}`}>{region.name}</span>
          <span className="text-xs text-slate-400">{regionBranches.length} สาขา</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {regionBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              regionName={region.name}
              onEdit={onEdit}
              onDelete={(id) => onDelete(branches.find((item) => item.id === id))}
            />
          ))}
        </div>
      </div>
    );
  });
}
