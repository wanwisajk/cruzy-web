import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, Image, Loader2, Store, UploadCloud, UserRound } from 'lucide-react';
import { api } from '../lib/api';
import { fmtDate } from '../lib/date';

const LIFF_SCRIPT_SRC = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
const GENERAL_PHOTO_KEYS = ['opening_general', 'closing_general'];

function textValue(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    return textValue(
      value.label ?? value.name ?? value.title ?? value.text ?? value.itemLabel ?? value.item_key ?? value.itemKey ?? value.key,
      fallback
    );
  }
  return fallback;
}

function makeStableKey(value, fallback) {
  const cleaned = textValue(value, fallback)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_-]+/gu, '');
  return cleaned || fallback;
}

function normalizeConfigList(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === 'string') return { key: makeStableKey(item, item), label: item };
      if (item && typeof item === 'object') {
        const label = textValue(item.label ?? item.name ?? item.title ?? item.text ?? item.itemLabel ?? item.key, '');
        const keySource = textValue(item.key ?? item.id ?? item.itemKey ?? item.item_key, label);
        return { ...item, key: makeStableKey(keySource, label), label };
      }
      return { key: String(item), label: String(item) };
    })
    .filter((item) => item.label);
}

function normalizeSectionItems(items = [], sectionKey = 'section', fallbackPrefix = 'item') {
  const seen = new Map();
  return normalizeConfigList(items).map((item, index) => {
    const baseKey = makeStableKey(item.key || item.label, `${fallbackPrefix}_${index + 1}`);
    const count = seen.get(baseKey) || 0;
    seen.set(baseKey, count + 1);
    const key = count ? `${baseKey}_${index + 1}` : baseKey;
    return {
      ...item,
      key,
      label: item.label,
      sectionKey,
      photoRequired: item.photoRequired !== false && item.photo_required !== false,
      minPhotos: Math.max(1, Number(item.minPhotos ?? item.min_photos ?? 1) || 1),
    };
  });
}

function normalizeInspectionSectionsFromChecklists(checklists = []) {
  if (!Array.isArray(checklists)) return [];
  const hasSectionShape = checklists.some((item) => item && typeof item === 'object' && Array.isArray(item.items));
  if (!hasSectionShape) {
    const items = normalizeSectionItems(checklists, 'general', 'check');
    return items.length ? [{ key: 'general', label: 'รายการตรวจ', items }] : [];
  }
  const seen = new Map();
  return checklists
    .map((section, sectionIndex) => {
      if (typeof section === 'string') {
        const baseKey = makeStableKey(section, `section_${sectionIndex + 1}`);
        const count = seen.get(baseKey) || 0;
        seen.set(baseKey, count + 1);
        const key = count ? `${baseKey}_${sectionIndex + 1}` : baseKey;
        return { key, label: section, items: [] };
      }
      const label = textValue(section.label ?? section.name ?? section.title ?? section.key, `โซน ${sectionIndex + 1}`);
      const baseKey = makeStableKey(section.key ?? section.id ?? label, `section_${sectionIndex + 1}`);
      const count = seen.get(baseKey) || 0;
      seen.set(baseKey, count + 1);
      const key = count ? `${baseKey}_${sectionIndex + 1}` : baseKey;
      return {
        ...section,
        key,
        label,
        items: normalizeSectionItems(section.items || [], key, `${key}_item`),
      };
    })
    .filter((section) => section.label);
}

function buildInspectionSections(setting = {}) {
  const sections = normalizeInspectionSectionsFromChecklists(setting.checklists || []);
  const productItems = normalizeSectionItems(setting.required_products || [], 'required_products', 'product');
  if (productItems.length) {
    sections.push({ key: 'required_products', label: 'สินค้าที่ต้องตรวจ', items: productItems });
  }
  const requiredPhotoItems = normalizeSectionItems(
    (setting.required_photos || []).filter((item) => {
      const key = item?.key || item?.id || item?.source;
      return !GENERAL_PHOTO_KEYS.includes(String(key || ''));
    }),
    'required_photos',
    'photo'
  );
  if (!sections.length && requiredPhotoItems.length) {
    sections.push({ key: 'required_photos', label: 'รูปที่ต้องถ่าย', items: requiredPhotoItems });
  }
  if (!sections.length) {
    return [{
      key: 'inspection_general',
      label: 'ตรวจร้าน',
      items: normalizeSectionItems(['รูปตรวจร้านทั่วไป'], 'inspection_general', 'general'),
    }];
  }
  return sections.filter((section) => section.items?.length);
}

function flattenSections(sections = []) {
  return sections.flatMap((section) => (section.items || []).map((item) => ({
    ...item,
    sectionKey: section.key,
    sectionLabel: section.label,
    itemKey: item.key,
  })));
}

function fileToImageEntry(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      fileUrl: reader.result,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function filesToImageEntries(fileList) {
  const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
  return Promise.all(files.map(fileToImageEntry));
}

function loadLiffScript() {
  if (window.liff) return Promise.resolve();
  if (document.querySelector(`script[src="${LIFF_SCRIPT_SRC}"]`)) {
    return new Promise((resolve, reject) => {
      const timer = window.setInterval(() => {
        if (window.liff) {
          window.clearInterval(timer);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(timer);
        reject(new Error('ไม่สามารถโหลด LIFF SDK ได้'));
      }, 8000);
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = LIFF_SCRIPT_SRC;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('ไม่สามารถโหลด LIFF SDK ได้'));
    document.head.appendChild(script);
  });
}

async function initLiffProfile() {
  const liffId = import.meta.env.VITE_LIFF_INSPECTION_ID || import.meta.env.VITE_LIFF_ID;
  if (!liffId) return null;
  await loadLiffScript();
  await window.liff.init({ liffId });
  if (!window.liff.isLoggedIn()) {
    window.liff.login();
    return { pendingLogin: true };
  }
  return window.liff.getProfile();
}

function today() {
  return fmtDate(new Date());
}

function mergeSearchParams(target, source) {
  source.forEach((value, key) => {
    if (!target.has(key)) target.set(key, value);
  });
}

function searchParamsFromText(value) {
  const raw = String(value || '').trim();
  if (!raw) return new URLSearchParams();
  const searchIndex = raw.indexOf('?');
  const hashIndex = raw.indexOf('#');
  const startIndex = searchIndex >= 0 ? searchIndex + 1 : (raw.startsWith('?') ? 1 : 0);
  const endIndex = hashIndex > startIndex ? hashIndex : raw.length;
  return new URLSearchParams(raw.slice(startIndex, endIndex));
}

function getLiffInspectionQuery() {
  const query = new URLSearchParams(window.location.search);
  if (window.location.hash) {
    mergeSearchParams(query, searchParamsFromText(window.location.hash.replace(/^#/, '')));
  }

  const state = query.get('liff.state') || query.get('liffState') || '';
  if (!state) return query;

  try {
    mergeSearchParams(query, searchParamsFromText(decodeURIComponent(state)));
  } catch (err) {
    console.warn('Unable to parse LIFF state query:', err);
  }

  return query;
}

function hasOpeningMarker(inspection) {
  const items = inspection?.inspection_items;
  if (Array.isArray(items)) {
    return items.some((item) => {
      const key = textValue(item?.key ?? item?.itemKey ?? item?.label, '').toLowerCase();
      return key === 'open_shop' || key.includes('เปิดร้าน');
    });
  }
  if (items && typeof items === 'object') {
    if (items.open_shop) return true;
    return Object.entries(items).some(([key, value]) => {
      if (key === 'open_shop' && value) return true;
      const label = textValue(value?.label ?? value?.key ?? key, '').toLowerCase();
      return label.includes('เปิดร้าน');
    });
  }
  return Boolean(inspection?.submit_time);
}

function hasInspectionSubmitted(inspection) {
  const items = inspection?.inspection_items;
  if (inspection?.status === 'pass' || inspection?.status === 'issue' || inspection?.status === 'issues') return true;
  if (Array.isArray(items)) return items.some((item) => item?.status === 'submitted' || item?.photoCount > 0);
  if (items && typeof items === 'object') {
    if (items.inspected_shop || items.inspection_source === 'liff') return true;
    return Object.values(items).some((value) => value && typeof value === 'object' && (value.status === 'submitted' || Number(value.photoCount || 0) > 0));
  }
  return false;
}

function attachmentUrl(attachment) {
  return attachment?.file_url || attachment?.fileUrl || attachment?.url || attachment?.file || '';
}

function attachmentMetadata(attachment) {
  return attachment?.metadata && typeof attachment.metadata === 'object' ? attachment.metadata : {};
}

function attachmentIdentity(attachment) {
  return String(attachment?.id || attachmentUrl(attachment) || `${attachment?.entity_type || attachment?.entityType}_${attachment?.entity_id || attachment?.entityId}`);
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

function isInspectionPhotoAttachment(attachment) {
  const source = attachmentSource(attachment);
  return source !== 'opening_general' && source !== 'closing_general';
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
  const itemKeys = [
    item.itemKey,
    item.key,
    item.label,
    item.name,
    item.title,
    item.id,
  ].filter((value) => value !== undefined && value !== null && value !== '').map((value) => textValue(value).trim().toLowerCase());
  if (attachmentItemKey) {
    const normalizedKey = textValue(attachmentItemKey).trim().toLowerCase();
    return [item.itemKey, item.key, item.id]
      .filter((value) => value !== undefined && value !== null && value !== '')
      .map((value) => textValue(value).trim().toLowerCase())
      .includes(normalizedKey);
  }
  return itemKeys.includes(textValue(attachmentItemLabel).trim().toLowerCase());
}

export default function LiffInspectionPage() {
  const query = useMemo(() => getLiffInspectionQuery(), []);
  const lockedBranchId = query.get('branchId') || query.get('branch') || '';
  const lockedEmployeeId = query.get('employeeId') || query.get('employee') || '';
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [settings, setSettings] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(() => ({
    branchId: lockedBranchId,
    employeeId: lockedEmployeeId,
    workDate: query.get('date') || today(),
  }));
  const [itemImages, setItemImages] = useState({});
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [showReviewDetail, setShowReviewDetail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let alive = true;
    async function loadPage() {
      setLoading(true);
      setError('');
      try {
        const [liffProfile, dashboardData] = await Promise.all([
          initLiffProfile().catch(() => null),
          api.getInspectionDashboard({ from: form.workDate, to: form.workDate }),
        ]);
        if (!alive) return;
        if (liffProfile?.pendingLogin) return;
        setProfile(liffProfile);
        const nextEmployees = dashboardData.employees || [];
        setBranches(dashboardData.branches || []);
        setEmployees(nextEmployees);
        setSettings(dashboardData.inspectionSettings || []);
        setInspections(dashboardData.storeInspections || []);
        if (!lockedEmployeeId && !form.employeeId && liffProfile?.userId) {
          const matchedEmployee = nextEmployees.find((employee) => employee.line_user_id === liffProfile.userId);
          if (matchedEmployee) {
            setForm((current) => ({ ...current, employeeId: String(matchedEmployee.id) }));
          }
        }
      } catch (err) {
        if (alive) setError(err.message || 'ไม่สามารถโหลดหน้าตรวจร้านได้');
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadPage();
    return () => {
      alive = false;
    };
  }, []);

  const selectedBranch = branches.find((branch) => String(branch.id) === String(form.branchId));
  const selectedEmployee = employees.find((employee) => String(employee.id) === String(form.employeeId));
  const lineMatchedEmployee = employees.find((employee) => profile?.userId && String(employee.line_user_id || '') === String(profile.userId));
  const selectedSetting = settings.find((setting) => String(setting.branch_id) === String(form.branchId)) || {};
  const openingInspection = inspections.find((inspection) => {
    return String(inspection.branch_id) === String(form.branchId)
      && inspection.work_date === form.workDate
      && hasOpeningMarker(inspection);
  });
  const sections = useMemo(() => buildInspectionSections(selectedSetting), [selectedSetting]);
  const items = useMemo(() => flattenSections(sections), [sections]);
  const totalRequired = items.reduce((sum, item) => sum + Math.max(1, Number(item.minPhotos || 1)), 0);
  const totalSelected = items.reduce((sum, item) => sum + (itemImages[`${item.sectionKey}:${item.itemKey}`]?.length || 0), 0);
  const isComplete = totalRequired > 0 && totalSelected >= totalRequired;
  const submittedInspection = openingInspection && hasInspectionSubmitted(openingInspection) ? openingInspection : null;
  const isApproved = submittedInspection?.status === 'pass';
  const isIssue = submittedInspection?.status === 'issue' || submittedInspection?.status === 'issues';
  const isPendingReview = Boolean(submittedInspection && !isApproved && !isIssue);
  const showSubmittedSummary = isPendingReview && !showReviewDetail;
  const submitterEmployee = employees.find((employee) => String(employee.id) === String(submittedInspection?.submitted_by || form.employeeId));
  const submitterName = submitterEmployee?.nickname || submitterEmployee?.name || selectedEmployee?.nickname || selectedEmployee?.name || form.employeeId || '-';
  const existingSubmittedCount = existingAttachments.filter(isInspectionPhotoAttachment).length;
  const matchedExistingImageKeys = useMemo(() => {
    const keys = new Set();
    sections.forEach((section) => {
      section.items.forEach((item) => {
        const itemRef = { ...item, sectionKey: section.key, sectionLabel: section.label, itemKey: item.key };
        existingAttachments
          .filter((attachment) => attachmentMatchesItem(attachment, itemRef))
          .forEach((attachment) => keys.add(attachmentIdentity(attachment)));
      });
    });
    return keys;
  }, [sections, existingAttachments]);
  const otherExistingImages = useMemo(
    () => existingAttachments.filter((attachment) => isInspectionPhotoAttachment(attachment) && !matchedExistingImageKeys.has(attachmentIdentity(attachment))),
    [existingAttachments, matchedExistingImageKeys]
  );

  useEffect(() => {
    let alive = true;
    async function loadExistingAttachments() {
      if (!openingInspection?.id) {
        setExistingAttachments([]);
        return;
      }
      try {
        const rows = await api.getAttachments({ entityType: 'store_inspection', entityId: openingInspection.id });
        if (alive) setExistingAttachments(Array.isArray(rows) ? rows : []);
      } catch (_err) {
        if (alive) setExistingAttachments([]);
      }
    }
    loadExistingAttachments();
    return () => {
      alive = false;
    };
  }, [openingInspection?.id]);

  useEffect(() => {
    setReviewNote(openingInspection?.manager_note || '');
    setShowReviewDetail(false);
  }, [openingInspection?.id, openingInspection?.manager_note]);

  async function addImages(item, fileList) {
    const images = await filesToImageEntries(fileList);
    if (!images.length) return;
    const key = `${item.sectionKey}:${item.itemKey}`;
    setItemImages((current) => ({
      ...current,
      [key]: [...(current[key] || []), ...images],
    }));
    setSuccess(null);
  }

  function removeImage(item, index) {
    const key = `${item.sectionKey}:${item.itemKey}`;
    setItemImages((current) => ({
      ...current,
      [key]: (current[key] || []).filter((_, imageIndex) => imageIndex !== index),
    }));
  }

  async function submitInspection() {
    setError('');
    setSuccess(null);
    if (!form.branchId) {
      setError('ไม่พบสาขา กรุณาเปิดจากปุ่มตรวจร้านใน LINE');
      return;
    }
    if (!form.employeeId) {
      setError('ไม่พบพนักงานผู้ตรวจ กรุณาเปิดจากปุ่มใน LINE หรือผูก LINE กับพนักงานก่อน');
      return;
    }
    if (!openingInspection) {
      setError('ยังไม่มีรายการเปิดร้านของสาขาและวันที่นี้ กรุณาเปิดร้านก่อนเริ่มตรวจร้าน');
      return;
    }
    const missingItem = items.find((item) => {
      const key = `${item.sectionKey}:${item.itemKey}`;
      return (itemImages[key]?.length || 0) < Math.max(1, Number(item.minPhotos || 1));
    });
    if (missingItem) {
      setError(`กรุณาเพิ่มรูปให้ครบ: ${textValue(missingItem.sectionLabel, 'หัวข้อ')} / ${textValue(missingItem.label, 'รายการตรวจ')}`);
      return;
    }

    setSaving(true);
    try {
      const inspectionItems = items.map((item) => {
        const key = `${item.sectionKey}:${item.itemKey}`;
        return {
          key: item.itemKey,
          itemKey: item.itemKey,
          sectionKey: item.sectionKey,
          sectionLabel: item.sectionLabel,
          label: item.label,
          status: 'submitted',
          minPhotos: Math.max(1, Number(item.minPhotos || 1)),
          photoCount: itemImages[key]?.length || 0,
        };
      });
      const existingItems = openingInspection.inspection_items && typeof openingInspection.inspection_items === 'object'
        ? openingInspection.inspection_items
        : {};
      const nextInspectionItems = inspectionItems.reduce((map, item) => ({
        ...map,
        [`${item.sectionKey}:${item.itemKey}`]: item,
      }), {
        ...existingItems,
        inspected_shop: true,
        inspection_source: 'liff',
        inspection_photo_count: totalSelected,
        submitted_by_name: selectedEmployee?.nickname || selectedEmployee?.name || profile?.displayName || null,
      });
      delete nextInspectionItems.approval_flex_sent_at;
      delete nextInspectionItems.approval_flex_target_count;
      const submitTime = new Date().toTimeString().slice(0, 5);
      const submitterDisplayName = selectedEmployee?.nickname || selectedEmployee?.name || lineMatchedEmployee?.nickname || lineMatchedEmployee?.name || profile?.displayName || form.employeeId || 'LIFF';

      const updatedResult = await api.updateInspection(openingInspection.id, {
        submit_time: submitTime,
        submitted_by: form.employeeId || null,
        status: 'pending',
        line_notified: false,
        line_user_id: profile?.userId || null,
        audit_actor_type: profile?.userId ? 'line' : 'employee',
        audit_actor_id: profile?.userId || form.employeeId || null,
        audit_actor_name: submitterDisplayName,
        inspection_items: nextInspectionItems,
        photo_count: Number(openingInspection.photo_count || 0) + totalSelected,
      });
      const updated = updatedResult?.data || updatedResult;
      const attachments = items.flatMap((item) => {
        const key = `${item.sectionKey}:${item.itemKey}`;
        return (itemImages[key] || []).map((image, index) => ({
          entityType: 'store_inspection',
          entityId: openingInspection.id,
          fileUrl: image.fileUrl,
          fileName: image.fileName,
          fileType: image.fileType,
          fileSize: image.fileSize,
          metadata: {
            source: 'liff_inspection',
            sectionKey: item.sectionKey,
            sectionLabel: item.sectionLabel,
            itemKey: item.itemKey,
            itemLabel: item.label,
            photoIndex: index + 1,
            lineUserId: profile?.userId || null,
            lineDisplayName: profile?.displayName || null,
          },
        }));
      });
      if (attachments.length) {
        const attachmentResult = await api.createAttachments(attachments);
        const createdAttachments = attachmentResult?.data || [];
        setExistingAttachments((current) => [...current, ...createdAttachments]);
      }
      await api.createInspectionLog({
        inspection_id: openingInspection.id,
        user_name: submitterDisplayName,
        action: 'create',
        description: 'บันทึกรูปตรวจร้านจาก LIFF',
        source: 'liff',
      });
      setSuccess({
        id: updated?.id || openingInspection.id,
        branch: selectedBranch?.name || selectedBranch?.code || form.branchId,
        count: attachments.length,
        waitingReview: true,
      });
      setInspections((current) => current.map((inspection) => (
        String(inspection.id) === String(openingInspection.id)
          ? { ...inspection, ...updated, inspection_items: nextInspectionItems }
          : inspection
      )));
      setItemImages({});
      setShowReviewDetail(false);
    } catch (err) {
      setError(err.message || 'ไม่สามารถบันทึกตรวจร้านได้');
    } finally {
      setSaving(false);
    }
  }

  async function saveReview(status) {
    if (!submittedInspection?.id || isApproved) return;
    setReviewing(true);
    setError('');
    try {
      const reviewTime = new Date().toTimeString().slice(0, 8);
      const reviewer = lineMatchedEmployee?.nickname || lineMatchedEmployee?.name || profile?.displayName || selectedEmployee?.nickname || selectedEmployee?.name || 'LIFF';
      const result = await api.updateInspection(submittedInspection.id, {
        status,
        reviewed_by: reviewer,
        review_time: reviewTime,
        manager_note: reviewNote.trim() || null,
        line_notified: false,
        line_user_id: profile?.userId || null,
        audit_actor_type: profile?.userId ? 'line' : 'employee',
        audit_actor_id: profile?.userId || form.employeeId || null,
        audit_actor_name: reviewer,
      });
      const updated = result?.data || result;
      await api.createInspectionLog({
        inspection_id: submittedInspection.id,
        user_name: reviewer,
        action: status === 'pass' ? 'approve' : 'reject',
        description: status === 'pass' ? 'อนุมัติการตรวจร้านจาก LIFF' : 'บันทึกปัญหาการตรวจร้านจาก LIFF',
        source: 'liff',
      });
      setInspections((current) => current.map((inspection) => (
        String(inspection.id) === String(submittedInspection.id)
          ? { ...inspection, ...updated }
          : inspection
      )));
      setSuccess({
        id: submittedInspection.id,
        branch: selectedBranch?.name || selectedBranch?.code || form.branchId,
        count: existingSubmittedCount,
        reviewStatus: status,
      });
    } catch (err) {
      setError(err.message || 'ไม่สามารถบันทึกผลตรวจได้');
    } finally {
      setReviewing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-700">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <Loader2 className="mb-3 animate-spin text-cruzy" size={28} />
          <div className="body-strong">กำลังโหลดหน้าตรวจร้าน</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900">
      <div className="mx-auto grid max-w-2xl gap-4">
        <div className="rounded-2xl bg-cruzy p-5 text-white shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-white/15">
              <Store size={22} />
            </span>
            <div className="min-w-0">
              <div className="heading-3">ตรวจร้าน</div>
              <div className="mt-1 body-text text-white/80">อัปโหลดรูปตามหัวข้อที่ตั้งค่าไว้</div>
            </div>
          </div>
          {profile?.displayName ? (
            <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 caption">
              <UserRound size={14} />
              <span className="truncate">{profile.displayName}</span>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 body-text text-red-700">
            <AlertCircle size={18} className="mt-0.5 flex-none" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
            <div className="flex items-center gap-2 body-strong">
              <CheckCircle2 size={18} />
              {success.waitingReview ? 'ส่งผลตรวจแล้ว' : success.reviewStatus === 'pass' ? 'บันทึกผลตรวจแล้ว' : success.reviewStatus ? 'บันทึกผลตรวจแล้ว' : 'ส่งรูปตรวจร้านแล้ว'}
            </div>
            <div className="mt-1 caption">
              เลขที่ #{success.id} · {success.branch} · {success.count} รูป
              {success.waitingReview ? ' · กำลังรอตรวจ' : success.reviewStatus ? ` · ${success.reviewStatus === 'pass' ? 'อนุมัติ' : 'มีปัญหา'}` : ''}
            </div>
          </div>
        ) : null}

        {showSubmittedSummary ? (
          <div className="flex min-h-[68vh] flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-500 px-5 py-10 text-center text-white shadow-sm">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
              <CheckCircle2 size={44} />
            </span>
            <div className="mt-5 text-3xl font-bold">ส่งผลตรวจแล้ว</div>
            <div className="mt-2 body-text text-white/85">กำลังรอตรวจและอนุมัติ</div>
            <div className="mt-6 grid w-full max-w-sm gap-2 rounded-2xl bg-white/15 p-4 caption text-white/90">
              <div>เลขที่ #{submittedInspection.id}</div>
              <div>{selectedBranch?.name || selectedBranch?.code || form.branchId} · {form.workDate}</div>
              <div>รูปตรวจร้าน {existingSubmittedCount || success?.count || 0} รูป</div>
            </div>
            <button
              type="button"
              className="btn mt-6 min-h-12 w-full max-w-sm bg-white text-emerald-700 hover:bg-emerald-50"
              onClick={() => setShowReviewDetail(true)}
            >
              ดูรายละเอียดเพื่ออนุมัติ
            </button>
          </div>
        ) : submittedInspection ? (
          <div className="grid gap-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="body-strong">รายละเอียดตรวจร้าน</div>
                  <div className="caption text-slate-500">
                    #{submittedInspection.id} · {selectedBranch?.code || form.branchId} · {form.workDate}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 caption-bold ${
                  submittedInspection.status === 'pass'
                    ? 'bg-emerald-100 text-emerald-700'
                    : submittedInspection.status === 'issue'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-blue-100 text-blue-700'
                }`}>
                  {submittedInspection.status === 'pass' ? 'อนุมัติแล้ว' : submittedInspection.status === 'issue' ? 'มีปัญหา' : 'รอตรวจ'}
                </span>
              </div>
              <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 caption text-slate-600">
                <div>ผู้ส่งผลตรวจ: {submitterName}</div>
                <div>รูปตรวจร้าน: {existingSubmittedCount} รูป</div>
                {submittedInspection.reviewed_by ? <div>ผู้อนุมัติ/ผู้ตรวจสอบ: {submittedInspection.reviewed_by}</div> : null}
                {submittedInspection.manager_note ? <div>หมายเหตุเดิม: {submittedInspection.manager_note}</div> : null}
              </div>
            </div>

            {sections.map((section) => (
              <div key={section.key} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="mb-3 body-strong">{textValue(section.label, 'หัวข้อตรวจ')}</div>
                <div className="grid gap-3">
                  {section.items.map((item) => {
                    const itemLabel = textValue(item.label, 'รายการตรวจ');
                    const itemRef = { ...item, sectionKey: section.key, itemKey: item.key };
                    const photos = existingAttachments.filter((attachment) => attachmentMatchesItem(attachment, itemRef));
                    const required = Math.max(1, Number(item.minPhotos || 1));
                    return (
                      <div key={`${section.key}:${item.key}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="body-strong text-slate-900">{itemLabel}</div>
                            <div className="caption text-slate-500">ต้องมีอย่างน้อย {required} รูป</div>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 caption-bold ${photos.length >= required ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {photos.length}/{required}
                          </span>
                        </div>
                        {photos.length ? (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {photos.map((attachment, index) => {
                              const url = attachmentUrl(attachment);
                              return (
                                <button
                                  key={attachment.id || `${url}_${index}`}
                                  type="button"
                                  onClick={() => setImagePreview({ url, title: attachmentMetadata(attachment).itemLabel || itemLabel })}
                                  className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white"
                                >
                                  <img src={url} alt={attachmentMetadata(attachment).itemLabel || itemLabel} className="h-full w-full object-cover" />
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-8 caption text-slate-500">
                            <Image size={16} /> ยังไม่มีรูปหัวข้อนี้
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {otherExistingImages.length ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="body-strong text-amber-900">รูปที่ยังไม่ได้จับหัวข้อ</div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 caption-bold text-amber-800">{otherExistingImages.length} รูป</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {otherExistingImages.map((attachment, index) => {
                    const url = attachmentUrl(attachment);
                    const title = attachmentMetadata(attachment).itemLabel || attachmentMetadata(attachment).source || attachment.file_name || `รูป ${index + 1}`;
                    return (
                      <button
                        key={attachment.id || `${url}_${index}`}
                        type="button"
                        onClick={() => setImagePreview({ url, title: textValue(title, `รูป ${index + 1}`) })}
                        className="aspect-square overflow-hidden rounded-xl border border-amber-200 bg-white"
                      >
                        <img src={url} alt={textValue(title, `รูป ${index + 1}`)} className="h-full w-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {isApproved ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center body-strong text-emerald-700">
                รายการนี้อนุมัติแล้ว
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <label className="form-label">
                  หมายเหตุผู้ตรวจ
                  <textarea
                    className="field min-h-24 resize-none py-3"
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="ใส่หมายเหตุหรือปัญหาที่พบ"
                  />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="btn btn-warning"
                    disabled={reviewing}
                    onClick={() => saveReview('issue')}
                  >
                    มีปัญหา
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={reviewing}
                    onClick={() => saveReview('pass')}
                  >
                    {reviewing ? 'กำลังบันทึก...' : 'อนุมัติ'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : form.branchId ? (
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="body-strong">หัวข้อตรวจร้าน</div>
                <div className="caption text-slate-500">{totalSelected}/{totalRequired} รูปที่ต้องมี</div>
              </div>
              <span className={`rounded-full px-3 py-1 caption-bold ${isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                {isComplete ? 'ครบแล้ว' : 'ยังไม่ครบ'}
              </span>
            </div>
            {sections.map((section) => (
              <div key={section.key} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="mb-3 body-strong">{textValue(section.label, 'หัวข้อตรวจ')}</div>
                <div className="grid gap-3">
                  {section.items.map((item) => {
                    const itemLabel = textValue(item.label, 'รายการตรวจ');
                    const sectionLabel = textValue(section.label, 'หัวข้อตรวจ');
                    const itemWithSection = { ...item, label: itemLabel, sectionKey: section.key, sectionLabel, itemKey: item.key };
                    const key = `${section.key}:${item.key}`;
                    const images = itemImages[key] || [];
                    const required = Math.max(1, Number(item.minPhotos || 1));
                    return (
                      <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="body-strong text-slate-900">{itemLabel}</div>
                            <div className="caption text-slate-500">ต้องมีอย่างน้อย {required} รูป</div>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 caption-bold ${images.length >= required ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {images.length}/{required}
                          </span>
                        </div>
                        {images.length ? (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {images.map((image, index) => (
                              <div key={`${image.fileName}_${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <button
                                  type="button"
                                  onClick={() => setImagePreview({ url: image.fileUrl, title: image.fileName || itemLabel })}
                                  className="h-full w-full"
                                >
                                  <img src={image.fileUrl} alt={image.fileName || itemLabel} className="h-full w-full object-cover" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeImage(itemWithSection, index)}
                                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 caption-bold text-white"
                                  aria-label="ลบรูป"
                                >
                                  ลบ
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <label className="btn btn-secondary w-full cursor-pointer">
                            <Camera size={16} /> ถ่ายรูป
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(event) => {
                                addImages(itemWithSection, event.target.files);
                                event.target.value = '';
                              }}
                            />
                          </label>
                          <label className="btn btn-secondary w-full cursor-pointer">
                            <UploadCloud size={16} /> เลือกรูป
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                addImages(itemWithSection, event.target.files);
                                event.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center body-text text-slate-500">
            ไม่พบสาขา กรุณาเปิดหน้านี้จากปุ่มตรวจร้านใน LINE
          </div>
        )}

        {!submittedInspection ? (
          <button
            type="button"
            className="btn btn-primary sticky bottom-4 min-h-12 w-full shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving || !form.branchId || !isComplete}
            onClick={submitInspection}
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
            {saving ? 'กำลังส่งรูป...' : 'ส่งตรวจร้าน'}
          </button>
        ) : null}
      </div>
      {imagePreview ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 truncate body-strong">{imagePreview.title || 'รูปตรวจร้าน'}</div>
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="rounded-full bg-white/15 px-3 py-1.5 caption-bold"
            >
              ปิด
            </button>
          </div>
          <button
            type="button"
            onClick={() => setImagePreview(null)}
            className="flex min-h-0 flex-1 items-center justify-center p-3"
            aria-label="ปิดรูปเต็มจอ"
          >
            <img src={imagePreview.url} alt={imagePreview.title || 'รูปตรวจร้าน'} className="max-h-full max-w-full object-contain" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
