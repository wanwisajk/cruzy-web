import { useMemo, useState } from 'react';
import { Image, ListChecks, RefreshCcw, Search, X } from 'lucide-react';
import { thaiLongDate, thaiShortDate } from '../lib/date';
import { useInspection } from '../features/inspection/hooks/useInspection.js';

function formatBadge(status) {
  if (status === 'pass') return 'bg-emerald-50 text-emerald-700';
  if (status === 'issues') return 'bg-orange-50 text-orange-700';
  if (status === 'pending') return 'bg-slate-100 text-slate-700';
  return 'bg-slate-100 text-slate-700';
}

const DAY_NUMBER_TO_KEY = { 1: 'จ', 2: 'อ', 3: 'พ', 4: 'พฤ', 5: 'ศ', 6: 'ส', 0: 'อา' };

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

function branchOpeningTime(branch, date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  const dayKey = DAY_NUMBER_TO_KEY[day];
  return branch?.hours?.[dayKey] || '10:00';
}

function openingStatusFor(item, branch, date) {
  if (!item) {
    return {
      label: 'ยังไม่เปิด',
      detail: '-',
      targetTime: branchOpeningTime(branch, date),
      lateMinutes: 0,
      tone: 'bg-slate-100 text-slate-500 border-slate-200',
      dot: 'bg-slate-300'
    };
  }

  const targetTime = branchOpeningTime(branch, date);
  const submitMinutes = timeToMinutes(item.submit_time);
  const targetMinutes = timeToMinutes(targetTime);
  const computedLateMinutes = submitMinutes === null || targetMinutes === null ? Number(item.late_minutes || 0) : Math.max(0, submitMinutes - targetMinutes);
  const isLate = computedLateMinutes > 0;

  return {
    label: isLate ? 'เปิดสาย' : 'เปิดแล้ว',
    detail: item.submit_time || '-',
    targetTime,
    lateMinutes: computedLateMinutes,
    tone: isLate ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: isLate ? 'bg-orange-500' : 'bg-emerald-500'
  };
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

function filesToDataUrls(fileList) {
  const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
  return Promise.all(files.map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
}

function attachmentUrl(attachment) {
  return attachment?.file_url || attachment?.fileUrl || '';
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
  const [openingForm, setOpeningForm] = useState(() => ({
    branchId: '',
    workDate: from || new Date().toISOString().slice(0, 10),
    submitTime: new Date().toTimeString().slice(0, 5),
    submittedBy: '',
    note: '',
    images: []
  }));
  const [imagePreview, setImagePreview] = useState(null);
  const {
    branches,
    employees,
    inspections,
    settings,
    loading,
    error,
    detailOpen,
    detailId,
    detailInspection,
    detailLoading,
    settingsEdit,
    savingSettings,
    savingReview,
    toast,
    loadAllData,
    openInspectionDetail,
    saveReview,
    saveOpeningInspection,
    saveSettings,
    setDetailOpen,
    setSettingsEdit
  } = useInspection({ user, from, to });

  const branchMap = useMemo(() => Object.fromEntries(branches.map((branch) => [branch.id, branch])), [branches]);
  const employeeMap = useMemo(() => Object.fromEntries(employees.map((employee) => [employee.id, employee])), [employees]);
  const visibleBranches = useMemo(
    () => (branchFilter === 'all' ? branches : branches.filter((branch) => branch.id === branchFilter)),
    [branches, branchFilter]
  );
  const visibleBranchIds = useMemo(
    () => new Set(visibleBranches.map((branch) => String(branch.id))),
    [visibleBranches]
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
  const rangeDateSet = useMemo(() => new Set(rangeDates), [rangeDates]);
  const expectedCombos = useMemo(
    () => visibleBranches.length * rangeDates.length,
    [visibleBranches.length, rangeDates.length]
  );
  const actualCombos = useMemo(() => {
    const set = new Set();
    enrichedInspections.forEach((item) => {
      if (visibleBranchIds.has(String(item.branch_id)) && rangeDateSet.has(item.work_date)) {
        set.add(`${item.branch_id}|${item.work_date}`);
      }
    });
    return set.size;
  }, [enrichedInspections, visibleBranchIds, rangeDateSet]);
  const missingCount = Math.max(0, expectedCombos - actualCombos);

  const rangeInspections = useMemo(
    () => enrichedInspections.filter((item) => visibleBranchIds.has(String(item.branch_id)) && rangeDateSet.has(item.work_date)),
    [enrichedInspections, visibleBranchIds, rangeDateSet]
  );

  const summaryCounts = useMemo(() => {
    const late = rangeInspections.filter((item) => {
      const branch = branchMap[item.branch_id];
      return openingStatusFor(item, branch, item.work_date).lateMinutes > 0;
    }).length;
    return {
      opened: rangeInspections.length,
      late,
      onTime: rangeInspections.length - late,
      missing: missingCount,
    };
  }, [rangeInspections, missingCount, branchMap]);

  const branchSummary = useMemo(
    () =>
      visibleBranches.map((branch) => {
        const rows = rangeInspections.filter((item) => String(item.branch_id) === String(branch.id));
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
    [rangeInspections, visibleBranches]
  );

  const openingBranches = useMemo(() => {
    if (!searchValue) return visibleBranches;
    return visibleBranches.filter((branch) => {
      const branchName = branch.name?.toLowerCase() || '';
      const branchCode = branch.code?.toLowerCase() || '';
      return branchName.includes(searchValue) || branchCode.includes(searchValue);
    });
  }, [visibleBranches, searchValue]);

  const openingInspectionMap = useMemo(() => {
    const map = {};
    enrichedInspections
      .filter((item) => rangeDateSet.has(item.work_date))
      .slice()
      .sort((a, b) => String(a.submit_time || '').localeCompare(String(b.submit_time || '')))
      .forEach((item) => {
        const key = `${item.branch_id}|${item.work_date}`;
        if (!map[key]) map[key] = item;
      });
    return map;
  }, [enrichedInspections, rangeDateSet]);

  const detailBranch = branchMap[detailInspection?.branch_id] || {};
  const detailEmployee = employeeMap[detailInspection?.submitted_by] || { name: detailInspection?.submitted_by || '-' };
  const detailOpeningMeta = detailInspection ? openingStatusFor(detailInspection, detailBranch, detailInspection.work_date) : null;
  const detailAttachments = detailInspection?.attachments || [];
  const currentSettingsMap = useMemo(
    () => Object.fromEntries(settings.map((setting) => [setting.branch_id, setting])),
    [settings]
  );

  const openingFormBranch = branchMap[openingForm.branchId];
  const openingFormTargetTime = openingFormBranch ? branchOpeningTime(openingFormBranch, openingForm.workDate) : '10:00';
  const openingFormLateMinutes = useMemo(() => {
    const submitMinutes = timeToMinutes(openingForm.submitTime);
    const targetMinutes = timeToMinutes(openingFormTargetTime);
    if (submitMinutes === null || targetMinutes === null) return 0;
    return Math.max(0, submitMinutes - targetMinutes);
  }, [openingForm.submitTime, openingFormTargetTime]);

  function setOpeningField(field) {
    return (event) => setOpeningForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function setOpeningImages(event) {
    const images = await filesToDataUrls(event.target.files);
    setOpeningForm((current) => ({ ...current, images }));
  }

  async function submitOpeningForm(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!openingForm.branchId || !openingForm.workDate || !openingForm.submitTime) {
      return;
    }
    const payload = {
      branch_id: openingForm.branchId,
      work_date: openingForm.workDate,
      submit_time: openingForm.submitTime,
      submitted_by: openingForm.submittedBy || null,
      status: 'pending',
      inspection_items: [{ label: 'เปิดร้าน', passed: true, value: openingForm.note || 'บันทึกเปิดร้าน' }],
      manager_note: openingForm.note || null,
      is_late: openingFormLateMinutes > 0,
      late_minutes: openingFormLateMinutes,
      score: 0,
      photo_count: openingForm.images.length
    };
    await saveOpeningInspection(payload, openingForm.images);
    setOpeningForm((current) => ({
      ...current,
      note: '',
      images: []
    }));
    formElement.reset();
  }

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
            { id: 'opening', label: 'เปิดร้าน' },
            { id: 'summary', label: 'ภาพรวมสาขา' },
            { id: 'detail', label: 'รายละเอียด' },
            { id: 'config', label: 'ตั้งค่าตรวจ' },
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
              <form onSubmit={submitOpeningForm} className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">บันทึกเปิดร้าน</div>
                    <div className="mt-1 text-xs text-slate-500">กรอกเวลาเปิดร้าน แนบรูปได้หลายรูป แล้วระบบจะเทียบเวลาเปิดตามสาขาและวันให้อัตโนมัติ</div>
                  </div>
                  <div className={`rounded-2xl border px-3 py-2 text-xs font-bold ${openingFormLateMinutes > 0 ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                    เวลาเปิดสาขา {openingFormTargetTime} · {openingFormLateMinutes > 0 ? `สาย ${openingFormLateMinutes} นาที` : 'ตรงเวลา'}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  <label className="text-xs font-bold text-slate-500">
                    สาขา
                    <select value={openingForm.branchId} onChange={setOpeningField('branchId')} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500">
                      <option value="">เลือกสาขา</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.code} - {branch.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-500">
                    วันที่
                    <input type="date" value={openingForm.workDate} onChange={setOpeningField('workDate')} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500" />
                  </label>
                  <label className="text-xs font-bold text-slate-500">
                    เวลาเปิดจริง
                    <input type="time" value={openingForm.submitTime} onChange={setOpeningField('submitTime')} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500" />
                  </label>
                  <label className="text-xs font-bold text-slate-500">
                    ผู้เปิดร้าน
                    <select value={openingForm.submittedBy} onChange={setOpeningField('submittedBy')} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500">
                      <option value="">ไม่ระบุ</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>{employee.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-500">
                    รูปเปิดร้าน
                    <input type="file" accept="image/*" multiple onChange={setOpeningImages} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-2 file:py-1 file:text-xs file:font-bold file:text-emerald-700" />
                  </label>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
                  <label className="text-xs font-bold text-slate-500">
                    หมายเหตุ
                    <input type="text" value={openingForm.note} onChange={setOpeningField('note')} placeholder="เช่น เปิดร้านเรียบร้อย ถ่ายรูปหน้าร้าน/เคาน์เตอร์แล้ว" className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500" />
                  </label>
                  <div className="flex items-end">
                    <button type="submit" disabled={savingReview || !openingForm.branchId || !openingForm.workDate || !openingForm.submitTime} className="w-full rounded-2xl bg-[#1B5E20] px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto">
                      {savingReview ? 'กำลังบันทึก...' : 'บันทึกเปิดร้าน'}
                    </button>
                  </div>
                </div>

                {openingForm.images.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {openingForm.images.map((image, index) => (
                      <div key={`${image.slice(0, 24)}_${index}`} className="aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <img src={image} alt={`opening-${index + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </form>

              {summaryCounts.missing ? (
                <div className="rounded-3xl bg-[#FFF4E5] p-4 text-sm text-[#B45309] shadow-sm">📭 มี {summaryCounts.missing} สาขา×วัน ที่ยังไม่มีรายการตรวจร้าน</div>
              ) : null}
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="text-sm font-bold text-slate-900">📅 สถานะเปิดร้าน × สาขา</div>
                  <div className="mt-1 text-xs text-slate-500">ข้อมูลจาก DB ตาราง store_inspections: เวลาเปิด, เปิดสาย, หรือยังไม่เปิด</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="sticky left-0 z-10 min-w-[180px] border-r border-slate-200 bg-slate-50 px-4 py-3 text-left">สาขา</th>
                        {rangeDates.map((date) => (
                          <th key={date} className="min-w-[150px] whitespace-nowrap px-3 py-3 text-center">
                            <div className="font-bold text-slate-700">{thaiShortDate(date)}</div>
                            <div className="mt-0.5 text-[10px] font-medium text-slate-400">{date}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {openingBranches.length && rangeDates.length ? (
                        openingBranches.map((branch) => (
                          <tr key={branch.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                            <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-4 py-3">
                              <div className="font-bold text-slate-900">{branch.code}</div>
                              <div className="mt-0.5 max-w-[150px] truncate text-xs text-slate-500">{branch.name}</div>
                            </td>
                            {rangeDates.map((date) => {
                              const item = openingInspectionMap[`${branch.id}|${date}`];
                              const meta = openingStatusFor(item, branch, date);
                              return (
                                <td key={`${branch.id}_${date}`} className="px-3 py-3 align-top">
                                  <button
                                    type="button"
                                    onClick={() => item ? openInspectionDetail(item.id) : undefined}
                                    className={`w-full rounded-2xl border px-3 py-2 text-left transition ${meta.tone} ${item ? 'hover:shadow-sm' : 'cursor-default'}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                                      <span className="text-xs font-bold">{meta.label}</span>
                                    </div>
                                    <div className="mt-1 text-lg font-black leading-none">{meta.detail}</div>
                                    <div className="mt-1 text-[10px] font-semibold opacity-80">เวลาเปิดสาขา {meta.targetTime}</div>
                                    {meta.lateMinutes ? (
                                      <div className="mt-0.5 text-[10px] font-semibold opacity-80">สาย {meta.lateMinutes} นาที</div>
                                    ) : item?.employee?.name ? (
                                      <div className="mt-0.5 truncate text-[10px] font-semibold opacity-80">{item.employee.name}</div>
                                    ) : (
                                      <div className="mt-0.5 text-[10px] font-semibold opacity-70">ไม่มีข้อมูลเปิดร้าน</div>
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={Math.max(1, rangeDates.length + 1)} className="px-4 py-8 text-center text-slate-500">ยังไม่มีข้อมูลสาขาหรือช่วงวันที่สำหรับแสดงตารางเปิดร้าน</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
                                openInspectionDetail(item.id);
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
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-500">สถานะเปิดร้าน</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${detailOpeningMeta?.tone || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {detailOpeningMeta?.label || '-'}
                          </span>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${formatBadge(detailInspection.status)}`}>
                            Review: {detailInspection.status || 'pending'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-right text-xs sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <div className="text-slate-400">เวลาเปิดสาขา</div>
                          <div className="mt-1 font-black text-slate-900">{detailOpeningMeta?.targetTime || '-'}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <div className="text-slate-400">เปิดจริง</div>
                          <div className="mt-1 font-black text-slate-900">{detailInspection.submit_time || '-'}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <div className="text-slate-400">สาย</div>
                          <div className={`mt-1 font-black ${detailOpeningMeta?.lateMinutes ? 'text-orange-600' : 'text-emerald-600'}`}>{detailOpeningMeta?.lateMinutes || 0} นาที</div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                  <div className="grid gap-4 sm:grid-cols-4">
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
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">จำนวนรูป</div>
                      <div className="mt-2 font-semibold text-slate-900">{detailInspection.photo_count ?? detailAttachments.length ?? 0}</div>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">ผู้ตรวจ/อนุมัติ</div>
                      <div className="mt-2 font-semibold text-slate-900">{detailInspection.reviewed_by || '-'}</div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <div className="text-xs text-slate-500">เวลาอนุมัติ</div>
                      <div className="mt-2 font-semibold text-slate-900">{detailInspection.review_time || '-'}</div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-500">หมายเหตุ</div>
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
                        {detailAttachments.length ? (
                          detailAttachments.map((attachment, index) => {
                            const url = attachmentUrl(attachment);
                            return (
                            <div key={attachment.id || `${url}_${index}`} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-3">
                              <button
                                type="button"
                                onClick={() => setImagePreview({ url, title: attachment.file_name || `รูปที่ ${index + 1}` })}
                                className="block w-full overflow-hidden rounded-2xl bg-white text-left"
                              >
                                <img src={url} alt={`inspection-${index + 1}`} className="h-36 w-full object-cover transition hover:scale-[1.02]" />
                              </button>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <div className="truncate text-[11px] font-semibold text-slate-500">{attachment.file_name || `รูปที่ ${index + 1}`}</div>
                                <a href={url} target="_blank" rel="noreferrer" className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-slate-700">
                                  เปิดไฟล์
                                </a>
                              </div>
                            </div>
                            );
                          })
                        ) : (
                          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">ไม่มีรูปภาพ</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <details className="rounded-3xl border border-slate-200 bg-white p-4">
                    <summary className="cursor-pointer text-sm font-bold text-slate-900">ข้อมูลดิบจาก DB</summary>
                    <pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(detailInspection, null, 2)}</pre>
                  </details>
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

      {imagePreview ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setImagePreview(null)}>
          <div className="max-h-[92vh] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3 text-white">
              <div className="truncate text-sm font-bold">{imagePreview.title || 'รูปภาพ'}</div>
              <div className="flex items-center gap-2">
                <a href={imagePreview.url} target="_blank" rel="noreferrer" className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold hover:bg-white/25">
                  เปิดไฟล์
                </a>
                <button type="button" onClick={() => setImagePreview(null)} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="ปิดรูปภาพ">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex max-h-[86vh] items-center justify-center overflow-hidden rounded-3xl bg-black">
              <img src={imagePreview.url} alt={imagePreview.title || 'preview'} className="max-h-[86vh] w-auto max-w-full object-contain" />
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
