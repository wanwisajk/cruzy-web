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
  const fileUrl = row.file_url || row.fileUrl || '';
  return {
    ...row,
    entity_type: row.entity_type || row.entityType,
    entity_id: row.entity_id ?? row.entityId,
    file_url: fileUrl,
    fileUrl
  };
}

function isInspectionAttachment(attachment, id) {
  const entityType = attachment.entity_type || attachment.entityType;
  const entityId = attachment.entity_id ?? attachment.entityId;
  return ['inspection', 'store_inspection'].includes(entityType) && String(entityId) === String(id);
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

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError('');
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
      setError(err.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [from, to, currentBranch]);

  useEffect(() => {
    loadAllData();
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
      const [inspection, attachments] = await Promise.all([
        inspectionService.getInspection(id),
        inspectionService.getAttachments({ entityType: 'inspection', entityId: id }),
      ]);
      setDetailInspection({
        ...inspection,
        attachments: Array.isArray(attachments)
          ? attachments.filter((attachment) => isInspectionAttachment(attachment, id)).map(normalizeAttachment)
          : [],
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

  const saveReview = useCallback(async (id, status) => {
    setSavingReview(true);
    setError('');
    try {
      const now = new Date();
      const reviewTime = now.toTimeString().slice(0, 8);
      const userName = user?.name || user?.username || 'dashboard';
      const result = await inspectionService.updateInspection(id, {
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
      const result = await inspectionService.createInspection({
        ...payload,
        photo_count: imageDataUrls.length
      });
      const created = result?.data || result;
      let createdAttachments = [];
      if (imageDataUrls.length) {
        const attachmentResult = await inspectionService.createAttachments(imageDataUrls.map((fileUrl) => ({
          entityType: 'inspection',
          entityId: created.id,
          fileUrl
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

  const saveSettings = useCallback(async (branchId, values) => {
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
    saveSettings,
    setDetailOpen,
    setSettingsEdit
  };
}
