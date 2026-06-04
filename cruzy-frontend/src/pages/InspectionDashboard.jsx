import { useEffect, useMemo, useState } from 'react';
import { Image, ListChecks, RefreshCcw, Search, X } from 'lucide-react';
import { thaiLongDate, thaiShortDate } from '../lib/date';
import { inspectionService } from '../services/inspectionService.js';

function formatBadge(status) {
  if (status === 'pass') return 'bg-emerald-50 text-emerald-700';
  if (status === 'issues') return 'bg-orange-50 text-orange-700';
  if (status === 'pending') return 'bg-slate-100 text-slate-700';
  return 'bg-slate-100 text-slate-700';
}

function formatLateLabel(isLate) {
  if (isLate) return { label: 'เปิดสาย', tone: 'bg-orange-50 text-orange-700' };
  return { label: 'ตรงเวลา', tone: 'bg-emerald-50 text-emerald-700' };
}

function formatInspectionItem(item) {
  if (typeof item === 'string') {
    return { label: item, passed: true };
  }
  if (item === null || item === undefined) {
    return { label: '-', passed: false };
  }
  if (typeof item === 'object') {
    const label = item.label || item.name || item.title || Object.keys(item)[0] || '';
    const passed = item.status === 'pass' || item.passed === true || item.ok === true || item.value === 'pass';
    const detail = item.value !== undefined && item.value !== true && item.value !== false ? item.value : item.note || item.description;
    return { label, passed, detail };
  }
  return { label: String(item), passed: false };
}

function rangeDays(from, to) {
  const dates = [];
  const current = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function SearchInput({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm sm:max-w-md">
      <Search size={16} className="text-slate-400" />
      <input
        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        placeholder="ค้นหาชื่อสาขา ชื่อพนักงาน หรือวันที่"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Pill({ children, className = '' }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>{children}</span>;
}

function LoaderCard() {
  return (
    <div className="animate-pulse rounded-3xl bg-slate-200 p-5 shadow-sm">
      <div className="h-4 w-3/4 rounded-full bg-slate-300" />
      <div className="mt-4 space-y-3">
        <div className="h-3 rounded-full bg-slate-300" />
        <div className="h-3 rounded-full bg-slate-300" />
        <div className="h-3 rounded-full bg-slate-300 w-5/6" />
      </div>
    </div>
  );
}

export default function InspectionDashboard({ user, from, to }) {
  const [activeTab, setActiveTab] = useState('opening');
  const [branchFilter, setBranchFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [settings, setSettings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detailInspection, setDetailInspection] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [settingsEdit, setSettingsEdit] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadAllData();
  }, [from, to]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast]);

  async function loadAllData() {
    setLoading(true);
    setError('');
    try {
      const data = await inspectionService.fetchConsoleData();
      setBranches(data.branches || []);
      setEmployees(data.employees || []);
      setInspections((data.storeInspections || []).filter((item) => {
        if (from && item.work_date < from) return false;
        if (to && item.work_date > to) return false;
        return true;
      }).sort((a, b) => {
        if (a.work_date > b.work_date) return -1;
        if (a.work_date < b.work_date) return 1;
        return b.id - a.id;
      }));
      setSettings(data.inspectionSettings || []);
      setLogs(data.inspectionLogs || []);
    } catch (err) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }

  async function loadInspectionDetail(id) {
    setDetailLoading(true);
    setDetailInspection(null);
    setError('');
    try {
      const [inspection, attachments] = await Promise.all([
        inspectionService.getInspection(id),
        inspectionService.getAttachments(),
      ]);
      setDetailInspection({
        ...inspection,
        attachments: Array.isArray(attachments)
          ? attachments.filter((attachment) => attachment.entity_type === 'inspection' && attachment.entity_id === id)
          : [],
      });
    } catch (err) {
      setError(err.message || 'ไม่สามารถโหลดรายละเอียดได้');
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveReview(id, status) {
    setSavingReview(true);
    setError('');
    try {
      const now = new Date().toISOString();
      const userName = user?.name || user?.username || 'dashboard';
      const result = await inspectionService.updateInspection(id, {
        status,
        reviewed_by: userName,
        review_time: now,
      });
      const updated = result?.data || result;
      await inspectionService.createInspectionLog({
        inspection_id: id,
        user_name: userName,
        action: status === 'pass' ? 'approve' : 'reject',
        description: status === 'pass' ? 'อนุมัติการตรวจร้าน' : 'บันทึกปัญหาการตรวจร้าน',
        source: 'dashboard',
      });
      setInspections((prev) => prev.map((item) => (item.id === id ? { ...item, ...updated } : item)));
      setLogs(await inspectionService.getInspectionLogs());
      setToast(status === 'pass' ? '✅ อนุมัติแล้ว' : '⚠️ บันทึกเป็นมีปัญหาแล้ว');
      setDetailOpen(false);
    } catch (err) {
      setError(err.message || 'ไม่สามารถบันทึกสถานะได้');
    } finally {
      setSavingReview(false);
    }
  }

  async function saveSettings(branchId, values) {
    setSavingSettings(true);
    setError('');
    try {
      const payload = {
        branch_id: branchId,
        cctv_count: Number(values.cctvCount) || 0,
        shelf_count: Number(values.shelfCount) || 0,
        required_photos: values.requiredPhotos,
        checklists: values.checklists,
        required_products: values.requiredProducts,
      };
      const result = await inspectionService.upsertInspectionSetting(payload);
      const updated = result?.data || result;
      setSettings((prev) => {
        const existing = prev.find((item) => item.branch_id === branchId);
        if (existing) {
          return prev.map((item) => (item.branch_id === branchId ? { ...item, ...updated } : item));
        }
        return [...prev, updated];
      });
      setToast('💾 บันทึกการตั้งค่าตรวจเรียบร้อย');
      setSettingsEdit(null);
    } catch (err) {
      setError(err.message || 'ไม่สามารถบันทึกการตั้งค่าได้');
    } finally {
      setSavingSettings(false);
    }
  }

  const branchMap = useMemo(() => Object.fromEntries(branches.map((branch) => [branch.id, branch])), [branches]);
  const employeeMap = useMemo(() => Object.fromEntries(employees.map((employee) => [employee.id, employee])), [employees]);
  const visibleBranches = useMemo(
    () => (branchFilter === 'all' ? branches : branches.filter((branch) => branch.id === branchFilter)),
    [branches, branchFilter]
  );

  const enrichedInspections = useMemo(
    () =>
      inspections.map((item) => ({
        ...item,
        branch: branchMap[item.branch_id] || { code: 'ไม่ระบุ', name: 'ไม่ระบุ' },
        employee: employeeMap[item.submitted_by] || { name: item.submitted_by || '-' },
      })),
    [inspections, branchMap, employeeMap]
  );

  const searchValue = searchTerm.trim().toLowerCase();
  const filteredInspections = useMemo(() => {
    return enrichedInspections.filter((item) => {
      if (branchFilter !== 'all' && item.branch_id !== branchFilter) {
        return false;
      }
      if (!searchValue) return true;
      const branchName = item.branch.name?.toLowerCase() || '';
      const branchCode = item.branch.code?.toLowerCase() || '';
      const employeeName = item.employee.name?.toLowerCase() || '';
      const rowDate = item.work_date || '';
      return branchName.includes(searchValue) || branchCode.includes(searchValue) || employeeName.includes(searchValue) || rowDate.includes(searchValue);
    });
  }, [enrichedInspections, branchFilter, searchValue]);

  const rangeDates = useMemo(() => (from && to ? rangeDays(from, to) : []), [from, to]);
  const expectedCombos = useMemo(
    () => visibleBranches.length * rangeDates.length,
    [visibleBranches.length, rangeDates.length]
  );
  const actualCombos = useMemo(() => {
    const set = new Set();
    enrichedInspections.forEach((item) => {
      if (visibleBranches.some((branch) => branch.id === item.branch_id) && rangeDates.includes(item.work_date)) {
        set.add(`${item.branch_id}|${item.work_date}`);
      }
    });
    return set.size;
  }, [enrichedInspections, visibleBranches, rangeDates]);
  const missingCount = Math.max(0, expectedCombos - actualCombos);

  const summaryCounts = useMemo(() => {
    const trimmed = enrichedInspections.filter((item) => visibleBranches.some((branch) => branch.id === item.branch_id) && rangeDates.includes(item.work_date));
    return {
      opened: trimmed.length,
      late: trimmed.filter((item) => item.is_late).length,
      onTime: trimmed.filter((item) => !item.is_late).length,
      missing: missingCount,
    };
  }, [enrichedInspections, visibleBranches, rangeDates, missingCount]);

  const branchSummary = useMemo(
    () =>
      visibleBranches.map((branch) => {
        const rows = enrichedInspections.filter((item) => item.branch_id === branch.id && rangeDates.includes(item.work_date));
        const pass = rows.filter((item) => item.status === 'pass').length;
        const issues = rows.filter((item) => item.status !== 'pass').length;
        const total = rows.length;
        return {
          branch,
          total,
          pass,
          issues,
          rate: total ? Math.round((pass / total) * 100) : 0,
        };
      }),
    [enrichedInspections, visibleBranches, rangeDates]
  );

  const detailBranch = branchMap[detailInspection?.branch_id] || {};
  const detailEmployee = employeeMap[detailInspection?.submitted_by] || { name: detailInspection?.submitted_by || '-' };

  const currentSettingsMap = useMemo(
    () => Object.fromEntries(settings.map((setting) => [setting.branch_id, setting])),
    [settings]
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-slate-900">
            <span>🔍</span>
            <span>ระบบตรวจร้าน</span>
          </div>
          <div className="mt-1 text-sm text-slate-500">ข้อมูลจากฐานข้อมูลจริง ใช้ช่วงวันที่จาก DateBar</div>
        </div>
        <button
          type="button"
          onClick={loadAllData}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <RefreshCcw size={16} /> รีเฟรชข้อมูล
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">เปิดแล้ว</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{loading ? '–' : summaryCounts.opened}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">ยังไม่เปิด</div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{loading ? '–' : summaryCounts.missing}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">เปิดสาย</div>
          <div className="mt-3 text-3xl font-bold text-orange-600">{loading ? '–' : summaryCounts.late}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-500">เปิดตรงเวลา</div>
          <div className="mt-3 text-3xl font-bold text-emerald-600">{loading ? '–' : summaryCounts.onTime}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2 overflow-x-auto rounded-3xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${branchFilter === 'all' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}
            onClick={() => setBranchFilter('all')}
          >
            ALL
          </button>
          {branches.map((branch) => (
            <button
              key={branch.id}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${branchFilter === branch.id ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}
              onClick={() => setBranchFilter(branch.id)}
            >
              {branch.code}
            </button>
          ))}
        </div>
        <SearchInput value={searchTerm} onChange={setSearchTerm} />
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'opening', label: '🏪 เปิดร้าน' },
            { id: 'summary', label: '📊 ภาพรวมสาขา' },
            { id: 'detail', label: '📋 รายละเอียด' },
            { id: 'config', label: '⚙️ ตั้งค่าตรวจ' },
            { id: 'log', label: '📝 ประวัติ Log' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id ? 'bg-[#1B5E20] text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          <LoaderCard />
          <LoaderCard />
          <LoaderCard />
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'opening' && (
            <div className="space-y-4">
              {summaryCounts.missing ? (
                <div className="rounded-3xl bg-[#FFF4E5] p-4 text-sm text-[#B45309] shadow-sm">📭 มี {summaryCounts.missing} สาขา×วัน ที่ยังไม่มีรายการตรวจร้าน</div>
              ) : null}
              <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-left">วันที่</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">สาขา</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">ผู้ส่ง</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">เวลาเปิด</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">สถานะ</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">เปิดสาย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInspections.length ? (
                      filteredInspections.map((item) => {
                        const lateMeta = formatLateLabel(item.is_late);
                        return (
                          <tr key={item.id} className="border-b last:border-b-0 hover:bg-slate-50">
                            <td className="px-4 py-3">{thaiShortDate(item.work_date)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{item.branch.code}</td>
                            <td className="px-4 py-3">{item.employee.name}</td>
                            <td className="px-4 py-3">{item.submit_time || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${formatBadge(item.status)}`}>{item.status || 'pending'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${lateMeta.tone}`}>{lateMeta.label}</span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-slate-500">ยังไม่มีข้อมูลการตรวจร้าน</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {branchSummary.map((item) => (
                  <div key={item.branch.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{item.branch.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{item.branch.code}</div>
                      </div>
                      <div className="text-right text-sm font-bold text-slate-900">{item.rate}%</div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between"><span>จำนวนการตรวจ</span><span>{item.total}</span></div>
                      <div className="flex items-center justify-between"><span>จำนวนผ่าน</span><span>{item.pass}</span></div>
                      <div className="flex items-center justify-between"><span>จำนวนมีปัญหา</span><span>{item.issues}</span></div>
                    </div>
                    <div className="mt-4 rounded-full bg-slate-100 h-2 overflow-hidden">
                      <div className="h-2 bg-[#1B5E20] transition-all" style={{ width: `${item.rate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {!branchSummary.length ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">ยังไม่มีข้อมูลการตรวจร้าน</div>
              ) : null}
            </div>
          )}

          {activeTab === 'detail' && (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-left">วันที่</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">สาขา</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">ผู้ส่ง</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">เวลาส่ง</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">คะแนน</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">จำนวนรูป</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">สถานะ</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">ผู้ตรวจ</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInspections.length ? (
                      filteredInspections.map((item) => (
                        <tr key={item.id} className="border-b last:border-b-0 hover:bg-slate-50">
                          <td className="px-4 py-3">{thaiShortDate(item.work_date)}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{item.branch.code}</td>
                          <td className="px-4 py-3">{item.employee.name}</td>
                          <td className="px-4 py-3">{item.submit_time || '-'}</td>
                          <td className="px-4 py-3">{item.score ?? '-'}</td>
                          <td className="px-4 py-3">{item.photo_count ?? 0}</td>
                          <td className="px-4 py-3"><span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${formatBadge(item.status)}`}>{item.status || 'pending'}</span></td>
                          <td className="px-4 py-3">{item.reviewed_by || '-'}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailId(item.id);
                                setDetailOpen(true);
                                loadInspectionDetail(item.id);
                              }}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              ดูรายละเอียด
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="px-4 py-8 text-center text-slate-500">ยังไม่มีข้อมูลการตรวจร้าน</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              {visibleBranches.map((branch) => {
                const config = currentSettingsMap[branch.id] || {
                  cctv_count: 0,
                  shelf_count: 0,
                  required_photos: [],
                  checklists: [],
                  required_products: [],
                };
                return (
                  <div key={branch.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{branch.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{branch.code}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingsEdit({ branchId: branch.id, values: { ...config, requiredPhotos: config.required_photos || [], checklists: config.checklists || [], requiredProducts: config.required_products || [] } })}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        แก้ไข
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                        <div className="text-xs text-slate-500">CCTV</div>
                        <div className="mt-2 text-lg font-bold text-slate-900">{config.cctv_count || 0}</div>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                        <div className="text-xs text-slate-500">จำนวนชั้นวาง</div>
                        <div className="mt-2 text-lg font-bold text-slate-900">{config.shelf_count || 0}</div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                        <div className="text-xs text-slate-500">รูปที่ต้องถ่าย</div>
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          {(config.required_photos || []).length ? config.required_photos.map((item, index) => <div key={index}>• {item}</div>) : <div>-</div>}
                        </div>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                        <div className="text-xs text-slate-500">Checklist</div>
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          {(config.checklists || []).length ? config.checklists.map((item, index) => <div key={index}>• {item}</div>) : <div>-</div>}
                        </div>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                        <div className="text-xs text-slate-500">สินค้าที่ต้องเช็ค</div>
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          {(config.required_products || []).length ? config.required_products.map((item, index) => <div key={index}>• {item}</div>) : <div>-</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!visibleBranches.length ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">ยังไม่มีสาขาที่สามารถตั้งค่าการตรวจได้</div>
              ) : null}
            </div>
          )}

          {activeTab === 'log' && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-left">วันเวลา</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">ผู้ใช้งาน</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">Action</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">Description</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length ? (
                      logs.map((log) => (
                        <tr key={log.id} className="border-b last:border-b-0 hover:bg-slate-50">
                          <td className="px-4 py-3">{log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : '-'}</td>
                          <td className="px-4 py-3">{log.user_name || '-'}</td>
                          <td className="px-4 py-3 capitalize">{log.action}</td>
                          <td className="px-4 py-3">{log.description || '-'}</td>
                          <td className="px-4 py-3">{log.source || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500">ยังไม่มีข้อมูลการตรวจร้าน</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {detailOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-20">
          <div className="w-full max-w-3xl rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">รายละเอียดการตรวจร้าน</h2>
                <p className="mt-1 text-sm text-slate-500">ข้อมูลจะดึงจากฐานข้อมูลจริงของ Store Inspection</p>
              </div>
              <button type="button" onClick={() => setDetailOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 space-y-4">
              {detailLoading ? (
                <div className="space-y-3">
                  <div className="h-3 w-1/3 rounded-full bg-slate-200" />
                  <div className="h-8 rounded-2xl bg-slate-200" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="h-24 rounded-3xl bg-slate-200" />
                    <div className="h-24 rounded-3xl bg-slate-200" />
                  </div>
                </div>
              ) : detailInspection ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">สาขา</div>
                      <div className="mt-2 text-base font-semibold text-slate-900">{detailBranch.name || '-'}</div>
                      <div className="mt-1 text-sm text-slate-500">{detailBranch.code || '-'}</div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">วันที่</div>
                      <div className="mt-2 text-base font-semibold text-slate-900">{thaiLongDate(detailInspection.work_date)}</div>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">ผู้ส่ง</div>
                      <div className="mt-2 font-semibold text-slate-900">{detailEmployee.name}</div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">เวลาส่ง</div>
                      <div className="mt-2 font-semibold text-slate-900">{detailInspection.submit_time || '-'}</div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">คะแนน</div>
                      <div className="mt-2 font-semibold text-slate-900">{detailInspection.score ?? '-'}</div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-500">หมายเหตุผู้จัดการ</div>
                    <div className="mt-2 text-sm text-slate-700">{detailInspection.manager_note || '-'}</div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <ListChecks size={16} /> Checklist
                      </div>
                      <div className="space-y-2">
                        {(Array.isArray(detailInspection.inspection_items)
                          ? detailInspection.inspection_items
                          : Object.entries(detailInspection.inspection_items || {}).map(([key, value]) => ({ label: key, value })))
                          .map((rawItem, index) => {
                            const item = formatInspectionItem(rawItem);
                            return (
                              <div key={index} className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-3 py-3">
                                <div>
                                  <div className="font-semibold text-slate-900">{item.label}</div>
                                  {item.detail ? <div className="text-xs text-slate-500">{item.detail}</div> : null}
                                </div>
                                <Pill className={item.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>{item.passed ? 'Pass' : 'Fail'}</Pill>
                              </div>
                            );
                          })}
                        {!detailInspection.inspection_items || (Array.isArray(detailInspection.inspection_items) && !detailInspection.inspection_items.length) ? (
                          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">ไม่มี Checklist</div>
                        ) : null}
                      </div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><Image size={16} /> รูปภาพ</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {detailInspection.attachments?.length ? (
                          detailInspection.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300"
                            >
                              <img src={attachment.file_url} alt="inspection" className="h-36 w-full rounded-2xl object-cover" />
                            </a>
                          ))
                        ) : (
                          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">ไม่มีรูปภาพ</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">เลือกการตรวจร้านเพื่อดูรายละเอียด</div>
              )}
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDetailOpen(false)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                ปิด
              </button>
              <button
                type="button"
                onClick={() => saveReview(detailId, 'issues')}
                disabled={savingReview || detailLoading}
                className="rounded-2xl border border-orange-400 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                มีปัญหา
              </button>
              <button
                type="button"
                onClick={() => saveReview(detailId, 'pass')}
                disabled={savingReview || detailLoading}
                className="rounded-2xl bg-[#1B5E20] px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                อนุมัติ
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {settingsEdit ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-20">
          <div className="w-full max-w-3xl rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">ตั้งค่าตรวจ — {branchMap[settingsEdit.branchId]?.code || 'สาขา'}</div>
                <p className="mt-1 text-sm text-slate-500">แก้ไขการตั้งค่าจากฐานข้อมูลจริง</p>
              </div>
              <button type="button" onClick={() => setSettingsEdit(null)} className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CCTV</label>
                <input
                  type="number"
                  value={settingsEdit.values.cctvCount}
                  onChange={(event) => setSettingsEdit((prev) => ({ ...prev, values: { ...prev.values, cctvCount: event.target.value } }))}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#1B5E20]"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">จำนวนชั้นวาง</label>
                <input
                  type="number"
                  value={settingsEdit.values.shelfCount}
                  onChange={(event) => setSettingsEdit((prev) => ({ ...prev, values: { ...prev.values, shelfCount: event.target.value } }))}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#1B5E20]"
                />
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">รูปที่ต้องถ่าย</label>
                <textarea
                  rows="4"
                  value={(settingsEdit.values.requiredPhotos || []).join('\n')}
                  onChange={(event) => setSettingsEdit((prev) => ({ ...prev, values: { ...prev.values, requiredPhotos: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) } }))}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#1B5E20]"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Checklist</label>
                <textarea
                  rows="4"
                  value={(settingsEdit.values.checklists || []).join('\n')}
                  onChange={(event) => setSettingsEdit((prev) => ({ ...prev, values: { ...prev.values, checklists: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) } }))}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#1B5E20]"
                />
              </div>
            </div>
            <div className="mt-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">สินค้าที่ต้องเช็ค</label>
              <textarea
                rows="4"
                value={(settingsEdit.values.requiredProducts || []).join('\n')}
                onChange={(event) => setSettingsEdit((prev) => ({ ...prev, values: { ...prev.values, requiredProducts: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) } }))}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#1B5E20]"
              />
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setSettingsEdit(null)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => saveSettings(settingsEdit.branchId, settingsEdit.values)}
                disabled={savingSettings}
                className="rounded-2xl bg-[#1B5E20] px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-3xl bg-[#1B5E20] px-4 py-3 text-sm text-white shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
