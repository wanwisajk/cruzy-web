import { useCallback, useEffect, useState } from 'react';
import { scheduleService } from '../services/scheduleService.js';

function normalizeScheduleMap(scheduleMap = {}) {
  return Object.entries(scheduleMap || {}).reduce((acc, [key, employeeIds]) => {
    acc[key] = [...new Set((employeeIds || []).map(String))];
    return acc;
  }, {});
}

export function useSchedule(initialSchedule = {}, setData) {
  const [schedule, setSchedule] = useState(() => normalizeScheduleMap(initialSchedule));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const syncSchedule = useCallback((nextSchedule) => {
    const normalized = normalizeScheduleMap(nextSchedule);
    setSchedule(normalized);
    setData?.((current) => current ? ({ ...current, schedule: normalized }) : current);
  }, [setData]);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await scheduleService.getScheduleMap();
      syncSchedule(data && typeof data === 'object' ? data : {});
    } catch (err) {
      setError(err.message || 'ไม่สามารถโหลดตารางงานได้');
    } finally {
      setLoading(false);
    }
  }, [syncSchedule]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const assignSchedule = useCallback(async ({ branchId, date, employeeId, shiftStart, shiftEnd }) => {
    setSaving(true);
    setError('');
    try {
      const normalizedEmployeeId = String(employeeId);
      await scheduleService.assignSchedule({ bid: branchId, date, eid: normalizedEmployeeId, shiftStart, shiftEnd });
      const key = `${branchId}_${date}`;
      let nextSchedule;
      setSchedule((current) => {
        const currentEmployeeIds = (current[key] || []).map(String);
        nextSchedule = {
          ...current,
          [key]: currentEmployeeIds.includes(normalizedEmployeeId) ? currentEmployeeIds : [...currentEmployeeIds, normalizedEmployeeId]
        };
        setData?.((data) => data ? ({ ...data, schedule: nextSchedule }) : data);
        return nextSchedule;
      });
      return nextSchedule;
    } catch (err) {
      setError(err.message || 'ไม่สามารถบันทึกตารางงานได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [setData]);

  const removeSchedule = useCallback(async ({ branchId, date, employeeId }) => {
    setSaving(true);
    setError('');
    try {
      const normalizedEmployeeId = String(employeeId);
      await scheduleService.removeSchedule({ bid: branchId, date, eid: normalizedEmployeeId });
      const key = `${branchId}_${date}`;
      let nextSchedule;
      setSchedule((current) => {
        nextSchedule = {
          ...current,
          [key]: (current[key] || []).map(String).filter((id) => id !== normalizedEmployeeId)
        };
        setData?.((data) => data ? ({ ...data, schedule: nextSchedule }) : data);
        return nextSchedule;
      });
      return nextSchedule;
    } catch (err) {
      setError(err.message || 'ไม่สามารถลบตารางงานได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [setData]);

  return {
    schedule,
    loading,
    saving,
    error,
    refreshSchedule: fetchSchedule,
    assignSchedule,
    removeSchedule
  };
}
