export function Avatar({ employee, size = 'md' }) {
  const dimensions = size === 'sm' ? 'h-4 w-4 text-[7px]' : 'h-6 w-6 text-[10px]';
  const initial = employee?.nickname?.[0] || employee?.name?.[0] || '?';
  return (
    <span className={`${dimensions} inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white`} style={{ background: employee?.color || '#4CAF50' }}>
      {initial}
    </span>
  );
}
