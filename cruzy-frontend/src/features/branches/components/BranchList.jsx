import { BranchCard } from "./BranchCard";
import { regionColor } from "../hooks/useBranches";
import { Store, Hourglass } from "lucide-react";

export function BranchList({
  loading,
  regions,
  filtered,
  branches,
  onEdit,
  onDelete,
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
        <Hourglass className="w-5 h-5" />
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Store className="w-10 h-10 mx-auto mb-3" />
        <p className="body-strong">ไม่พบสาขา</p>
        <p className="body-text mt-1">ลองเปลี่ยนตัวกรอง หรือเพิ่มสาขาใหม่</p>
      </div>
    );
  }

  const sameId = (left, right) => String(left ?? '') === String(right ?? '');

  return regions.map((region) => {
    const regionBranches = filtered.filter(
      (branch) => sameId(branch.region_id, region.id),
    );
    if (!regionBranches.length) return null;

    return (
      <div key={region.id} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`caption-bold px-2.5 py-1 rounded-full ${regionColor[region.id] || regionColor.default}`}
          >
            {region.name}
          </span>
          <span className="caption text-slate-400">
            {regionBranches.length} สาขา
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {regionBranches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              regionName={region.name}
              onEdit={onEdit}
              onDelete={(id) =>
                onDelete(branches.find((item) => item.id === id))
              }
            />
          ))}
        </div>
      </div>
    );
  });
}
