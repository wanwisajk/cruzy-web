import { useCallback, useEffect, useState } from 'react';
import { scheduleService } from '../services/scheduleService.js';

export function useSchedule(initialSchedule = {}, setData) {
  const [schedule, setSchedule] = useState(initialSchedule || {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const syncSchedule = useCallback((nextSchedule) => {
    setSchedule(nextSchedule);
    setData?.((current) => current ? ({ ...current, schedule: nextSchedule }) : current);
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
      await scheduleService.assignSchedule({ bid: branchId, date, eid: employeeId, shiftStart, shiftEnd });
      const key = `${branchId}_${date}`;
      let nextSchedule;
      setSchedule((current) => {
        nextSchedule = {
          ...current,
          [key]: current[key]?.includes(employeeId) ? current[key] : [...(current[key] || []), employeeId]
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
      await scheduleService.removeSchedule({ bid: branchId, date, eid: employeeId });
      const key = `${branchId}_${date}`;
      let nextSchedule;
      setSchedule((current) => {
        nextSchedule = {
          ...current,
          [key]: (current[key] || []).filter((id) => id !== employeeId)
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
