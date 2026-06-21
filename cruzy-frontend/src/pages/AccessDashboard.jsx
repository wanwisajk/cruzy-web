import { Loader2, Shield, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/Modal";
import { useAccess } from "../features/access/hooks/useAccess.js";
import { accessMutations } from "../features/access/services/accessService.js";
import { Content, Table } from "../components/ui/Layout";

export default function AccessDashboard({ user, fallbackData }) {
  const isOwner = user?.role === "owner";
  const { accessData, loading, error, refreshAccessData } = useAccess(fallbackData, { enabled: isOwner });
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    userId: "",
    username: "",
    name: "",
    role: "branch",
    scopeType: "branch",
    scopeValue: "",
    employeeId: "",
    password: "",
  });

  const users = accessData.users.length
    ? accessData.users
    : fallbackData?.users || [];
  const branches = accessData.branches.length
    ? accessData.branches
    : fallbackData?.branches || [];
  const regions = accessData.regions.length
    ? accessData.regions
    : Object.entries(fallbackData?.regions || {}).map(([id, region]) => ({
        id,
        name: region.name,
        branches: region.branches || [],
      }));
  const employees = accessData.employees.length
    ? accessData.employees
    : fallbackData?.employees || [];
  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [String(employee.id), employee])),
    [employees],
  );
  const linkedUserByEmployee = useMemo(() => {
    const map = new Map();
    users.forEach((item) => {
      const employeeId = item.employeeId || item.employee_id;
      if (employeeId) map.set(String(employeeId), item.id || item.username);
    });
    return map;
  }, [users]);
  if (!isOwner) {
    return (
      <Content title="ไม่มีสิทธิ์" icon={Shield} stats={[]}>
        <div className="card p-10 text-center text-danger">
          บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้
        </div>
      </Content>
    );
  }

  const canManage = isOwner;
  const tableHeaders = canManage
    ? ["User ID", "Username", "ชื่อ", "พนักงาน", "สิทธิ์", "ขอบเขต", ""]
    : ["User ID", "Username", "ชื่อ", "พนักงาน", "สิทธิ์", "ขอบเขต"];

  const employeeDisplayName = (employee) => {
    if (!employee) return "-";
    return employee.nickname || employee.name || employee.id;
  };

  const scopeLabel = (item) => {
    if (item.scope === "all") return "ทั้งหมด";
    if (item.scopeType === "region")
      return (
        regions.find((region) => region.id === item.scope)?.name ||
        item.scope ||
        "-"
      );
    if (item.scopeType === "branch")
      return (
        branches.find(
          (branch) =>
            branch.id === item.scope || branch.id === item.scope_value,
        )?.name ||
        item.scope ||
        "-"
      );
    return item.scope || item.scope_value || "-";
  };

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedUser(null);
    setForm({
      userId: "",
      username: "",
      name: "",
      role: "branch",
      scopeType: "branch",
      scopeValue: "",
      employeeId: "",
      password: "",
    });
    setShowUserModal(true);
  };

  const openEditModal = (item) => {
    setModalMode("edit");
    setSelectedUser(item);
    setForm({
      userId: item.id || "",
      username: item.username,
      name: item.name || "",
      role: item.role || "branch",
      scopeType: item.scope === "all" ? "all" : item.scopeType || "branch",
      scopeValue:
        item.scope === "all" ? "" : item.scope || item.scope_value || "",
      employeeId: item.employeeId || item.employee_id || "",
      password: "",
    });
    setShowUserModal(true);
  };

  const saveUser = async () => {
    try {
      setSaving(true);

      const scopeType =
        form.role === "owner"
          ? "all"
          : form.role === "area"
            ? "region"
            : "branch";

      if (scopeType !== "all" && !form.scopeValue) {
        alert(scopeType === "region" ? "กรุณาเลือกจังหวัด" : "กรุณาเลือกสาขา");
        return;
      }

      if (modalMode === "create") {
        if (!String(form.userId || "").trim() || String(form.userId || "").trim().length > 255) {
          alert("กรุณากรอก User ID และต้องยาวไม่เกิน 255 ตัวอักษร");
          return;
        }

        await accessMutations.createUser({
          id: String(form.userId).trim(),
          username: form.username,
          name: form.name,
          role: form.role,
          scope_type: scopeType,
          scope_value: scopeType === "all" ? null : form.scopeValue,
          employee_id: form.employeeId || null,
          password: form.password,
        });
      } else if (selectedUser) {
        const body = {
          name: form.name,
          role: form.role,
          scope_type: scopeType,
          scope_value: scopeType === "all" ? null : form.scopeValue,
          employee_id: form.employeeId || null,
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

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await accessMutations.deleteUser(deleteTarget.id ?? deleteTarget.username);
      await refreshAccessData();
      setDeleteTarget(null);
    } catch (err) {
      alert(err.message || err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="app-page page-body flex h-full w-full flex-col rounded-lg">
      <Content
        title="สิทธิ์"
        icon={Shield}
        stats={[]}
        action={
          canManage ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateModal}
            >
              + เพิ่มผู้ใช้งาน
            </button>
          ) : null
        }
      >
        {/* Stats */}
        {/* <div className="flex gap-4 mb-4">
        <div className="card px-4 py-3 text-center min-w-[90px]">
          <div className="heading-2 text-cruzy">{users.length}</div>
          <div className="caption text-slate-500">ผู้ใช้งาน</div>
        </div>
        <div className="card px-4 py-3 text-center min-w-[90px]">
          <div className="heading-2 text-cruzy">
            {lineGroups.length}
          </div>
          <div className="caption text-slate-500">กลุ่ม Line</div>
        </div>
        <div className="card px-4 py-3 text-center min-w-[90px]">
          <div className="heading-2 text-cruzy">{branches.length}</div>
          <div className="caption text-slate-500">สาขา</div>
        </div>
      </div> */}

        {error ? <div className="alert-bar warn mb-4">{error}</div> : null}

        <Modal
          title={
            showUserModal
              ? modalMode === "create"
                ? "เพิ่มผู้ใช้งานใหม่"
                : "แก้ไขผู้ใช้งาน"
              : ""
          }
          onClose={() => setShowUserModal(false)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowUserModal(false)}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={saveUser}
                disabled={saving}
              >
                {saving
                  ? "กำลังบันทึก..."
                  : modalMode === "create"
                    ? "สร้างผู้ใช้งาน"
                    : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </>
          }
        >
          <div className="grid gap-4">
            <div className="grid gap-2 body-text">
              <label className="space-y-2">
                <span>User ID</span>
                <input
                  className="input"
                  type="text"
                  value={form.userId}
                  onChange={(event) => setField("userId", event.target.value)}
                  disabled={modalMode === "edit"}
                  maxLength={255}
                  placeholder="เช่น U001"
                />
              </label>
              <label className="space-y-2">
                <span>Username</span>
                <input
                  className="input"
                  type="text"
                  value={form.username}
                  onChange={(event) => setField("username", event.target.value)}
                  disabled={modalMode === "edit"}
                  placeholder="ใส่ชื่อผู้ใช้งาน"
                />
              </label>
              <label className="space-y-2">
                <span>ชื่อ</span>
                <input
                  className="input"
                  type="text"
                  value={form.name}
                  onChange={(event) => setField("name", event.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                />
              </label>
              <label className="space-y-2">
                <span>เชื่อมพนักงาน</span>
                <select
                  className="input"
                  value={form.employeeId}
                  onChange={(event) => setField("employeeId", event.target.value)}
                >
                  <option value="">ไม่เชื่อมพนักงาน</option>
                  {employees.map((employee) => {
                    const linkedUserId = linkedUserByEmployee.get(String(employee.id));
                    const disabled = Boolean(linkedUserId && String(linkedUserId) !== String(selectedUser?.id || ""));
                    return (
                      <option key={employee.id} value={employee.id} disabled={disabled}>
                        {employeeDisplayName(employee)} ({employee.id}){disabled ? " - ถูกใช้งานแล้ว" : ""}
                      </option>
                    );
                  })}
                </select>
                <p className="caption text-slate-500">
                  ถ้าผู้ใช้งานนี้เป็นพนักงาน ระบบจะแสดงชื่อเล่นจากข้อมูลพนักงาน
                </p>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 body-text">
                <span>สิทธิ์</span>
                <select
                  className="input"
                  value={form.role}
                  onChange={(event) => {
                    const role = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      role,
                      scopeType:
                        role === "owner"
                          ? "all"
                          : role === "area"
                            ? "region"
                            : "branch",
                      scopeValue: "",
                    }));
                  }}
                >
                  <option value="branch">Branch Manager</option>
                  <option value="area">Area Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </label>
            </div>

            {form.role !== "owner" && (
              <label className="space-y-2 body-text">
                <span>
                  {form.role === "branch" ? "เลือกสาขา" : "เลือกจังหวัด"}
                </span>
                <select
                  className="input"
                  value={form.scopeValue}
                  onChange={(event) =>
                    setField("scopeValue", event.target.value)
                  }
                >
                  <option value="">- เลือก -</option>
                  {(form.role === "branch" ? branches : regions).map((item) => (
                    <option key={item.id} value={item.id}>
                      {form.role === "branch"
                        ? `${item.code || ""} ${item.name}`
                        : item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="space-y-2 body-text">
              <span>
                {modalMode === "create" ? "รหัสผ่าน" : "รหัสผ่านใหม่ (ถ้ามี)"}
              </span>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(event) => setField("password", event.target.value)}
                placeholder={
                  modalMode === "create"
                    ? "ตั้งค่ารหัสผ่าน"
                    : "ปล่อยว่างหากไม่เปลี่ยน"
                }
              />
              <p className="caption text-slate-500">
                {modalMode === "create"
                  ? "ตั้งรหัสผ่านเริ่มต้นสำหรับผู้ใช้งานใหม่"
                  : "กรอกเฉพาะถ้าต้องการเปลี่ยนรหัสผ่าน"}
              </p>
            </label>
          </div>
        </Modal>

        <Modal
          title={deleteTarget ? "ยืนยันการลบผู้ใช้งาน" : ""}
          onClose={closeDeleteModal}
          footer={
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDeleteUser}
                disabled={deleting}
              >
                {deleting ? "กำลังลบ..." : "ลบผู้ใช้งาน"}
              </button>
            </>
          }
        >
          {deleteTarget ? (
            <div className="grid gap-4">
              <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-red-100 text-red-600">
                  <Trash2 size={20} />
                </span>
                <div className="min-w-0">
                  <div className="body-strong text-red-700">
                    ต้องการลบผู้ใช้งานนี้ใช่ไหม?
                  </div>
                  <div className="mt-1 body-text text-slate-600">
                    ระบบจะลบสิทธิ์ของผู้ใช้งานออก และเก็บประวัติรายการเดิมไว้โดยไม่ผูกกับผู้ใช้นี้
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="caption text-slate-500">ผู้ใช้งานที่จะลบ</div>
                <div className="mt-1 body-strong text-slate-900">
                  {deleteTarget.name || "-"}
                </div>
                <div className="caption text-slate-500">
                  @{deleteTarget.username || deleteTarget.id}
                </div>
              </div>
            </div>
          ) : null}
        </Modal>

        {loading ? (
          <div className="card p-6 text-center">
            <Loader2 className="mx-auto mb-4 animate-spin" size={28} />
            กำลังโหลดข้อมูลสิทธิ์...
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="table-shell overflow-hidden">
              <Table headers={tableHeaders}>
                {users.map((item) => {
                  const linkedEmployee = employeeMap.get(String(item.employeeId || item.employee_id || ""));
                  return (
                    <tr key={item.id || item.username}>
                      <td className="px-3 py-2 font-mono caption">{item.id}</td>
                      <td className="px-3 py-2 body-strong">{item.username}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <span className="body-strong">{linkedEmployee ? employeeDisplayName(linkedEmployee) : item.name}</span>
                          {linkedEmployee ? <span className="caption text-slate-500">{item.name}</span> : null}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {linkedEmployee ? (
                          <div className="flex flex-col gap-1">
                            <span>{employeeDisplayName(linkedEmployee)}</span>
                            <span className="caption text-slate-500">{linkedEmployee.name || linkedEmployee.id}</span>
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={item.role === "owner" ? "green" : "blue"}>
                          {item.role}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{scopeLabel(item)}</td>
                      {canManage ? (
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="btn btn-success btn-sm"
                            >
                              แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="btn btn-danger btn-sm"
                            >
                              ลบ
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </Table>
            </div>

            {/* การ์ดสาขา สูงสุด 4 ต่อแถว
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {lineGroups.map((group) => (
                <div key={group.name} className="card p-4">
                  <div className="body-strong text-cruzy">
                    {group.name}
                  </div>
                  <div className="mt-2 caption text-slate-500">
                    {group.branches.length} สาขา · {group.members.length} สมาชิก
                  </div>
                </div>
              ))}
            </div> */}
          </div>
        )}
      </Content>
    </div>
  );
}
