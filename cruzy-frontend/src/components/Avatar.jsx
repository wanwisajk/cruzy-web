export function Avatar({ employee, size = 'md' }) {
  const dimensions = size === 'sm' ? 'h-4 w-4 caption' : 'h-6 w-6 caption';
  const initial = employee?.nickname?.[0] || employee?.name?.[0] || '?';
  return (
    <span className={`${dimensions} inline-flex shrink-0 items-center justify-center rounded-full body-strong text-white`} style={{ background: employee?.color || '#4CAF50' }}>
      {initial}
    </span>
  );
}
