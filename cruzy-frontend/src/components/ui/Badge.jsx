const toneClasses = {
  default: 'bg-slate-100 text-slate-700',
  green: 'badge approved',
  red: 'badge rejected',
  orange: 'badge pending',
  blue: 'badge info',
  purple: 'bg-violet-100 text-violet-700',
  teal: 'badge success'
};

export function Badge({ tone = 'default', className = '', children }) {
  return (
    <span className={`badge ${toneClasses[tone] || toneClasses.default} ${className}`.trim()}>
      {children}
    </span>
  );
}
