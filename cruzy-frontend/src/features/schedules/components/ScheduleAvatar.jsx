export function ScheduleAvatar({ employee, size = "sm" }) {
  const dimensions =
    size === "sm"
      ? "w-[18px] h-[18px] caption"
      : size === "md"
        ? "w-[28px] h-[28px] caption"
        : "w-9 h-9 body-text";
  const initial = employee?.nickname?.[0] || employee?.name?.[0] || "?";

  return (
    <div
      className={`${dimensions} flex flex-shrink-0 items-center justify-center rounded-full body-strong text-white`}
      style={{ background: employee?.color || "#4CAF50" }}
    >
      {initial}
    </div>
  );
}
