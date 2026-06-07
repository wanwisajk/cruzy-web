import { Loader2 } from "lucide-react";

export function LeaveLoadingState() {
  return (
    <div className="card p-6 text-center">
      <Loader2 className="mx-auto mb-4 animate-spin" size={28} />
      กำลังโหลดข้อมูลการลา...
    </div>
  );
}
