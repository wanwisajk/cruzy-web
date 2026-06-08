export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    warning: 'btn-warning',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
    icon: 'icon-btn',
    text: 'bg-transparent text-slate-700 hover:text-cruzy'
  };
  const sizes = {
    sm: 'btn-sm',
    md: 'btn-lg',
    lg: 'btn-lg px-5'
  };
  const classes = ['btn', variants[variant] || variants.primary, sizes[size] || sizes.md, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
