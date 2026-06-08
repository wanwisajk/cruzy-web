export function ScheduleStatCard({ label, value, accent }) {
  const border =
    {
      green: "border-l-emerald-500",
      red: "border-l-red-400",
      amber: "border-l-amber-500",
      blue: "border-l-blue-500",
    }[accent] || "border-l-emerald-500";

  return (
    <div className={`rounded-xl border border-gray-100 border-l-4 bg-white px-4 py-3 shadow-sm ${border}`}>
      <p className="mb-1 caption text-gray-400">{label}</p>
      <p className="heading-2 leading-none text-gray-800">{value}</p>
    </div>
  );
}
