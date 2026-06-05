import { Loader2, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/Modal';
import { useAccess } from '../features/access/hooks/useAccess.js';
import { accessMutations } from '../features/access/services/accessService.js';
import { Content, Table } from '../components/ui/Layout';

export default function AccessDashboard({ user, fallbackData }) {
  const { accessData, loading, error, refreshAccessData } = useAccess();
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState({
    username: '',
    name: '',
    role: 'branch',
    scopeType: 'branch',
    scopeValue: '',
    password: ''
  });

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

  if (!(user.role === 'owner' || user.scope === 'all')) {
    return <Content title="ไม่มีสิทธิ์" icon={Shield} stats={[]}><div className="card p-10 text-center text-danger">บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้</div></Content>;
  }

  const canManage = user.role === 'owner' || user.scope === 'all';
  const tableHeaders = canManage ? ['Username', 'ชื่อ', 'สิทธิ์', 'ขอบเขต', ''] : ['Username', 'ชื่อ', 'สิทธิ์', 'ขอบเขต'];

  const scopeLabel = (item) => {
    if (item.scope === 'all') return 'ทั้งหมด';
    if (item.scopeType === 'region') return regions.find((region) => region.id === item.scope)?.name || item.scope || '-';
    if (item.scopeType === 'branch') return branches.find((branch) => branch.id === item.scope || branch.id === item.scope_value)?.name || item.scope || '-';
    return item.scope || item.scope_value || '-';
  };

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setForm({ username: '', name: '', role: 'branch', scopeType: 'branch', scopeValue: '', password: '' });
    setShowUserModal(true);
  };

  const openEditModal = (item) => {
    setModalMode('edit');
    setSelectedUser(item);
    setForm({
      username: item.username,
      name: item.name || '',
      role: item.role || 'branch',
      scopeType: item.scope === 'all' ? 'all' : (item.scopeType || 'branch'),
      scopeValue: item.scope === 'all' ? '' : (item.scope || item.scope_value || ''),
      password: ''
    });
    setShowUserModal(true);
  };

const saveUser = async () => {
  try {
    setSaving(true);

    const scopeType =
      form.role === 'owner'
        ? 'all'
        : form.role === 'area'
        ? 'region'
        : 'branch';

    if (scopeType !== 'all' && !form.scopeValue) {
      alert(
        scopeType === 'region'
          ? 'กรุณาเลือกจังหวัด'
          : 'กรุณาเลือกสาขา'
      );
      return;
    }

    if (modalMode === 'create') {
      await accessMutations.createUser({
        username: form.username,
        name: form.name,
        role: form.role,
        scope_type: scopeType,
        scope_value: scopeType === 'all' ? null : form.scopeValue,
        password: form.password
      });
    } else if (selectedUser) {
      const body = {
        name: form.name,
        role: form.role,
        scope_type: scopeType,
        scope_value: scopeType === 'all' ? null : form.scopeValue
      };

      if (form.password) {
        body.password = form.password;
      }

      await accessMutations.updateUser(selectedUser.id, body);
    }

    await refreshAccessData();
    setShowUserModal(false);
  } catch (err) {
    alert(err.message || err);
  } finally {
    setSaving(false);
  }
};
  return (
    <Content title="สิทธิ์" icon={Shield} stats={[['ผู้ใช้งาน', users.length], ['กลุ่ม Line', lineGroups.length], ['สาขา', branches.length]]}>
      <div className="flex items-center justify-between mb-4">
        {error ? <div className="alert-bar warn">{error}</div> : <div />}
        {canManage ? (
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            + เพิ่มผู้ใช้งาน
          </button>
        ) : null}
      </div>
      <Modal
        title={showUserModal ? (modalMode === 'create' ? 'เพิ่มผู้ใช้งานใหม่' : 'แก้ไขผู้ใช้งาน') : ''}
        onClose={() => setShowUserModal(false)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setShowUserModal(false)}>
              ยกเลิก
            </button>
            <button type="button" className="btn btn-primary" onClick={saveUser} disabled={saving}>
              {saving ? 'กำลังบันทึก...' : modalMode === 'create' ? 'สร้างผู้ใช้งาน' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-2 text-sm">
            <label className="space-y-2">
              <span>Username</span>
              <input
                className="input"
                type="text"
                value={form.username}
                onChange={(event) => setField('username', event.target.value)}
                disabled={modalMode === 'edit'}
                placeholder="ใส่ชื่อผู้ใช้งาน"
              />
            </label>
            <label className="space-y-2">
              <span>ชื่อ</span>
              <input
                className="input"
                type="text"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="เช่น สมชาย ใจดี"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span>สิทธิ์</span>
<select
  className="input"
  value={form.role}
 onChange={(event) => {
  const role = event.target.value;

  setForm(prev => ({
    ...prev,
    role,
    scopeType:
      role === 'owner'
        ? 'all'
        : role === 'area'
        ? 'region'
        : 'branch',
    scopeValue: ''
  }));
}}
>            <option value="branch">Branch Manager</option>
<option value="area">Area Manager</option>
<option value="owner">Owner</option>
              </select>
            </label>

          
          </div>
{form.role !== 'owner' && (
  <label className="space-y-2 text-sm">
    <span>
      {form.role === 'branch'
        ? 'เลือกสาขา'
        : 'เลือกจังหวัด'}
    </span>

    <select
      className="input"
      value={form.scopeValue}
      onChange={(event) =>
        setField('scopeValue', event.target.value)
      }
    >
      <option value="">- เลือก -</option>

      {(form.role === 'branch'
        ? branches
        : regions
      ).map((item) => (
        <option key={item.id} value={item.id}>
          {form.role === 'branch'
            ? `${item.code || ''} ${item.name}`
            : item.name}
        </option>
      ))}
    </select>
  </label>
)}

          <label className="space-y-2 text-sm">
            <span>{modalMode === 'create' ? 'รหัสผ่าน' : 'รหัสผ่านใหม่ (ถ้ามี)'}</span>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(event) => setField('password', event.target.value)}
              placeholder={modalMode === 'create' ? 'ตั้งค่ารหัสผ่าน' : 'ปล่อยว่างหากไม่เปลี่ยน'}
            />
            <p className="text-xs text-slate-500">{modalMode === 'create' ? 'ตั้งรหัสผ่านเริ่มต้นสำหรับผู้ใช้งานใหม่' : 'กรอกเฉพาะถ้าต้องการเปลี่ยนรหัสผ่าน'}</p>
          </label>
        </div>
      </Modal>
      {loading ? (
        <div className="card p-6 text-center">
          <Loader2 className="mx-auto mb-4 animate-spin" size={28} />
          กำลังโหลดข้อมูลสิทธิ์...
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card overflow-hidden">
            <Table headers={tableHeaders}>
              {users.map((item) => (
                <tr key={item.username}>
                  <td className="px-3 py-2 font-bold">{item.username}</td>
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2"><Badge tone={item.role === 'owner' ? 'green' : 'blue'}>{item.role}</Badge></td>
                  <td className="px-3 py-2">{scopeLabel(item)}</td>
                  {canManage ? (
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="mr-2 text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100"
                      >แก้ไข</button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            if (!window.confirm('ลบผู้ใช้นี้จริงหรือไม่?')) return;
                            await accessMutations.deleteUser(item.id);
                            await refreshAccessData();
                          } catch (err) {
                            alert(err.message || err);
                          }
                        }}
                        className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 border border-red-100"
                      >ลบ</button>
                    </td>
                  ) : null}
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
