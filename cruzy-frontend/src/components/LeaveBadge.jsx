export function Badge({ status, children }) {
  const tone = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';
  return <span className={`badge ${tone}`}>{children || status}</span>;
}
