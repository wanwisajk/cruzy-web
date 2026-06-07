export function ScheduleAvatar({ employee, size = "sm" }) {
  const dimensions =
    size === "sm"
      ? "w-[18px] h-[18px] text-[9px]"
      : size === "md"
        ? "w-[28px] h-[28px] text-xs"
        : "w-9 h-9 text-sm";
  const initial = employee?.nickname?.[0] || employee?.name?.[0] || "?";

  return (
    <div
      className={`${dimensions} flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white`}
      style={{ background: employee?.color || "#4CAF50" }}
    >
      {initial}
    </div>
  );
}
