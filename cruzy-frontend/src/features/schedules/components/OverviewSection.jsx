import { Avatar } from "../../../components/Avatar";
import { AlertTriangle, Users } from "lucide-react";
import { requiredStaffFor } from "../../../lib/schedule";
import { thaiShortDate } from "../../../lib/date";

export default function OverviewSection({ data, branches, date, onAssign }) {
  const totalWorking = branches.reduce(
    (sum, branch) => sum + (data.schedule[`${branch.id}_${date}`] || []).length,
    0,
  );
  const emptyCount = branches.filter(
    (branch) => !(data.schedule[`${branch.id}_${date}`] || []).length,
  ).length;

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat
          icon={Users}
          value={totalWorking}
          label="เข้างานวันนี้"
          tone="border-cruzy text-cruzy"
        />
        <Stat
          icon={AlertTriangle}
          value={emptyCount}
          label="สาขาว่าง"
          tone={
            emptyCount ? "border-danger text-danger" : "border-cruzy text-cruzy"
          }
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((branch) => {
          const ids = data.schedule[`${branch.id}_${date}`] || [];
          const need = requiredStaffFor(data, branch.id, date);
          return (
            <div key={branch.id} className="card overflow-hidden">
              <div
                className={`flex items-center justify-between px-4 py-2 text-xs font-bold text-white ${ids.length ? "bg-cruzy" : "bg-danger"}`}
              >
                <span>{branch.code}</span>
                <span>
                  {ids.length}/{need} คน
                </span>
              </div>
              <div className="p-3">
                {ids.length ? (
                  ids.map((id) => {
                    const employee = data.employees.find(
                      (item) => item.id === id,
                    );
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2 border-b border-slate-100 py-1.5 text-xs last:border-0"
                      >
                        <Avatar employee={employee} />
                        {employee?.nickname || employee?.name}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-sm font-semibold text-danger">
                    ว่าง{" "}
                    <button
                      className="btn ml-2 bg-cruzy-50 text-cruzy hover:bg-emerald-600 hover:text-white"
                      onClick={() => onAssign({ branchId: branch.id, date })}
                    >
                      จัดคน
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label, tone }) {
  return (
    <div className={`stat ${tone.split(" ")[0]}`}>
      <Icon className={`mx-auto mb-1 ${tone.split(" ")[1]}`} size={18} />
      <div className={`text-xl font-bold leading-none ${tone.split(" ")[1]}`}>
        {value}
      </div>
      <div className="mt-1 text-[11px] text-slate-500">{label}</div>
    </div>
  );
}