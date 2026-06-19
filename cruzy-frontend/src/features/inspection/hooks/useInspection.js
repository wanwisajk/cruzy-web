import { useCallback, useEffect, useState } from 'react';
import { inspectionService } from '../services/inspectionService.js';

const DAY_NUMBER_TO_KEY = { 1: 'จ', 2: 'อ', 3: 'พ', 4: 'พฤ', 5: 'ศ', 6: 'ส', 0: 'อา' };
const DEFAULT_BRANCH_HOURS = { จ: '10:00', อ: '10:00', พ: '10:00', พฤ: '10:00', ศ: '10:00', ส: '10:00', อา: '10:00' };
const DEFAULT_BRANCH_CLOSE = { จ: '21:00', อ: '21:00', พ: '21:00', พฤ: '21:00', ศ: '21:00', ส: '21:00', อา: '21:00' };

function formatTime(value) {
  return value ? String(value).slice(0, 5) : '';
}

function mergeBranchHours(branches = [], staffingRules = []) {
  const rulesByBranch = staffingRules.reduce((map, rule) => {
    const key = String(rule.branch_id);
    const current = map.get(key) || [];
    current.push(rule);
    map.set(key, current);
    return map;
  }, new Map());

  return branches.map((branch) => {
    const hours = { ...DEFAULT_BRANCH_HOURS };
    const hoursEnd = { ...DEFAULT_BRANCH_CLOSE };
    (rulesByBranch.get(String(branch.id)) || [])
      .filter((rule) => rule.is_active !== false)
      .forEach((rule) => {
        const dayKey = DAY_NUMBER_TO_KEY[Number(rule.day_of_week)];
        if (!dayKey) return;
        hours[dayKey] = formatTime(rule.shift_start) || hours[dayKey];
        hoursEnd[dayKey] = formatTime(rule.shift_end) || hoursEnd[dayKey];
      });
    return { ...branch, hours, hoursEnd };
  });
}

function normalizeAttachment(row) {
  const fileUrl = row.file_url || row.fileUrl || row.url || row.file || '';
  return {
    ...row,
    entity_type: row.entity_type || row.entityType,
    entity_id: row.entity_id ?? row.entityId,
    file_name: row.file_name || row.fileName || row.name || '',
    file_type: row.file_type || row.fileType || '',
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata : {},
    file_url: fileUrl,
    fileUrl
  };
}

function isInspectionAttachment(attachment, id) {
  const entityType = attachment.entity_type || attachment.entityType;
  const entityId = attachment.entity_id ?? attachment.entityId;
  return ['inspection', 'store_inspection', 'store_inspections'].includes(entityType) && String(entityId) === String(id);
}

export function useInspection({ user, from, to, currentBranch }) {
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [settings, setSettings] = useState([]);
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

  const loadAllData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await inspectionService.fetchDashboardData({ from, to, branch: currentBranch });
      setBranches(mergeBranchHours(data.branches || [], data.branchStaffingRules || data.branch_staffing_rules || []));
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
    } catch (err) {
      if (silent) {
        console.error('Inspection auto-refresh failed:', err);
      } else {
        setError(err.message || 'ไม่สามารถโหลดข้อมูลได้');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [from, to, currentBranch]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    const tick = async () => {
      if (disposed || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        await loadAllData({ silent: true });
      } finally {
        inFlight = false;
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    const interval = window.setInterval(tick, 30000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadAllData]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadInspectionDetail = useCallback(async (id) => {
    setDetailLoading(true);
    setDetailInspection(null);
    setError('');
    try {
      const [inspection, attachmentsByType, storedAttachments] = await Promise.all([
        inspectionService.getInspection(id),
        Promise.all([
          inspectionService.getAttachments({ entityType: 'inspection', entityId: id }),
          inspectionService.getAttachments({ entityType: 'store_inspection', entityId: id }),
          inspectionService.getAttachments({ entityType: 'store_inspections', entityId: id }),
        ]),
        inspectionService.getAttachments({ entityId: id }),
      ]);
      const attachmentRows = [...attachmentsByType.flat(), ...(Array.isArray(storedAttachments) ? storedAttachments : [])];
      const attachmentMap = new Map();
      attachmentRows
        .filter((attachment) => isInspectionAttachment(attachment, id))
        .map(normalizeAttachment)
        .forEach((attachment) => {
          const key = String(attachment.id || attachment.fileUrl || attachment.file_url || `${attachment.entity_type}_${attachment.entity_id}`);
          if (!attachmentMap.has(key)) attachmentMap.set(key, attachment);
        });
      setDetailInspection({
        ...inspection,
        attachments: Array.from(attachmentMap.values()),
      });
    } catch (err) {
      setError(err.message || 'ไม่สามารถโหลดรายละเอียดได้');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openInspectionDetail = useCallback((id) => {
    setDetailId(id);
    setDetailOpen(true);
    loadInspectionDetail(id);
  }, [loadInspectionDetail]);

  const saveReview = useCallback(async (id, status, extraPayload = {}) => {
    setSavingReview(true);
    setError('');
    try {
      const now = new Date();
      const reviewTime = now.toTimeString().slice(0, 8);
      const userName = user?.name || user?.username || 'dashboard';
      const result = await inspectionService.updateInspection(id, {
        ...extraPayload,
        status,
        reviewed_by: userName,
        review_time: reviewTime,
      });
      const updated = result?.data || result;
      await inspectionService.createInspectionLog({
        inspection_id: id,
        user_name: userName,
        action: status === 'pass' ? 'approve' : 'reject',
        description: status === 'pass' ? 'อนุมัติการตรวจร้าน' : 'บันทึกปัญหาการตรวจร้าน',
        source: 'dashboard',
      });
      setInspections((prev) => prev.map((item) => (String(item.id) === String(id) ? { ...item, ...updated } : item)));
      setDetailInspection((current) => current && String(current.id) === String(id) ? { ...current, ...updated } : current);
      setToast(status === 'pass' ? '✅ อนุมัติแล้ว' : '⚠️ บันทึกเป็นมีปัญหาแล้ว');
      setDetailOpen(false);
    } catch (err) {
      setError(err.message || 'ไม่สามารถบันทึกสถานะได้');
    } finally {
      setSavingReview(false);
    }
  }, [from, to, user]);

  const saveOpeningInspection = useCallback(async (payload, imageDataUrls = []) => {
    setSavingReview(true);
    setError('');
    try {
      const attachmentInputs = imageDataUrls.map((entry) => (typeof entry === 'string' ? { fileUrl: entry, metadata: {} } : entry));
      const result = await inspectionService.createInspection({
        ...payload,
        photo_count: attachmentInputs.length
      });
      const created = result?.data || result;
      let createdAttachments = [];
      if (attachmentInputs.length) {
        const attachmentResult = await inspectionService.createAttachments(attachmentInputs.map((attachment) => ({
          entityType: 'store_inspection',
          entityId: created.id,
          fileUrl: attachment.fileUrl,
          metadata: attachment.metadata || {}
        })));
        createdAttachments = (attachmentResult?.data || []).map(normalizeAttachment);
      }
      const userName = user?.name || user?.username || 'dashboard';
      await inspectionService.createInspectionLog({
        inspection_id: created.id,
        user_name: userName,
        action: 'create',
        description: 'บันทึกเปิดร้านจาก Dashboard',
        source: 'dashboard',
      });
      const createdWithAttachments = { ...created, attachments: createdAttachments };
      setInspections((prev) => [createdWithAttachments, ...prev].sort((a, b) => {
        if (a.work_date > b.work_date) return -1;
        if (a.work_date < b.work_date) return 1;
        return Number(b.id || 0) - Number(a.id || 0);
      }));
      setToast('✅ บันทึกเปิดร้านแล้ว');
      return created;
    } catch (err) {
      setError(err.message || 'ไม่สามารถบันทึกเปิดร้านได้');
      throw err;
    } finally {
      setSavingReview(false);
    }
  }, [from, to, user]);

  const addInspectionAttachments = useCallback(async (id, imageDataUrls = []) => {
    setSavingReview(true);
    setError('');
    try {
      const attachmentInputs = imageDataUrls.map((entry) => (typeof entry === 'string' ? { fileUrl: entry, metadata: {} } : entry));
      if (!attachmentInputs.length) return [];
      const attachmentResult = await inspectionService.createAttachments(attachmentInputs.map((attachment) => ({
        entityType: 'store_inspection',
        entityId: id,
        fileUrl: attachment.fileUrl,
        metadata: attachment.metadata || {}
      })));
      const createdAttachments = (attachmentResult?.data || []).map(normalizeAttachment);
      const currentPhotoCount = String(detailInspection?.id) === String(id)
        ? Number(detailInspection.photo_count || detailInspection.attachments?.length || 0)
        : 0;
      const nextPhotoCount = currentPhotoCount + createdAttachments.length;
      setDetailInspection((current) => {
        if (!current || String(current.id) !== String(id)) return current;
        return {
          ...current,
          photo_count: nextPhotoCount,
          attachments: [...(current.attachments || []), ...createdAttachments]
        };
      });
      setInspections((prev) => prev.map((item) => (
        String(item.id) === String(id)
          ? { ...item, photo_count: Number(item.photo_count || 0) + createdAttachments.length }
          : item
      )));
      await inspectionService.updateInspection(id, { photo_count: nextPhotoCount });
      setToast('เพิ่มรูปแล้ว');
      return createdAttachments;
    } catch (err) {
      setError(err.message || 'ไม่สามารถเพิ่มรูปได้');
      throw err;
    } finally {
      setSavingReview(false);
    }
  }, [detailInspection?.id, detailInspection?.photo_count, detailInspection?.attachments]);

  const saveSettings = useCallback(async (branchId, values) => {
    setSavingSettings(true);
    setError('');
    try {
      const payload = {
        branch_id: branchId,
        cctv_count: 0,
        shelf_count: 0,
        required_photos: values.requiredPhotos || [],
        checklists: values.inspectionSections || values.checklists || [],
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
  }, []);

  return {
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
  };
}
