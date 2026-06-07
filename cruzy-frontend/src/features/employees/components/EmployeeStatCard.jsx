const ACCENT_CLASS = {
  green: "border-l-emerald-500",
  teal: "border-l-teal-500",
  amber: "border-l-amber-500",
  blue: "border-l-blue-500",
};

export function EmployeeStatCard({ label, value, accent = "green" }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 border-l-4 ${ACCENT_CLASS[accent] || ACCENT_CLASS.green} px-4 py-3 shadow-sm`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-800 leading-none">{value}</p>
    </div>
  );
}
