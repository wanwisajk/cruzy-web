import { useEffect, useMemo, useState } from 'react';
import { Image, ListChecks, Plus, RefreshCcw, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { fmtDate, thaiLongDate, thaiShortDate } from '../lib/date';
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

function branchClosingTime(branch, date) {
  const day = new Date(`${date}T00:00:00`).getDay();
  const dayKey = DAY_NUMBER_TO_KEY[day];
  return branch?.hoursEnd?.[dayKey] || '21:00';
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

function closingStatusFor(item, branch, date) {
  const targetTime = branchClosingTime(branch, date);
  if (!item?.close_time) {
    return {
      label: 'ยังไม่บันทึกปิด',
      detail: '-',
      targetTime,
      earlyMinutes: 0,
      tone: 'bg-slate-100 text-slate-500 border-slate-200',
      dot: 'bg-slate-300'
    };
  }

  const closeMinutes = timeToMinutes(item.close_time);
  const targetMinutes = timeToMinutes(targetTime);
  const earlyMinutes = closeMinutes === null || targetMinutes === null ? 0 : Math.max(0, targetMinutes - closeMinutes);
  const isEarly = earlyMinutes > 0;

  return {
    label: isEarly ? 'ปิดก่อนเวลา' : 'ปิดแล้ว',
    detail: item.close_time || '-',
    targetTime,
    earlyMinutes,
    tone: isEarly ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200',
    dot: isEarly ? 'bg-red-500' : 'bg-blue-500'
  };
}

function formatInspectionItem(item) {
  if (typeof item === 'string') {
    return { label: item, passed: true, photoCount: 0 };
  }
  if (item === null || item === undefined) {
    return { label: '-', passed: false, photoCount: 0 };
  }
  if (typeof item === 'object') {
    const label = textValue(item.label ?? item.name ?? item.title, Object.keys(item)[0] || '');
    const photoCount = Number(item.photoCount ?? item.photo_count ?? item.photos?.length ?? 0) || 0;
    const passed = item.status === 'pass' || item.status === 'submitted' || item.passed === true || item.ok === true || item.value === 'pass' || photoCount > 0;
    const rawDetail = item.value !== undefined && item.value !== true && item.value !== false ? item.value : item.note || item.description;
    const detail = textValue(rawDetail, '');
    return {
      ...item,
      label,
      passed,
      detail,
      photoCount,
      sectionKey: item.sectionKey || item.section_key,
      sectionLabel: item.sectionLabel || item.section_label,
      itemKey: item.itemKey || item.item_key || item.key
    };
  }
  return { label: String(item), passed: false, photoCount: 0 };
}

function textValue(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    return textValue(
      value.label ?? value.name ?? value.title ?? value.text ?? value.detail ?? value.status ?? value.key,
      fallback
    );
  }
  return fallback;
}

function isSavedInspectionItemObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && (
    value.itemKey || value.item_key || value.sectionKey || value.section_key || value.photoCount !== undefined || value.photo_count !== undefined || value.status || value.label
  );
}

function normalizeSavedInspectionItems(inspectionItems) {
  if (Array.isArray(inspectionItems)) return inspectionItems;
  return Object.entries(inspectionItems || {}).map(([key, value]) => {
    if (isSavedInspectionItemObject(value)) {
      return {
        ...value,
        key: value.key || value.itemKey || value.item_key || key,
        itemKey: value.itemKey || value.item_key || value.key || key,
        label: textValue(value.label, key),
        sectionKey: value.sectionKey || value.section_key,
        sectionLabel: textValue(value.sectionLabel || value.section_label, ''),
      };
    }
    return { key, label: key, value };
  });
}

function normalizeConfigList(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === 'string') return { key: item, label: item };
    if (item && typeof item === 'object') {
      const label = textValue(item.label ?? item.name ?? item.title ?? item.text ?? item.key, '');
      return { ...item, key: textValue(item.key ?? item.id ?? label, label), label };
    }
    return { key: String(item), label: String(item) };
  }).filter((item) => item.label);
}

function makeStableKey(value, fallback) {
  const cleaned = textValue(value, fallback)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_-]+/gu, '');
  return cleaned || fallback;
}

function normalizeSectionItems(items = [], sectionKey = 'section', fallbackPrefix = 'item') {
  return normalizeConfigList(items).map((item, index) => ({
    ...item,
    key: item.key || makeStableKey(item.label, `${fallbackPrefix}_${index + 1}`),
    label: item.label,
    sectionKey,
    photoRequired: item.photoRequired !== false && item.photo_required !== false,
    minPhotos: Math.max(1, Number(item.minPhotos ?? item.min_photos ?? 1) || 1),
  }));
}

const GENERAL_PHOTO_KEYS = ['opening_general', 'closing_general'];

function isInspectionItemRequiredPhoto(item) {
  if (!item || typeof item !== 'object') return true;
  const key = item.key || item.id || item.source;
  return !GENERAL_PHOTO_KEYS.includes(String(key || ''));
}

function normalizeGeneralPhotoSettings(requiredPhotos = []) {
  const defaults = {
    opening: { key: 'opening_general', source: 'opening_general', label: 'รูปเปิดร้าน', minPhotos: 1, photoRequired: true },
    closing: { key: 'closing_general', source: 'closing_general', label: 'รูปปิดร้าน', minPhotos: 1, photoRequired: true }
  };
  if (!Array.isArray(requiredPhotos)) return defaults;
  return requiredPhotos.reduce((settings, item) => {
    if (!item || typeof item !== 'object') return settings;
    const source = item.source || item.key || item.id;
    const target = source === 'opening_general' ? 'opening' : source === 'closing_general' ? 'closing' : '';
    if (!target) return settings;
    const minPhotos = Math.max(0, Number(item.minPhotos ?? item.min_photos ?? 1) || 0);
    return {
      ...settings,
      [target]: {
        ...settings[target],
        ...item,
        key: settings[target].key,
        source: settings[target].source,
        label: settings[target].label,
        minPhotos,
        photoRequired: item.photoRequired !== false && item.photo_required !== false && minPhotos > 0
      }
    };
  }, defaults);
}

function serializeGeneralPhotoSettings(photoSettings = {}) {
  const settings = {
    ...normalizeGeneralPhotoSettings([]),
    ...photoSettings
  };
  return ['opening', 'closing'].map((key) => ({
    key: settings[key].key,
    source: settings[key].source,
    label: settings[key].label,
    minPhotos: Math.max(0, Number(settings[key].minPhotos) || 0),
    photoRequired: Math.max(0, Number(settings[key].minPhotos) || 0) > 0
  }));
}

function normalizeInspectionSectionsFromChecklists(checklists = []) {
  if (!Array.isArray(checklists)) return [];
  const hasSectionShape = checklists.some((item) => item && typeof item === 'object' && Array.isArray(item.items));
  if (!hasSectionShape) {
    const items = normalizeSectionItems(checklists, 'general', 'check');
    return items.length ? [{ key: 'general', label: 'รายการตรวจ', items }] : [];
  }
  return checklists.map((section, sectionIndex) => {
    if (typeof section === 'string') {
      const key = makeStableKey(section, `section_${sectionIndex + 1}`);
      return { key, label: section, items: [] };
    }
    const label = textValue(section.label ?? section.name ?? section.title ?? section.key, `โซน ${sectionIndex + 1}`);
    const key = section.key || section.id || makeStableKey(label, `section_${sectionIndex + 1}`);
    return {
      ...section,
      key,
      label,
      items: normalizeSectionItems(section.items || [], key, `${key}_item`)
    };
  }).filter((section) => section.label);
}

function buildInspectionSections(setting = {}) {
  const sections = normalizeInspectionSectionsFromChecklists(setting.checklists || []);
  const productItems = normalizeSectionItems(setting.required_products || [], 'required_products', 'product');
  if (productItems.length) {
    sections.push({ key: 'required_products', label: 'สินค้าที่ต้องตรวจ', items: productItems });
  }
  const requiredPhotoItems = normalizeSectionItems((setting.required_photos || []).filter(isInspectionItemRequiredPhoto), 'required_photos', 'photo');
  if (!sections.length && requiredPhotoItems.length) {
    sections.push({ key: 'required_photos', label: 'รูปที่ต้องถ่าย', items: requiredPhotoItems });
  }
  return sections.filter((section) => section.items?.length);
}

function flattenInspectionSections(sections = []) {
  return sections.flatMap((section) => (section.items || []).map((item) => ({
    ...item,
    sectionKey: section.key,
    sectionLabel: section.label,
    itemKey: item.key
  })));
}

function attachmentMetadata(attachment) {
  return attachment?.metadata && typeof attachment.metadata === 'object' ? attachment.metadata : {};
}

function attachmentSource(attachment) {
  const metadata = attachmentMetadata(attachment);
  if (metadata.source) return metadata.source;
  const text = `${attachment?.file_name || attachment?.fileName || ''} ${attachment?.storage_path || attachment?.storagePath || ''} ${attachmentUrl(attachment)}`.toLowerCase();
  if (text.includes('open_shop') || text.includes('opening_general')) return 'opening_general';
  if (text.includes('close_shop') || text.includes('closing_general')) return 'closing_general';
  if (metadata.itemKey || metadata.item_key || metadata.itemLabel || metadata.item_label) return 'inspection_item';
  return '';
}

function attachmentMatchesItem(attachment, item) {
  const metadata = attachmentMetadata(attachment);
  const attachmentItemKey = metadata.itemKey || metadata.item_key || metadata.key;
  const attachmentItemLabel = metadata.itemLabel || metadata.item_label || metadata.label;
  if (!attachmentItemKey && !attachmentItemLabel) return false;
  const attachmentSectionKey = metadata.sectionKey || metadata.section_key;
  const attachmentSectionLabel = metadata.sectionLabel || metadata.section_label;
  if (attachmentSectionKey && String(attachmentSectionKey) !== String(item.sectionKey)) return false;
  if (!attachmentSectionKey && attachmentSectionLabel && textValue(attachmentSectionLabel).toLowerCase() !== textValue(item.sectionLabel).toLowerCase()) return false;
  const itemKeys = itemLookupKeys({
    key: item.itemKey || item.key,
    label: item.label,
    name: item.name,
    title: item.title,
    id: item.id
  });
  return itemKeys.includes(textValue(attachmentItemKey).trim().toLowerCase())
    || itemKeys.includes(textValue(attachmentItemLabel).trim().toLowerCase());
}

function buildSavedItemMap(inspectionItems) {
  const rows = normalizeSavedInspectionItems(inspectionItems);
  return rows.reduce((map, rawItem) => {
    const item = formatInspectionItem(rawItem);
    const source = typeof rawItem === 'object' && rawItem ? rawItem : {};
    const keys = [
      item.sectionKey && item.itemKey ? `${item.sectionKey}:${item.itemKey}` : '',
      item.itemKey,
      ...itemLookupKeys({ ...source, label: item.label })
    ].filter(Boolean).map((value) => String(value).trim().toLowerCase());
    keys.forEach((key) => {
      if (!map.has(key)) map.set(key, { ...item, raw: rawItem });
    });
    return map;
  }, new Map());
}

function buildDetailSections(setting, inspectionItems, attachments) {
  const savedMap = buildSavedItemMap(inspectionItems);
  const imageAttachments = (attachments || []).filter(isImageAttachment);
  const sections = buildInspectionSections(setting).map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const itemKey = item.key;
      const saved = savedMap.get(`${section.key}:${itemKey}`.toLowerCase())
        || savedMap.get(String(itemKey).toLowerCase())
        || itemLookupKeys(item).map((key) => savedMap.get(key)).find(Boolean);
      const row = {
        ...item,
        sectionKey: section.key,
        sectionLabel: section.label,
        itemKey,
        detail: textValue(saved?.detail || item.description || item.note, ''),
        photos: imageAttachments.filter((attachment) => attachmentMatchesItem(attachment, { sectionKey: section.key, itemKey })),
        savedPhotoCount: saved?.photoCount || 0,
        hasData: Boolean(saved)
      };
      const photoCount = row.photos.length || row.savedPhotoCount;
      return {
        ...row,
        photoCount,
        passed: photoCount >= row.minPhotos
      };
    })
  })).filter((section) => section.items.length);

  if (sections.length) return sections;

  const fallbackItems = normalizeSavedInspectionItems(inspectionItems);
  const items = fallbackItems.map((rawItem, index) => {
    const item = formatInspectionItem(rawItem);
    return {
      ...item,
      key: item.itemKey || item.key || makeStableKey(item.label, `saved_${index + 1}`),
      itemKey: item.itemKey || item.key || makeStableKey(item.label, `saved_${index + 1}`),
      sectionKey: item.sectionKey || 'saved',
      sectionLabel: item.sectionLabel || 'ข้อมูลที่บันทึก',
      minPhotos: Math.max(1, Number(item.minPhotos ?? item.min_photos ?? 1) || 1),
      photos: imageAttachments.filter((attachment) => attachmentMatchesItem(attachment, {
        sectionKey: item.sectionKey || 'saved',
        itemKey: item.itemKey || item.key
      }))
    };
  });
  return items.length ? [{ key: 'saved', label: 'ข้อมูลที่บันทึก', items }] : [];
}

function unassignedImageAttachments(attachments = []) {
  return attachments.filter((attachment) => isImageAttachment(attachment) && !(attachmentMetadata(attachment).itemKey || attachmentMetadata(attachment).item_key));
}

function attachmentIdentity(attachment) {
  return String(attachment?.id || attachmentUrl(attachment) || `${attachment?.entity_type || attachment?.entityType}_${attachment?.entity_id || attachment?.entityId}`);
}

function uniqueAttachments(attachments = []) {
  const seen = new Set();
  return attachments.filter((attachment) => {
    const key = attachmentIdentity(attachment);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function itemLookupKeys(item) {
  return [item.key, item.label, item.name, item.title, item.id]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map((value) => String(value).trim().toLowerCase());
}

function rangeDays(from, to) {
  const dates = [];
  const current = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (current <= end) {
    dates.push(fmtDate(current));
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
  return attachment?.file_url || attachment?.fileUrl || attachment?.url || attachment?.file || '';
}

function isImageAttachment(attachment) {
  const fileType = String(attachment?.file_type || attachment?.fileType || '').toLowerCase();
  if (fileType.startsWith('image/')) return true;
  const url = attachmentUrl(attachment);
  if (typeof url === 'string' && url.startsWith('data:image/')) return true;
  return Boolean(String(url || '').match(/\.(jpe?g|png|gif|webp|svg)(?:[?#].*)?$/i));
}

function SearchInput({ value, onChange }) {
  return (
    <div className="filter-box sm:max-w-md">
      <Search size={16} className="text-slate-400" />
      <input
        className="w-full bg-transparent body-text outline-none placeholder:text-slate-400"
        placeholder="ค้นหาชื่อสาขา ชื่อพนักงาน หรือวันที่"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Pill({ children, className = '' }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 caption body-strong ${className}`}>{children}</span>;
}

function LoaderCard() {
  return (
    <div className="animate-pulse rounded-xl bg-slate-200 p-5 shadow-sm">
      <div className="h-4 w-3/4 rounded-full bg-slate-300" />
      <div className="mt-4 space-y-3">
        <div className="h-3 rounded-full bg-slate-300" />
        <div className="h-3 rounded-full bg-slate-300" />
        <div className="h-3 rounded-full bg-slate-300 w-5/6" />
      </div>
    </div>
  );
}

export default function InspectionDashboard({ user, currentBranch, from, to }) {
  const [activeTab, setActiveTab] = useState('opening');
  const [searchTerm, setSearchTerm] = useState('');
  const [openingForm, setOpeningForm] = useState(() => ({
    branchId: '',
    workDate: from || fmtDate(new Date()),
    submitTime: new Date().toTimeString().slice(0, 5),
    closeTime: '',
    submittedBy: '',
    images: [],
    closingImages: [],
    itemImages: {}
  }));
  const [reviewNote, setReviewNote] = useState('');
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
    addInspectionAttachments,
    saveSettings,
    setDetailOpen,
    setSettingsEdit
  } = useInspection({ user, from, to, currentBranch });

  const branchMap = useMemo(() => Object.fromEntries(branches.map((branch) => [branch.id, branch])), [branches]);
  const employeeMap = useMemo(() => Object.fromEntries(employees.map((employee) => [employee.id, employee])), [employees]);
  const selectedBranch = currentBranch ?? 'all';
  const visibleBranches = useMemo(
    () => (selectedBranch === 'all' ? branches : branches.filter((branch) => String(branch.id) === String(selectedBranch))),
    [branches, selectedBranch]
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
      if (selectedBranch !== 'all' && String(item.branch_id) !== String(selectedBranch)) {
        return false;
      }
      if (!searchValue) return true;
      const branchName = item.branch.name?.toLowerCase() || '';
      const branchCode = item.branch.code?.toLowerCase() || '';
      const employeeName = item.employee.name?.toLowerCase() || '';
      const rowDate = item.work_date || '';
      return branchName.includes(searchValue) || branchCode.includes(searchValue) || employeeName.includes(searchValue) || rowDate.includes(searchValue);
    });
  }, [enrichedInspections, selectedBranch, searchValue]);

  const rangeDates = useMemo(() => (from && to ? rangeDays(from, to) : []), [from, to]);
  const today = fmtDate(new Date());
  const openingTableMinWidth = 72 + rangeDates.length * 112;
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
    const closedEarly = rangeInspections.filter((item) => {
      const branch = branchMap[item.branch_id];
      return closingStatusFor(item, branch, item.work_date).earlyMinutes > 0;
    }).length;
    const missingClose = rangeInspections.filter((item) => !item.close_time).length;
    return {
      opened: rangeInspections.length,
      late,
      onTime: rangeInspections.length - late,
      missing: missingCount,
      closedEarly,
      missingClose,
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
  const detailClosingMeta = detailInspection ? closingStatusFor(detailInspection, detailBranch, detailInspection.work_date) : null;
  const detailLocked = detailInspection?.status === 'pass';
  const detailAttachments = detailInspection?.attachments || [];
  const currentSettingsMap = useMemo(
    () => Object.fromEntries(settings.map((setting) => [setting.branch_id, setting])),
    [settings]
  );
  const detailSetting = detailInspection ? currentSettingsMap[detailInspection.branch_id] || {} : {};
  const detailPhotoSettings = normalizeGeneralPhotoSettings(detailSetting.required_photos || []);
  const detailInspectionSections = detailInspection
    ? buildDetailSections(detailSetting, detailInspection.inspection_items, detailAttachments)
    : [];
  const detailUnassignedImages = unassignedImageAttachments(detailAttachments);
  const detailOpeningImages = detailUnassignedImages.filter((attachment) => attachmentSource(attachment) === 'opening_general');
  const detailClosingImages = detailUnassignedImages.filter((attachment) => attachmentSource(attachment) === 'closing_general');
  const detailMatchedImageKeys = useMemo(() => {
    const keys = new Set();
    [...detailOpeningImages, ...detailClosingImages].forEach((attachment) => keys.add(attachmentIdentity(attachment)));
    detailInspectionSections.forEach((section) => {
      section.items.forEach((item) => {
        (item.photos || []).forEach((attachment) => keys.add(attachmentIdentity(attachment)));
      });
    });
    return keys;
  }, [detailOpeningImages, detailClosingImages, detailInspectionSections]);
  const detailOtherImages = useMemo(
    () => uniqueAttachments(detailAttachments.filter((attachment) => isImageAttachment(attachment) && !detailMatchedImageKeys.has(attachmentIdentity(attachment)))),
    [detailAttachments, detailMatchedImageKeys]
  );
  const detailInspectionRequiredCount = detailInspectionSections.reduce((sum, section) => (
    sum + section.items.reduce((itemSum, item) => itemSum + (item.photoRequired === false ? 0 : item.minPhotos), 0)
  ), 0);
  const detailInspectionSubmittedCount = detailInspectionSections.reduce((sum, section) => (
    sum + section.items.reduce((itemSum, item) => itemSum + Math.min(item.photoCount || 0, item.photoRequired === false ? 0 : item.minPhotos), 0)
  ), 0);
  const detailGeneralRequiredCount = detailPhotoSettings.opening.minPhotos + detailPhotoSettings.closing.minPhotos;
  const detailGeneralSubmittedCount = Math.min(detailOpeningImages.length, detailPhotoSettings.opening.minPhotos) + Math.min(detailClosingImages.length, detailPhotoSettings.closing.minPhotos);
  const detailRequiredCount = detailInspectionRequiredCount + detailGeneralRequiredCount;
  const detailSubmittedCount = detailInspectionSubmittedCount + detailGeneralSubmittedCount;
  const openingSetting = openingForm.branchId ? currentSettingsMap[Number(openingForm.branchId)] || currentSettingsMap[openingForm.branchId] || {} : {};
  const openingPhotoSettings = normalizeGeneralPhotoSettings(openingSetting.required_photos || []);
  const openingInspectionSections = buildInspectionSections(openingSetting);
  const openingInspectionItems = flattenInspectionSections(openingInspectionSections);

  const openingFormBranch = branchMap[openingForm.branchId];
  const openingFormTargetTime = openingFormBranch ? branchOpeningTime(openingFormBranch, openingForm.workDate) : '10:00';
  const openingFormCloseTargetTime = openingFormBranch ? branchClosingTime(openingFormBranch, openingForm.workDate) : '21:00';
  const openingFormLateMinutes = useMemo(() => {
    const submitMinutes = timeToMinutes(openingForm.submitTime);
    const targetMinutes = timeToMinutes(openingFormTargetTime);
    if (submitMinutes === null || targetMinutes === null) return 0;
    return Math.max(0, submitMinutes - targetMinutes);
  }, [openingForm.submitTime, openingFormTargetTime]);
  const openingFormEarlyCloseMinutes = useMemo(() => {
    const closeMinutes = timeToMinutes(openingForm.closeTime);
    const targetMinutes = timeToMinutes(openingFormCloseTargetTime);
    if (closeMinutes === null || targetMinutes === null) return 0;
    return Math.max(0, targetMinutes - closeMinutes);
  }, [openingForm.closeTime, openingFormCloseTargetTime]);

  useEffect(() => {
    setReviewNote(detailInspection?.manager_note || '');
  }, [detailInspection?.id, detailInspection?.manager_note]);

  useEffect(() => {
    if (!from || !to) return;
    setOpeningForm((current) => {
      if (current.workDate >= from && current.workDate <= to) return current;
      return { ...current, workDate: from };
    });
  }, [from, to]);

  function setOpeningField(field) {
    return (event) => setOpeningForm((current) => ({
      ...current,
      [field]: event.target.value,
      ...(field === 'branchId' ? { itemImages: {} } : {})
    }));
  }

  function buildDetailInspectionItems() {
    return detailInspectionSections.flatMap((section) => section.items.map((item) => ({
      category: section.key === 'required_products' ? 'required_product' : 'checklist',
      sectionKey: section.key,
      sectionLabel: section.label,
      itemKey: item.itemKey || item.key,
      key: item.itemKey || item.key,
      label: item.label,
      photoRequired: item.photoRequired !== false,
      minPhotos: item.minPhotos,
      photoCount: item.photoCount || 0,
      passed: item.passed,
      status: item.passed ? 'submitted' : 'missing_photo',
      value: item.passed ? 'ส่งรูปแล้ว' : 'ยังขาดรูป'
    })));
  }

  async function setOpeningImages(event) {
    const input = event.currentTarget;
    const images = await filesToDataUrls(event.target.files);
    setOpeningForm((current) => ({ ...current, images: [...current.images, ...images] }));
    input.value = '';
  }

  async function setClosingImages(event) {
    const input = event.currentTarget;
    const images = await filesToDataUrls(event.target.files);
    setOpeningForm((current) => ({ ...current, closingImages: [...current.closingImages, ...images] }));
    input.value = '';
  }

  async function setOpeningItemImages(item, event) {
    const input = event.currentTarget;
    const images = await filesToDataUrls(event.target.files);
    const key = `${item.sectionKey}:${item.itemKey || item.key}`;
    setOpeningForm((current) => ({
      ...current,
      itemImages: {
        ...current.itemImages,
        [key]: [...(current.itemImages[key] || []), ...images]
      }
    }));
    input.value = '';
  }

  function removeOpeningImage(field, index) {
    setOpeningForm((current) => ({
      ...current,
      [field]: (current[field] || []).filter((_, currentIndex) => currentIndex !== index)
    }));
  }

  function removeOpeningItemImage(item, index) {
    const key = `${item.sectionKey}:${item.itemKey || item.key}`;
    setOpeningForm((current) => ({
      ...current,
      itemImages: {
        ...current.itemImages,
        [key]: (current.itemImages[key] || []).filter((_, currentIndex) => currentIndex !== index)
      }
    }));
  }

  async function submitOpeningForm(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!openingForm.branchId || !openingForm.workDate || !openingForm.submitTime) {
      return;
    }
    const structuredItems = openingInspectionItems.map((item) => {
      const key = `${item.sectionKey}:${item.itemKey || item.key}`;
      const photoCount = openingForm.itemImages[key]?.length || 0;
      const passed = item.photoRequired === false || photoCount >= item.minPhotos;
      return {
        category: item.sectionKey === 'required_products' ? 'required_product' : 'checklist',
        sectionKey: item.sectionKey,
        sectionLabel: item.sectionLabel,
        itemKey: item.itemKey || item.key,
        key: item.itemKey || item.key,
        label: item.label,
        photoRequired: item.photoRequired !== false,
        minPhotos: item.minPhotos,
        photoCount,
        passed,
        status: passed ? 'submitted' : 'missing_photo',
        value: passed ? 'ส่งรูปแล้ว' : 'ยังขาดรูป'
      };
    });
    const itemAttachments = openingInspectionItems.flatMap((item) => {
      const key = `${item.sectionKey}:${item.itemKey || item.key}`;
      return (openingForm.itemImages[key] || []).map((fileUrl) => ({
        fileUrl,
        metadata: {
          sectionKey: item.sectionKey,
          sectionLabel: item.sectionLabel,
          itemKey: item.itemKey || item.key,
          itemLabel: item.label,
          source: 'inspection_item'
        }
      }));
    });
    const generalAttachments = openingForm.images.map((fileUrl) => ({
      fileUrl,
      metadata: { source: 'opening_general' }
    }));
    const closingAttachments = openingForm.closingImages.map((fileUrl) => ({
      fileUrl,
      metadata: { source: 'closing_general' }
    }));
    const payload = {
      branch_id: openingForm.branchId,
      work_date: openingForm.workDate,
      submit_time: openingForm.submitTime,
      close_time: openingForm.closeTime || null,
      submitted_by: openingForm.submittedBy || null,
      status: 'pending',
      inspection_items: structuredItems.length ? structuredItems : [{ label: 'เปิดร้าน', passed: true, value: 'บันทึกเปิดร้าน' }],
      manager_note: null,
      is_late: openingFormLateMinutes > 0,
      late_minutes: openingFormLateMinutes,
      photo_count: generalAttachments.length + closingAttachments.length + itemAttachments.length
    };
    await saveOpeningInspection(payload, [...generalAttachments, ...closingAttachments, ...itemAttachments]);
    setOpeningForm((current) => ({
      ...current,
      closeTime: '',
      images: [],
      closingImages: [],
      itemImages: {}
    }));
    formElement.reset();
  }

  async function addDetailItemImages(item, event) {
    const input = event.currentTarget;
    const images = await filesToDataUrls(event.target.files);
    input.value = '';
    if (!images.length || !detailId || detailLocked) return;
    await addInspectionAttachments(detailId, images.map((fileUrl) => ({
      fileUrl,
      metadata: {
        sectionKey: item.sectionKey,
        sectionLabel: item.sectionLabel,
        itemKey: item.itemKey || item.key,
        itemLabel: item.label,
        source: 'inspection_item'
      }
    })));
  }

  async function addDetailGeneralImages(source, event) {
    const input = event.currentTarget;
    const images = await filesToDataUrls(event.target.files);
    input.value = '';
    if (!images.length || !detailId || detailLocked) return;
    await addInspectionAttachments(detailId, images.map((fileUrl) => ({
      fileUrl,
      metadata: { source }
    })));
  }

  function buildReviewPayload() {
    return {
      inspection_items: buildDetailInspectionItems(),
      manager_note: reviewNote.trim() || null
    };
  }

  function updateSettingsValues(updater) {
    setSettingsEdit((current) => {
      if (!current) return current;
      return {
        ...current,
        values: typeof updater === 'function' ? updater(current.values) : { ...current.values, ...updater }
      };
    });
  }

  function addInspectionSection() {
    updateSettingsValues((values) => {
      const sections = values.inspectionSections || [];
      const label = `โซน ${sections.length + 1}`;
      return {
        ...values,
        inspectionSections: [
          ...sections,
          {
            key: makeStableKey(label, `section_${sections.length + 1}`),
            label,
            items: []
          }
        ]
      };
    });
  }

  function updateInspectionSection(sectionIndex, patch) {
    updateSettingsValues((values) => ({
      ...values,
      inspectionSections: (values.inspectionSections || []).map((section, index) => (
        index === sectionIndex
          ? {
              ...section,
              ...patch,
              key: patch.label && (!section.key || section.key.startsWith('โซน_') || section.key.startsWith('section_'))
                ? makeStableKey(patch.label, section.key || `section_${index + 1}`)
                : section.key
            }
          : section
      ))
    }));
  }

  function removeInspectionSection(sectionIndex) {
    updateSettingsValues((values) => ({
      ...values,
      inspectionSections: (values.inspectionSections || []).filter((_, index) => index !== sectionIndex)
    }));
  }

  function addInspectionItem(sectionIndex) {
    updateSettingsValues((values) => ({
      ...values,
      inspectionSections: (values.inspectionSections || []).map((section, index) => {
        if (index !== sectionIndex) return section;
        const items = section.items || [];
        const label = `ข้อ ${items.length + 1}`;
        return {
          ...section,
          items: [
            ...items,
            {
              key: makeStableKey(label, `${section.key || `section_${sectionIndex + 1}`}_item_${items.length + 1}`),
              label,
              minPhotos: 1,
              photoRequired: true
            }
          ]
        };
      })
    }));
  }

  function updateInspectionItem(sectionIndex, itemIndex, patch) {
    updateSettingsValues((values) => ({
      ...values,
      inspectionSections: (values.inspectionSections || []).map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          items: (section.items || []).map((item, currentItemIndex) => (
            currentItemIndex === itemIndex
              ? {
                  ...item,
                  ...patch,
                  key: patch.label && (!item.key || item.key.startsWith('ข้อ_') || item.key.startsWith('item_'))
                    ? makeStableKey(patch.label, item.key || `${section.key || `section_${sectionIndex + 1}`}_item_${itemIndex + 1}`)
                    : item.key,
                  minPhotos: patch.minPhotos !== undefined ? Math.max(1, Number(patch.minPhotos) || 1) : item.minPhotos
                }
              : item
          ))
        };
      })
    }));
  }

  function removeInspectionItem(sectionIndex, itemIndex) {
    updateSettingsValues((values) => ({
      ...values,
      inspectionSections: (values.inspectionSections || []).map((section, index) => (
        index === sectionIndex
          ? { ...section, items: (section.items || []).filter((_, currentItemIndex) => currentItemIndex !== itemIndex) }
          : section
      ))
    }));
  }

  function updateGeneralPhotoSetting(type, patch) {
    updateSettingsValues((values) => {
      const currentSettings = normalizeGeneralPhotoSettings(serializeGeneralPhotoSettings(values.photoSettings || {}));
      const minPhotos = patch.minPhotos !== undefined ? Math.max(0, Number(patch.minPhotos) || 0) : currentSettings[type].minPhotos;
      return {
        ...values,
        photoSettings: {
          ...currentSettings,
          [type]: {
            ...currentSettings[type],
            ...patch,
            minPhotos,
            photoRequired: minPhotos > 0
          }
        }
      };
    });
  }

  return (
    <div className="app-page page-body space-y-3">
      <div className="page-header mb-0 flex-col items-start gap-3 md:flex-row md:items-center">
        <div className="page-heading">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100">
            <span className="text-base">🔍</span>
          </div>
          <div className="page-heading-text">
            <div className="text-[18px] font-medium leading-6 text-slate-900">ระบบตรวจร้าน</div>
            <div className="caption text-slate-500">ข้อมูลจริงตามช่วงวันที่เลือก</div>
          </div>
        </div>
        <button
          type="button"
          onClick={loadAllData}
          className="btn btn-secondary btn-sm"
        >
          <RefreshCcw size={16} /> รีเฟรชข้อมูล
        </button>
      </div>

      <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible">
        <div className="flex gap-2 px-1 sm:grid sm:px-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="section-card-sm min-w-[140px] shrink-0 p-3 sm:min-w-0">
          <div className="caption text-slate-500">เปิดแล้ว</div>
          <div className="mt-2 stat-number text-slate-900">{loading ? '–' : summaryCounts.opened}</div>
        </div>
        <div className="section-card-sm min-w-[140px] shrink-0 p-3 sm:min-w-0">
          <div className="caption text-slate-500">ยังไม่เปิด</div>
          <div className="mt-2 stat-number text-slate-900">{loading ? '–' : summaryCounts.missing}</div>
        </div>
        <div className="section-card-sm min-w-[140px] shrink-0 p-3 sm:min-w-0">
          <div className="caption text-slate-500">เปิดสาย</div>
          <div className="mt-2 stat-number text-orange-600">{loading ? '–' : summaryCounts.late}</div>
        </div>
        <div className="section-card-sm min-w-[140px] shrink-0 p-3 sm:min-w-0">
          <div className="caption text-slate-500">เปิดตรงเวลา</div>
          <div className="mt-2 stat-number text-emerald-600">{loading ? '–' : summaryCounts.onTime}</div>
        </div>
        <div className="section-card-sm min-w-[140px] shrink-0 p-3 sm:min-w-0">
          <div className="caption text-slate-500">ยังไม่บันทึกปิด</div>
          <div className="mt-2 stat-number text-slate-900">{loading ? '–' : summaryCounts.missingClose}</div>
        </div>
        <div className="section-card-sm min-w-[140px] shrink-0 p-3 sm:min-w-0">
          <div className="caption text-slate-500">ปิดก่อนเวลา</div>
          <div className="mt-2 stat-number text-red-600">{loading ? '–' : summaryCounts.closedEarly}</div>
        </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 overflow-x-auto section-card-sm p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="count-pill">
          สาขา: {selectedBranch === 'all' ? 'ทั้งหมด' : branchMap[selectedBranch]?.code || selectedBranch}
        </div>
        <SearchInput value={searchTerm} onChange={setSearchTerm} />
      </div>

      <div className="section-card-scroll">
        <div className="page-tabs border-0">
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
              className={`page-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="surface-danger p-4 body-text">{error}</div>
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
              <form onSubmit={submitOpeningForm} className="section-card-lg">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="body-strong text-slate-900">บันทึกเปิดร้าน</div>
                    <div className="mt-1 caption text-slate-500">กรอกเวลาเปิด-ปิดร้าน แนบรูปได้หลายรูป แล้วระบบจะเทียบเวลาตามสาขาและวันให้อัตโนมัติ</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className={`badge ${openingFormLateMinutes > 0 ? 'pending' : 'approved'} border px-3 py-2 caption-bold`}>
                      เปิด {openingFormTargetTime} · {openingFormLateMinutes > 0 ? `สาย ${openingFormLateMinutes} นาที` : 'ตรงเวลา'}
                    </div>
                    <div className={`badge ${openingFormEarlyCloseMinutes > 0 ? 'danger' : 'approved'} border px-3 py-2 caption-bold`}>
                      ปิด {openingFormCloseTargetTime} · {openingForm.closeTime ? (openingFormEarlyCloseMinutes > 0 ? `ก่อน ${openingFormEarlyCloseMinutes} นาที` : 'ไม่ก่อนเวลา') : 'ยังไม่กรอก'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-7">
                  <label className="caption-bold text-slate-500">
                    สาขา
                    <select value={openingForm.branchId} onChange={setOpeningField('branchId')} className="input mt-1 w-full">
                      <option value="">เลือกสาขา</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.code} - {branch.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="caption-bold text-slate-500">
                    วันที่
                    <input type="date" value={openingForm.workDate} onChange={setOpeningField('workDate')} className="input mt-1 w-full" />
                  </label>
                  <label className="caption-bold text-slate-500">
                    เวลาเปิดจริง
                    <input type="time" value={openingForm.submitTime} onChange={setOpeningField('submitTime')} className="input mt-1 w-full" />
                  </label>
                  <label className="caption-bold text-slate-500">
                    เวลาปิดร้าน
                    <input type="time" value={openingForm.closeTime} onChange={setOpeningField('closeTime')} className="input mt-1 w-full" />
                  </label>
                  <label className="caption-bold text-slate-500">
                    ผู้เปิดร้าน
                    <select value={openingForm.submittedBy} onChange={setOpeningField('submittedBy')} className="input mt-1 w-full">
                      <option value="">ไม่ระบุ</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>{employee.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="caption-bold text-slate-500">
                    รูปเปิดร้าน
                    <input type="file" accept="image/*" multiple onChange={setOpeningImages} className="input input-file-compact mt-1 w-full" />
                    <span className="mt-1 block caption text-slate-400">ต้องมี {openingPhotoSettings.opening.minPhotos} รูป</span>
                  </label>
                  <label className="caption-bold text-slate-500">
                    รูปปิดร้าน
                    <input type="file" accept="image/*" multiple onChange={setClosingImages} className="input input-file-compact mt-1 w-full" />
                    <span className="mt-1 block caption text-slate-400">ต้องมี {openingPhotoSettings.closing.minPhotos} รูป</span>
                  </label>
                </div>

                <div className="mt-3 flex justify-end">
                  <button type="submit" disabled={savingReview || !openingForm.branchId || !openingForm.workDate || !openingForm.submitTime} className="btn btn-primary w-full sm:w-auto">
                    {savingReview ? 'กำลังบันทึก...' : 'บันทึกเปิดร้าน'}
                  </button>
                </div>

                {openingForm.images.length || openingForm.closingImages.length ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="caption-bold text-slate-500">รูปเปิดร้าน</span>
                        <Pill className={openingForm.images.length >= openingPhotoSettings.opening.minPhotos ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}>
                          {openingForm.images.length}/{openingPhotoSettings.opening.minPhotos}
                        </Pill>
                      </div>
                      {openingForm.images.length ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {openingForm.images.map((image, index) => (
                            <div key={`${image.slice(0, 24)}_${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white">
                              <img src={image} alt={`opening-${index + 1}`} className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeOpeningImage('images', index)}
                                className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-red-600 shadow-sm hover:bg-white"
                                aria-label="ลบรูปเปิดร้าน"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center caption text-slate-500">ยังไม่มีรูป</div>}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="caption-bold text-slate-500">รูปปิดร้าน</span>
                        <Pill className={openingForm.closingImages.length >= openingPhotoSettings.closing.minPhotos ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}>
                          {openingForm.closingImages.length}/{openingPhotoSettings.closing.minPhotos}
                        </Pill>
                      </div>
                      {openingForm.closingImages.length ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {openingForm.closingImages.map((image, index) => (
                            <div key={`${image.slice(0, 24)}_${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white">
                              <img src={image} alt={`closing-${index + 1}`} className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeOpeningImage('closingImages', index)}
                                className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-red-600 shadow-sm hover:bg-white"
                                aria-label="ลบรูปปิดร้าน"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center caption text-slate-500">ยังไม่มีรูป</div>}
                    </div>
                  </div>
                ) : null}

                {openingInspectionSections.length ? (
                  <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 body-strong text-slate-900">
                      <UploadCloud size={16} /> รูปตามจุดตรวจ
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {openingInspectionSections.map((section) => (
                        <div key={section.key} className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="mb-3 body-strong text-slate-900">{section.label}</div>
                          <div className="space-y-3">
                            {section.items.map((item) => {
                              const row = { ...item, sectionKey: section.key, sectionLabel: section.label, itemKey: item.key };
                              const key = `${row.sectionKey}:${row.itemKey}`;
                              const images = openingForm.itemImages[key] || [];
                              return (
                                <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <div className="body-strong text-slate-900">{row.label}</div>
                                      <div className="caption text-slate-500">ต้องมีรูป {row.minPhotos} รูป</div>
                                    </div>
                                    <label className="btn btn-secondary btn-sm cursor-pointer">
                                      <Image size={14} /> เพิ่มรูป {images.length ? `(${images.length})` : ''}
                                      <input type="file" accept="image/*" multiple onChange={(event) => setOpeningItemImages(row, event)} className="hidden" />
                                    </label>
                                  </div>
                                  {images.length ? (
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                      {images.map((image, index) => (
                                        <div key={`${image.slice(0, 24)}_${index}`} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-white">
                                          <img src={image} alt={`${row.label}-${index + 1}`} className="h-full w-full object-cover" />
                                          <button
                                            type="button"
                                            onClick={() => removeOpeningItemImage(row, index)}
                                            className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-600 shadow-sm hover:bg-white"
                                            aria-label={`ลบรูป ${row.label}`}
                                          >
                                            <X size={13} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center caption text-slate-500">ยังไม่มีรูป</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </form>

              <div className="table-shell">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed border-collapse body-text" style={{ minWidth: `${openingTableMinWidth}px` }}>
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-20 w-[72px] border-b border-r-2 border-gray-100 border-r-blue-500 bg-gray-50 px-3 py-2.5 text-left caption body-strong uppercase tracking-wide text-gray-400">
                          สาขา
                        </th>
                        {rangeDates.map((date) => {
                          const day = new Date(`${date}T00:00:00`);
                          const isToday = date === today;
                          return (
                            <th
                              key={date}
                              className={`w-[112px] border-b border-gray-100 px-2 py-2.5 text-center ${
                                isToday ? 'border-b-blue-200 bg-blue-50' : 'bg-gray-50'
                              }`}
                            >
                              <div className={`caption body-strong uppercase tracking-wide ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                                {day.toLocaleDateString('th-TH', { weekday: 'short' })}
                              </div>
                              <div className={`mt-0.5 body-text body-strong ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                                {day.getDate()}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {openingBranches.length && rangeDates.length ? (
                        openingBranches.map((branch) => (
                          <tr key={branch.id}>
                            <td
                              className="sticky left-0 z-10 w-[72px] whitespace-nowrap border-b border-r-2 border-gray-100 border-r-blue-500 bg-white px-3 py-2 align-middle caption body-strong text-gray-800"
                              title={branch.name}
                            >
                              {branch.code}
                            </td>
                            {rangeDates.map((date) => {
                              const item = openingInspectionMap[`${branch.id}|${date}`];
                              const meta = openingStatusFor(item, branch, date);
                              const closeMeta = closingStatusFor(item, branch, date);
                              const isToday = date === today;
                              const hasIssue = meta.lateMinutes > 0 || closeMeta.earlyMinutes > 0;
                              const missing = !item;
                              const bgClass = missing
                                ? 'bg-red-50'
                                : hasIssue
                                  ? 'bg-orange-50'
                                  : isToday
                                    ? 'bg-blue-50/60'
                                    : 'bg-white';
                              return (
                                <td key={`${branch.id}_${date}`} className={`w-[112px] border-b border-l border-gray-100 p-2 align-top transition ${bgClass}`}>
                                  <button
                                    type="button"
                                    onClick={() => item ? openInspectionDetail(item.id) : undefined}
                                    className={`block min-h-[118px] w-full rounded-lg border border-gray-100 bg-white/80 px-2 py-1.5 text-left shadow-sm transition ${item ? 'hover:border-blue-200 hover:shadow' : 'cursor-default'}`}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`rounded-full px-2 py-0.5 caption body-strong ${missing ? 'bg-red-100 text-red-700' : meta.lateMinutes ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {meta.label}
                                      </span>
                                      <span className="caption text-gray-400">{meta.targetTime}</span>
                                    </div>
                                    <div className="mt-1.5 body-strong leading-none text-gray-900">{meta.detail}</div>
                                    <div className="mt-1 min-h-[16px] truncate caption body-strong text-gray-500">
                                      {meta.lateMinutes ? `สาย ${meta.lateMinutes} นาที` : item?.employee?.name || 'ไม่มีข้อมูล'}
                                    </div>

                                    <div className="mt-2 border-t border-gray-100 pt-1.5">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className={`rounded-full px-2 py-0.5 caption body-strong ${!item?.close_time ? 'bg-gray-100 text-gray-500' : closeMeta.earlyMinutes ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                          {item?.close_time ? 'ปิดร้าน' : 'รอปิด'}
                                        </span>
                                        <span className="caption text-gray-400">{closeMeta.targetTime}</span>
                                      </div>
                                      <div className="mt-1 body-strong leading-none text-gray-900">{closeMeta.detail}</div>
                                      <div className="mt-1 truncate caption body-strong text-gray-500">
                                        {closeMeta.earlyMinutes ? `ก่อน ${closeMeta.earlyMinutes} นาที` : item?.close_time ? 'ปิดตามเวลา' : 'ไม่มีข้อมูล'}
                                      </div>
                                    </div>
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
                  <div key={item.branch.id} className="section-card-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="body-strong text-slate-900">{item.branch.name}</div>
                        <div className="mt-1 caption text-slate-500">{item.branch.code}</div>
                      </div>
                      <div className="text-right body-strong text-slate-900">{item.rate}%</div>
                    </div>
                    <div className="mt-4 space-y-2 body-text text-slate-600">
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
                <div className="surface-muted p-8 text-center body-text">ยังไม่มีข้อมูลการตรวจร้าน</div>
              ) : null}
            </div>
          )}

          {activeTab === 'detail' && (
            <div className="space-y-4">
              <div className="table-shell">
                <table className="min-w-full border-collapse body-text">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3 text-left">วันที่</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">สาขา</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">ผู้ส่ง</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">เวลาส่ง</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">เวลาปิด</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">จำนวนรูป</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">สถานะ</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">ผู้ตรวจ</th>
                      <th className="whitespace-nowrap px-4 py-3 text-left">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInspections.length ? (
                      filteredInspections.map((item) => {
                        const closeMeta = closingStatusFor(item, branchMap[item.branch_id], item.work_date);
                        return (
                        <tr key={item.id} className="border-b last:border-b-0 hover:bg-slate-50">
                          <td className="px-4 py-3">{thaiShortDate(item.work_date)}</td>
                          <td className="px-4 py-3 body-strong text-slate-900">{item.branch.code}</td>
                          <td className="px-4 py-3">{item.employee.name}</td>
                          <td className="px-4 py-3">{item.submit_time || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 caption body-strong ${closeMeta.tone}`}>
                              {item.close_time || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{item.photo_count ?? 0}</td>
                          <td className="px-4 py-3"><span className={`inline-flex rounded-full px-3 py-1 caption body-strong ${formatBadge(item.status)}`}>{item.status || 'pending'}</span></td>
                          <td className="px-4 py-3">{item.reviewed_by || '-'}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => {
                                openInspectionDetail(item.id);
                              }}
                              className="btn btn-secondary btn-sm"
                            >
                              ดูรายละเอียด
                            </button>
                          </td>
                        </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="10" className="px-4 py-8 text-center text-slate-500">ยังไม่มีข้อมูลการตรวจร้าน</td>
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
                const configSections = buildInspectionSections(config);
                const configPhotoSettings = normalizeGeneralPhotoSettings(config.required_photos || []);
                return (
                  <div key={branch.id} className="section-card-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="body-strong text-slate-900">{branch.name}</div>
                        <div className="mt-1 caption text-slate-500">{branch.code}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingsEdit({
                          branchId: branch.id,
                          values: {
                            ...config,
                            photoSettings: configPhotoSettings,
                            inspectionSections: normalizeInspectionSectionsFromChecklists(config.checklists || []),
                            requiredPhotos: (config.required_photos || []).filter(isInspectionItemRequiredPhoto),
                            requiredProducts: config.required_products || []
                          }
                        })}
                        className="btn btn-secondary"
                      >
                        แก้ไข
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="section-card-soft body-text text-slate-700">
                        <div className="caption text-slate-500">รูปเปิดร้าน</div>
                        <div className="mt-2 body-strong text-slate-900">ต้องมี {configPhotoSettings.opening.minPhotos} รูป</div>
                      </div>
                      <div className="section-card-soft body-text text-slate-700">
                        <div className="caption text-slate-500">รูปปิดร้าน</div>
                        <div className="mt-2 body-strong text-slate-900">ต้องมี {configPhotoSettings.closing.minPhotos} รูป</div>
                      </div>
                    </div>
                    <div className="mt-4 section-card-soft body-text text-slate-700">
                      <div className="caption text-slate-500">โซนและรูปที่ต้องส่ง</div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        {configSections.length ? configSections.map((section) => (
                          <div key={section.key} className="rounded-xl border border-slate-200 bg-white p-3">
                            <div className="body-strong text-slate-900">{section.label}</div>
                            <div className="mt-2 space-y-1 body-text text-slate-600">
                              {section.items.map((item) => (
                                <div key={item.key} className="flex items-center justify-between gap-2">
                                  <span>{item.label}</span>
                                  <span className="caption text-slate-500">{item.minPhotos} รูป</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )) : <div>-</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!visibleBranches.length ? (
                <div className="surface-muted p-8 text-center body-text">ยังไม่มีสาขาที่สามารถตั้งค่าการตรวจได้</div>
              ) : null}
            </div>
          )}

        </div>
      )}

      {detailOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-20">
          <div className="surface-modal w-full max-w-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="heading-3 text-slate-900">รายละเอียดการตรวจร้าน</h2>
                <p className="mt-1 body-text text-slate-500">ข้อมูลจะดึงจากฐานข้อมูลจริงของ Store Inspection</p>
              </div>
              <button type="button" onClick={() => setDetailOpen(false)} className="icon-btn">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 space-y-4">
              {detailLoading ? (
                <div className="space-y-3">
                  <div className="h-3 w-1/3 rounded-full bg-slate-200" />
                  <div className="h-8 rounded-xl bg-slate-200" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="h-24 rounded-xl bg-slate-200" />
                    <div className="h-24 rounded-xl bg-slate-200" />
                  </div>
                </div>
              ) : detailInspection ? (
                <div className="space-y-4">
                  <div className="section-card-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="caption uppercase tracking-[0.12em] text-slate-500">สถานะเปิด-ปิดร้าน</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-3 py-1 caption-bold ${detailOpeningMeta?.tone || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {detailOpeningMeta?.label || '-'}
                          </span>
                          <span className={`inline-flex rounded-full border px-3 py-1 caption-bold ${detailClosingMeta?.tone || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {detailClosingMeta?.label || '-'}
                          </span>
                          <span className={`inline-flex rounded-full px-3 py-1 caption-bold ${formatBadge(detailInspection.status)}`}>
                            Review: {detailInspection.status || 'pending'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-right caption sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <div className="text-slate-400">เวลาเปิดสาขา</div>
                          <div className="mt-1 body-strong text-slate-900">{detailOpeningMeta?.targetTime || '-'}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <div className="text-slate-400">เวลาปิดสาขา</div>
                          <div className="mt-1 body-strong text-slate-900">{detailClosingMeta?.targetTime || '-'}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <div className="text-slate-400">เปิดจริง</div>
                          <div className="mt-1 body-strong text-slate-900">{detailInspection.submit_time || '-'}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <div className="text-slate-400">ปิดจริง</div>
                          <div className="mt-1 body-strong text-slate-900">{detailInspection.close_time || '-'}</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <div className="text-slate-400">สาย</div>
                          <div className={`mt-1 body-strong ${detailOpeningMeta?.lateMinutes ? 'text-orange-600' : 'text-emerald-600'}`}>{detailOpeningMeta?.lateMinutes || 0} นาที</div>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <div className="text-slate-400">ปิดก่อน</div>
                          <div className={`mt-1 body-strong ${detailClosingMeta?.earlyMinutes ? 'text-red-600' : 'text-blue-600'}`}>{detailClosingMeta?.earlyMinutes || 0} นาที</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="caption uppercase tracking-[0.12em] text-slate-500">สาขา</div>
                      <div className="mt-2 body-strong text-slate-900">{detailBranch.name || '-'}</div>
                      <div className="mt-1 body-text text-slate-500">{detailBranch.code || '-'}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="caption uppercase tracking-[0.12em] text-slate-500">วันที่</div>
                      <div className="mt-2 body-strong text-slate-900">{thaiLongDate(detailInspection.work_date)}</div>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="caption text-slate-500">ผู้ส่ง</div>
                      <div className="mt-2 body-strong text-slate-900">{detailEmployee.name}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="caption text-slate-500">เวลาส่ง</div>
                      <div className="mt-2 body-strong text-slate-900">{detailInspection.submit_time || '-'}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="caption text-slate-500">จำนวนรูป</div>
                      <div className="mt-2 body-strong text-slate-900">{detailInspection.photo_count ?? detailAttachments.length ?? 0}</div>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="caption text-slate-500">ผู้ตรวจ/อนุมัติ</div>
                      <div className="mt-2 body-strong text-slate-900">{detailInspection.reviewed_by || '-'}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="caption text-slate-500">เวลาอนุมัติ</div>
                      <div className="mt-2 body-strong text-slate-900">{detailInspection.review_time || '-'}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2 body-strong text-slate-900"><Image size={16} /> รูปเปิด-ปิดร้าน</div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {[
                        { key: 'opening', label: 'รูปเปิดร้าน', rows: detailOpeningImages, minPhotos: detailPhotoSettings.opening.minPhotos, source: 'opening_general' },
                        { key: 'closing', label: 'รูปปิดร้าน', rows: detailClosingImages, minPhotos: detailPhotoSettings.closing.minPhotos, source: 'closing_general' },
                      ].map((group) => (
                        <div key={group.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                              <div className="body-strong text-slate-900">{group.label}</div>
                              <Pill className={group.rows.length >= group.minPhotos ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}>
                                {group.rows.length}/{group.minPhotos}
                              </Pill>
                            </div>
                            <label className={`btn btn-secondary btn-sm ${detailLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                              <Image size={14} /> เพิ่มรูป
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(event) => addDetailGeneralImages(group.source, event)}
                                className="hidden"
                                disabled={savingReview || detailLocked}
                              />
                            </label>
                          </div>
                          {group.rows.length ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              {group.rows.map((attachment, index) => {
                                const url = attachmentUrl(attachment);
                                return (
                                  <div key={attachment.id || `${url}_${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
                                    <button
                                      type="button"
                                      onClick={() => setImagePreview({ url, title: `${group.label} ${index + 1}` })}
                                      className="block w-full overflow-hidden rounded-xl bg-slate-50 text-left"
                                    >
                                      <img src={url} alt={`${group.key}-${index + 1}`} className="h-36 w-full object-cover transition hover:scale-[1.02]" />
                                    </button>
                                    <div className="mt-2 truncate caption body-strong text-slate-500">{attachment.file_name || `${group.label} ${index + 1}`}</div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-6 text-center body-text text-slate-500">ยังไม่มีรูป</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 body-strong text-slate-900">
                        <ListChecks size={16} /> จุดตรวจและรูปหลักฐาน
                      </div>
                      <Pill className={detailSubmittedCount >= detailRequiredCount && detailRequiredCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}>
                        {detailSubmittedCount}/{detailRequiredCount || 0} รูปที่ต้องมี
                      </Pill>
                    </div>
                    <div className="space-y-4">
                      {detailInspectionSections.length ? detailInspectionSections.map((section) => (
                        <div key={section.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="mb-3 body-strong text-slate-900">{section.label}</div>
                          <div className="grid gap-3 lg:grid-cols-2">
                            {section.items.map((item) => (
                              <div key={`${section.key}_${item.itemKey || item.key}`} className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="body-strong text-slate-900">{item.label}</div>
                                    {item.detail ? <div className="caption text-slate-500">{textValue(item.detail)}</div> : null}
                                  </div>
                                  <Pill className={item.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                                    {item.passed ? 'ครบ' : `ขาด ${Math.max(0, item.minPhotos - (item.photoCount || 0))}`}
                                  </Pill>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  {item.photos.length ? item.photos.map((attachment, index) => {
                                    const url = attachmentUrl(attachment);
                                    return (
                                      <button
                                        key={attachment.id || `${url}_${index}`}
                                        type="button"
                                        onClick={() => setImagePreview({ url, title: attachmentMetadata(attachment).itemLabel || item.label })}
                                        className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-left"
                                      >
                                        <img src={url} alt={`${item.label}-${index + 1}`} className="h-full w-full object-cover transition hover:scale-[1.02]" />
                                      </button>
                                    );
                                  }) : (
                                    <div className="col-span-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center body-text text-slate-500">ยังไม่มีรูป</div>
                                  )}
                                </div>
                                <label className={`btn btn-secondary btn-sm mt-3 ${detailLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                  <Image size={14} /> เพิ่มรูปหัวข้อนี้
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(event) => addDetailItemImages(item, event)}
                                    className="hidden"
                                    disabled={savingReview || detailLocked}
                                  />
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 body-text text-slate-500">ไม่มี Checklist ของสาขานี้</div>
                      )}
                    </div>
                  </div>
                  {detailOtherImages.length ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 body-strong text-amber-900">
                          <Image size={16} /> รูปที่ยังไม่ได้จับหัวข้อ
                        </div>
                        <Pill className="bg-amber-100 text-amber-800">{detailOtherImages.length} รูป</Pill>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {detailOtherImages.map((attachment, index) => {
                          const url = attachmentUrl(attachment);
                          const metadata = attachmentMetadata(attachment);
                          const title = metadata.itemLabel || metadata.source || attachment.file_name || `รูป ${index + 1}`;
                          return (
                            <button
                              key={attachment.id || `${url}_${index}`}
                              type="button"
                              onClick={() => setImagePreview({ url, title })}
                              className="overflow-hidden rounded-xl border border-amber-200 bg-white p-2 text-left"
                            >
                              <img src={url} alt={textValue(title, `รูป ${index + 1}`)} className="h-32 w-full rounded-lg object-cover transition hover:scale-[1.02]" />
                              <div className="mt-2 truncate caption text-amber-800">{textValue(title, `รูป ${index + 1}`)}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="surface-muted p-8 text-center body-text">เลือกการตรวจร้านเพื่อดูรายละเอียด</div>
              )}
            </div>
            <div className="mt-6 grid gap-3 border-t border-slate-200 pt-4 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-end">
              {!detailLocked ? (
                <label className="block">
                  <div className="mb-1 caption uppercase tracking-[0.12em] text-slate-500">หมายเหตุผู้ตรวจ</div>
                  <input
                    type="text"
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="บันทึกหมายเหตุหรือปัญหาที่พบก่อนอนุมัติ"
                    className="input h-11 w-full bg-white"
                  />
                </label>
              ) : <div />}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setDetailOpen(false)} className="btn btn-secondary">
                  ปิด
                </button>
                {detailLocked ? (
                  <div className="flex h-11 items-center rounded-xl bg-emerald-50 px-4 caption-bold text-emerald-700 ring-1 ring-emerald-100">
                    อนุมัติแล้ว
                  </div>
                ) : null}
                {!detailLocked ? (
                  <>
                    <button
                      type="button"
                      onClick={() => saveReview(detailId, 'issues', buildReviewPayload())}
                      disabled={savingReview || detailLoading}
                      className="btn btn-warning disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      มีปัญหา
                    </button>
                    <button
                      type="button"
                      onClick={() => saveReview(detailId, 'pass', buildReviewPayload())}
                      disabled={savingReview || detailLoading}
                      className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      อนุมัติ
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {imagePreview ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setImagePreview(null)}>
          <div className="max-h-[92vh] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3 text-white">
              <div className="truncate body-strong">{imagePreview.title || 'รูปภาพ'}</div>
              <div className="flex items-center gap-2">
                <a href={imagePreview.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                  เปิดไฟล์
                </a>
                <button type="button" onClick={() => setImagePreview(null)} className="rounded-full bg-white/15 p-2 hover:bg-white/25" aria-label="ปิดรูปภาพ">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex max-h-[86vh] items-center justify-center overflow-hidden rounded-xl bg-black">
              <img src={imagePreview.url} alt={imagePreview.title || 'preview'} className="max-h-[86vh] w-auto max-w-full object-contain" />
            </div>
          </div>
        </div>
      ) : null}

      {settingsEdit ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-20">
          <div className="surface-modal w-full max-w-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="body-strong text-slate-900">ตั้งค่าตรวจ — {branchMap[settingsEdit.branchId]?.code || 'สาขา'}</div>
                <p className="mt-1 body-text text-slate-500">แก้ไขการตั้งค่าจากฐานข้อมูลจริง</p>
              </div>
              <button type="button" onClick={() => setSettingsEdit(null)} className="icon-btn">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="body-strong text-slate-900">รูปเปิดร้าน/ปิดร้าน</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="caption-bold text-slate-500">
                  รูปเปิดร้าน
                  <input
                    type="number"
                    min="0"
                    value={settingsEdit.values.photoSettings?.opening?.minPhotos ?? 1}
                    onChange={(event) => updateGeneralPhotoSetting('opening', { minPhotos: event.target.value })}
                    className="input mt-1 w-full"
                  />
                </label>
                <label className="caption-bold text-slate-500">
                  รูปปิดร้าน
                  <input
                    type="number"
                    min="0"
                    value={settingsEdit.values.photoSettings?.closing?.minPhotos ?? 1}
                    onChange={(event) => updateGeneralPhotoSetting('closing', { minPhotos: event.target.value })}
                    className="input mt-1 w-full"
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="body-strong text-slate-900">โซนตรวจและรูปที่ต้องส่ง</div>
                  <div className="mt-1 caption text-slate-500">เช่น หน้าร้าน หลังร้าน เคาน์เตอร์ ชั้นวาง</div>
                </div>
                <button type="button" onClick={addInspectionSection} className="btn btn-secondary btn-sm">
                  <Plus size={14} /> เพิ่มโซน
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {(settingsEdit.values.inspectionSections || []).length ? settingsEdit.values.inspectionSections.map((section, sectionIndex) => (
                  <div key={section.key || sectionIndex} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <label className="caption-bold text-slate-500">
                        ชื่อโซน
                        <input
                          type="text"
                          value={section.label || ''}
                          onChange={(event) => updateInspectionSection(sectionIndex, { label: event.target.value })}
                          className="input mt-1 w-full"
                        />
                      </label>
                      <div className="flex items-end gap-2">
                        <button type="button" onClick={() => addInspectionItem(sectionIndex)} className="btn btn-secondary btn-sm">
                          <Plus size={14} /> เพิ่มข้อ
                        </button>
                        <button type="button" onClick={() => removeInspectionSection(sectionIndex)} className="icon-btn text-red-600" aria-label="ลบโซน">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(section.items || []).length ? section.items.map((item, itemIndex) => (
                        <div key={item.key || itemIndex} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_110px_auto]">
                          <label className="caption-bold text-slate-500">
                            ข้อย่อย
                            <input
                              type="text"
                              value={item.label || ''}
                              onChange={(event) => updateInspectionItem(sectionIndex, itemIndex, { label: event.target.value })}
                              className="input mt-1 w-full"
                            />
                          </label>
                          <label className="caption-bold text-slate-500">
                            จำนวนรูป
                            <input
                              type="number"
                              min="1"
                              value={item.minPhotos || 1}
                              onChange={(event) => updateInspectionItem(sectionIndex, itemIndex, { minPhotos: event.target.value })}
                              className="input mt-1 w-full"
                            />
                          </label>
                          <div className="flex items-end justify-end">
                            <button type="button" onClick={() => removeInspectionItem(sectionIndex, itemIndex)} className="icon-btn text-red-600" aria-label="ลบข้อย่อย">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center body-text text-slate-500">ยังไม่มีข้อย่อย</div>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-6 text-center body-text text-slate-500">ยังไม่มีโซนตรวจ</div>
                )}
              </div>
            </div>
            <div className="mt-6">
              <label className="mb-2 block caption-strong uppercase tracking-[0.2em] text-slate-500">สินค้าที่ต้องเช็ค</label>
              <textarea
                rows="3"
                value={(settingsEdit.values.requiredProducts || []).map((item) => typeof item === 'string' ? item : item.label || item.name || '').join('\n')}
                onChange={(event) => updateSettingsValues({ requiredProducts: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) })}
                className="input w-full min-h-24"
              />
            </div>
            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setSettingsEdit(null)} className="btn btn-secondary">
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => saveSettings(settingsEdit.branchId, {
                  ...settingsEdit.values,
                  requiredPhotos: [
                    ...serializeGeneralPhotoSettings(settingsEdit.values.photoSettings || {}),
                    ...(settingsEdit.values.requiredPhotos || [])
                  ]
                })}
                disabled={savingSettings}
                className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-[#1B5E20] px-4 py-3 body-text text-white shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
