import { Loader2, Shield } from 'lucide-react';
import { useMemo } from 'react';
import { Badge } from '../components/ui/Badge';
import { useAccess } from '../features/access/hooks/useAccess.js';
import { Content, Table } from '../components/ui/Layout';

export default function AccessDashboard({ user, fallbackData }) {
  const { accessData, loading, error } = useAccess();
  const users = accessData.users.length ? accessData.users : fallbackData?.users || [];
  const branches = accessData.branches.length ? accessData.branches : fallbackData?.branches || [];
  const regions = accessData.regions.length ? accessData.regions : Object.entries(fallbackData?.regions || {}).map(([id, region]) => ({ id, name: region.name, branches: region.branches || [] }));
  const employees = accessData.employees.some((employee) => employee.branch || employee.branch_id) ? accessData.employees : fallbackData?.employees || [];

  const lineGroups = useMemo(() => {
    return regions.map((region) => {
      const regionId = region.id;
      const branchIds = region.branches || branches.filter((branch) => branch.region_id === regionId || branch.region === regionId).map((branch) => branch.id);
      return {
        name: `Cruzy ${region.name}`,
        branches: branchIds,
        members: employees.filter((employee) => branchIds.includes(employee.branch || employee.branch_id)).map((employee) => employee.id)
      };
    });
  }, [branches, employees, regions]);

  if (user.role !== 'owner') {
    return <Content title="ไม่มีสิทธิ์" icon={Shield} stats={[]}><div className="card p-10 text-center text-danger">บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้</div></Content>;
  }

  return (
    <Content title="สิทธิ์" icon={Shield} stats={[['ผู้ใช้งาน', users.length], ['กลุ่ม Line', lineGroups.length], ['สาขา', branches.length]]}>
      {error ? <div className="alert-bar warn mb-4">{error}</div> : null}
      {loading ? (
        <div className="card p-6 text-center">
          <Loader2 className="mx-auto mb-4 animate-spin" size={28} />
          กำลังโหลดข้อมูลสิทธิ์...
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card overflow-hidden">
            <Table headers={['Username', 'ชื่อ', 'สิทธิ์', 'ขอบเขต']}>
              {users.map((item) => (
                <tr key={item.username}>
                  <td className="px-3 py-2 font-bold">{item.username}</td>
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2"><Badge tone={item.role === 'owner' ? 'green' : 'blue'}>{item.role}</Badge></td>
                  <td className="px-3 py-2">{item.scope || item.scope_value || item.scopeType || '-'}</td>
                </tr>
              ))}
            </Table>
          </div>
          <div className="grid gap-3">
            {lineGroups.map((group) => (
              <div key={group.name} className="card p-4">
                <div className="text-sm font-bold text-cruzy">{group.name}</div>
                <div className="mt-2 text-xs text-slate-500">{group.branches.length} สาขา · {group.members.length} สมาชิก</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Content>
  );
}
