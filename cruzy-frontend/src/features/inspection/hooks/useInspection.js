import { useCallback, useEffect, useState } from 'react';
import { inspectionService } from '../services/inspectionService.js';

export function useInspection({ user, from, to }) {
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

  const loadAllData = useCallback(async () => {
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
  }, [from, to]);

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
  }, [user]);

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
    logs,
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
    saveSettings,
    setDetailOpen,
    setSettingsEdit
  };
}
