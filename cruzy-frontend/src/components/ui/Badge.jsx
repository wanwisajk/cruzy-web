const toneClasses = {
  default: 'bg-slate-100 text-slate-700',
  green: 'bg-[#E8F5E9] text-[#1B5E20]',
  red: 'bg-[#FFEBEE] text-[#C62828]',
  orange: 'bg-[#FFF3E0] text-[#E65100]',
  blue: 'bg-[#E3F2FD] text-[#1565C0]',
  purple: 'bg-[#F3E5F5] text-[#6A1B9A]',
  teal: 'bg-[#E0F2F1] text-[#00695C]'
};

export function Badge({ tone = 'default', className = '', children }) {
  return (
    <span className={`badge ${toneClasses[tone] || toneClasses.default} ${className}`.trim()}>
      {children}
    </span>
  );
}
