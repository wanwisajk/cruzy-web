import { useCallback, useEffect, useState } from 'react';
import { inspectionService } from '../services/inspectionService.js';

const DAY_NUMBER_TO_KEY = { 1: 'จ', 2: 'อ', 3: 'พ', 4: 'พฤ', 5: 'ศ', 6: 'ส', 0: 'อา' };
const DEFAULT_BRANCH_HOURS = { จ: '10:00', อ: '10:00', พ: '10:00', พฤ: '10:00', ศ: '10:00', ส: '10:00', อา: '10:00' };
const DEFAULT_BRANCH_CLOSE = { จ: '21:00', อ: '21:00', พ: '21:00', พฤ: '21:00', ศ: '21:00', ส: '21:00', อา: '21:00' };

function formatTime(value) {
  return value ? String(value).slice(0, 5) : '';
}

function mergeBranchHours(branches = [], staffingRules = []) {
  return branches.map((branch) => {
    const hours = { ...DEFAULT_BRANCH_HOURS };
    const hoursEnd = { ...DEFAULT_BRANCH_CLOSE };
    staffingRules
      .filter((rule) => String(rule.branch_id) === String(branch.id) && rule.is_active !== false)
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

function rowId(value) {
  return value === null || value === undefined ? '' : String(value);
}

function getRowTime(...values) {
  return values.find((value) => value !== null && value !== undefined && String(value).trim() !== '') || '';
}

function dateTime(date, time = '00:00:00') {
  if (!date) return '';
  const normalizedTime = String(time || '00:00:00').slice(0, 8);
  return `${date}T${normalizedTime.length === 5 ? `${normalizedTime}:00` : normalizedTime}`;
}

function employeeLabel(map, employeeId, fallback = '') {
  const employee = map.get(rowId(employeeId));
  if (employee) return employee.name || employee.full_name || `พนักงาน ${employee.id}`;
  return fallback || (employeeId ? `พนักงาน ${employeeId}` : '-');
}

function branchLabel(map, branchId, fallback = '') {
  const branch = map.get(rowId(branchId));
  if (branch) return `${branch.code || branch.id} ${branch.name || ''}`.trim();
  return fallback || (branchId ? `สาขา ${branchId}` : '-');
}

function addActivity(logs, row) {
  const timestamp = getRowTime(row.timestamp, row.created_at, row.updated_at);
  if (!timestamp) return;
  logs.push({
    id: row.id || `${row.tableName || row.table_name || 'log'}-${logs.length}-${timestamp}`,
    created_at: timestamp,
    timestamp,
    page: row.page || '-',
    tableName: row.tableName || row.table_name || '-',
    action: row.action || '-',
    description: row.description || '-',
    actor: row.actor || row.user_name || row.user || '-',
    subject: row.subject || '-',
    branch: row.branch || '-',
    source: row.source || 'db',
    raw: row.raw || row
  });
}

function buildUnifiedLogs(data = {}) {
  const logs = [];
  const employeeMap = new Map((data.employees || []).map((employee) => [rowId(employee.id), employee]));
  const branchMap = new Map((data.branches || []).map((branch) => [rowId(branch.id), branch]));

  (data.systemAuditLogs || []).forEach((row) => {
    addActivity(logs, {
      ...row,
      id: `audit-${row.id}`,
      timestamp: row.created_at || row.updated_at,
      page: row.page || row.module || row.table_name || 'ระบบ',
      tableName: row.table_name || 'system_audit_logs',
      actor: row.user_name || row.actor || row.created_by,
      subject: row.entity_name || row.target_name || row.entity_id,
      branch: branchLabel(branchMap, row.branch_id, row.branch_code),
      source: row.source || 'audit',
      raw: row
    });
  });

  (data.inspectionLogs || []).forEach((row) => {
    addActivity(logs, {
      ...row,
      id: `inspection-log-${row.id}`,
      page: 'ตรวจร้าน',
      tableName: 'inspection_logs',
      actor: row.user_name,
      subject: row.inspection_id ? `Inspection #${row.inspection_id}` : '-',
      source: row.source || 'inspection',
      raw: row
    });
  });

  (data.storeInspections || []).forEach((row) => {
    addActivity(logs, {
      id: `store-inspection-${row.id}`,
      timestamp: getRowTime(row.created_at, row.updated_at, dateTime(row.work_date, row.submit_time)),
      page: 'ตรวจร้าน',
      tableName: 'store_inspections',
      action: row.status || (row.is_late ? 'late_opening' : 'opening'),
      description: row.is_late ? `เปิดร้านสาย ${row.late_minutes || 0} นาที` : 'บันทึกเปิดร้าน/ตรวจร้าน',
      actor: employeeLabel(employeeMap, row.submitted_by, row.submitted_by || '-'),
      subject: row.work_date || `Inspection #${row.id}`,
      branch: branchLabel(branchMap, row.branch_id),
      source: 'store_inspections',
      raw: row
    });
  });

  (data.employees || []).forEach((row) => {
    addActivity(logs, {
      id: `employee-${row.id}`,
      timestamp: getRowTime(row.created_at, row.updated_at),
      page: 'พนักงาน',
      tableName: 'employees',
      action: row.status === 'inactive' ? 'inactive' : 'create/update',
      description: `ข้อมูลพนักงาน ${row.name || row.full_name || row.id}`,
      actor: row.created_by || row.updated_by || '-',
      subject: row.name || row.full_name || `พนักงาน ${row.id}`,
      branch: branchLabel(branchMap, row.branch_id || row.primary_branch_id || row.home_branch_id),
      source: 'employees',
      raw: row
    });
  });

  (data.employeePayProfiles || []).forEach((row) => {
    addActivity(logs, {
      id: `pay-profile-${row.id || `${row.employee_id}-${row.effective_from}`}`,
      timestamp: getRowTime(row.created_at, row.updated_at, dateTime(row.effective_from)),
      page: 'ค่าคอม',
      tableName: 'employee_pay_profiles',
      action: row.commission_enabled === false ? 'commission_off' : 'commission_update',
      description: `ตั้งค่าคอมมิชชั่น ${employeeLabel(employeeMap, row.employee_id)}`,
      actor: row.created_by || row.updated_by || '-',
      subject: employeeLabel(employeeMap, row.employee_id),
      branch: branchLabel(branchMap, row.branch_id),
      source: 'pay_profiles',
      raw: row
    });
  });

  (data.attendanceAlerts || []).forEach((row) => {
    addActivity(logs, {
      id: `attendance-alert-${row.id}`,
      timestamp: getRowTime(row.created_at, row.updated_at, dateTime(row.alert_date || row.work_date, row.alert_time)),
      page: 'แจ้งเตือน',
      tableName: 'attendance_alerts',
      action: row.is_acknowledged ? 'acknowledged' : (row.alert_type || 'alert'),
      description: row.message || row.description || `แจ้งเตือน ${employeeLabel(employeeMap, row.employee_id)}`,
      actor: row.acknowledged_by || row.created_by || '-',
      subject: employeeLabel(employeeMap, row.employee_id),
      branch: branchLabel(branchMap, row.branch_id),
      source: 'attendance_alerts',
      raw: row
    });
  });

  (data.leaves || []).forEach((row) => {
    addActivity(logs, {
      id: `leave-${row.id}`,
      timestamp: getRowTime(row.created_at, row.updated_at, dateTime(row.start_date)),
      page: 'วันลา',
      tableName: 'leaves',
      action: row.status || 'request',
      description: `${row.leave_type || 'ลา'} ${row.start_date || ''}${row.end_date && row.end_date !== row.start_date ? ` - ${row.end_date}` : ''}`.trim(),
      actor: row.approved_by || row.created_by || '-',
      subject: employeeLabel(employeeMap, row.employee_id),
      branch: branchLabel(branchMap, row.branch_id),
      source: 'leaves',
      raw: row
    });
  });

  (data.sales || []).forEach((row) => {
    addActivity(logs, {
      id: `sale-${row.id}`,
      timestamp: getRowTime(row.created_at, row.submitted_at, row.updated_at, dateTime(row.sale_date || row.sell_date || row.work_date)),
      page: 'ยอดขาย',
      tableName: 'sales',
      action: row.status || 'sale_record',
      description: `ยอดขาย ${Number(row.total_amount || row.amount || row.net_sales || row.total_sales || row.gross_sales || 0).toLocaleString('th-TH')} บาท`,
      actor: employeeLabel(employeeMap, row.employee_id || row.created_by, row.created_by || '-'),
      subject: row.sale_date || row.sell_date || row.work_date || `Sale #${row.id}`,
      branch: branchLabel(branchMap, row.branch_id),
      source: 'sales',
      raw: row
    });
  });

  (data.salesLogs || []).forEach((row) => {
    addActivity(logs, {
      id: `sale-log-${row.id}`,
      timestamp: getRowTime(row.created_at, row.updated_at),
      page: 'ยอดขาย',
      tableName: 'sales_logs',
      action: 'edit',
      description: row.field_name ? `แก้ไข ${row.field_name}: ${row.old_value ?? '-'} -> ${row.new_value ?? '-'}` : (row.reason || 'แก้ไขยอดขาย'),
      actor: employeeLabel(employeeMap, row.edited_by, row.edited_by || '-'),
      subject: row.sale_id ? `Sale #${row.sale_id}` : '-',
      branch: branchLabel(branchMap, row.branch_id),
      source: 'sales_logs',
      raw: row
    });
  });

  (data.warningLetters || []).forEach((row) => {
    addActivity(logs, {
      id: `warning-letter-${row.id}`,
      timestamp: getRowTime(row.created_at, row.updated_at, dateTime(row.issue_date)),
      page: 'หนังสือเตือน',
      tableName: 'warning_letters',
      action: row.status || row.level || 'warning',
      description: row.reason || row.title || 'ออกหนังสือเตือน',
      actor: row.issued_by || row.created_by || '-',
      subject: employeeLabel(employeeMap, row.employee_id),
      branch: branchLabel(branchMap, row.branch_id),
      source: 'warning_letters',
      raw: row
    });
  });

  return logs.sort((a, b) => new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime());
}

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
      setLogs(buildUnifiedLogs(data));
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
      setLogs(buildUnifiedLogs(await inspectionService.fetchConsoleData()));
      setToast(status === 'pass' ? '✅ อนุมัติแล้ว' : '⚠️ บันทึกเป็นมีปัญหาแล้ว');
      setDetailOpen(false);
    } catch (err) {
      setError(err.message || 'ไม่สามารถบันทึกสถานะได้');
    } finally {
      setSavingReview(false);
    }
  }, [user]);

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
      setLogs(buildUnifiedLogs(await inspectionService.fetchConsoleData()));
      setToast('✅ บันทึกเปิดร้านแล้ว');
      return created;
    } catch (err) {
      setError(err.message || 'ไม่สามารถบันทึกเปิดร้านได้');
      throw err;
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
    saveOpeningInspection,
    saveSettings,
    setDetailOpen,
    setSettingsEdit
  };
}
