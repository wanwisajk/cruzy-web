import { useCallback, useEffect, useState } from 'react';
import { leaveService } from '../services/leaveService.js';

function normalizeLeaves(rows) {
  return (Array.isArray(rows) ? rows : []).slice().sort((left, right) => {
    const statusCompare = String(left.status || '').localeCompare(String(right.status || ''));
    if (statusCompare !== 0) return statusCompare;
    return String(right.start_date || '').localeCompare(String(left.start_date || ''));
  });
}

export function useLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchLeaves = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const leavesData = await leaveService.getLeaves();
      setLeaves(normalizeLeaves(leavesData));
    } catch (err) {
      if (silent) {
        console.error('Leave auto-refresh failed:', err);
      } else {
        setError(err.message || 'ไม่สามารถโหลดข้อมูลการลาได้');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    const tick = async () => {
      if (disposed || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        await fetchLeaves({ silent: true });
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
  }, [fetchLeaves]);

  const createLeave = useCallback(async (payload) => {
    setSaving(true);
    setError('');
    try {
      const response = await leaveService.createLeave(payload);
      if (response?.data) {
        setLeaves((current) => normalizeLeaves([response.data, ...current]));
      }
      return response?.data;
    } catch (err) {
      setError(err.message || 'ไม่สามารถเพิ่มคำขอลาได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchLeaves]);

  const updateLeave = useCallback(async (id, payload) => {
    setSaving(true);
    setError('');
    try {
      const response = await leaveService.updateLeave(id, payload);
      if (response?.data) {
        setLeaves((current) => normalizeLeaves(current.map((leave) => String(leave.id) === String(id) ? response.data : leave)));
      }
      return response?.data;
    } catch (err) {
      setError(err.message || 'ไม่สามารถอัปเดตรายการลาได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchLeaves]);

  const deleteLeave = useCallback(async (id) => {
    setSaving(true);
    setError('');
    try {
      await leaveService.deleteLeave(id);
      setLeaves((current) => current.filter((leave) => String(leave.id) !== String(id)));
    } catch (err) {
      setError(err.message || 'ไม่สามารถลบคำขอลาได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const getLeaveDetail = useCallback(async (id) => {
    const response = await leaveService.getLeave(id);
    if (response?.id !== undefined) {
      setLeaves((current) => normalizeLeaves(current.map((leave) => String(leave.id) === String(id) ? response : leave)));
    }
    return response;
  }, []);

  return {
    leaves,
    loading,
    saving,
    error,
    refreshLeaves: fetchLeaves,
    createLeave,
    updateLeave,
    deleteLeave,
    getLeaveDetail
  };
}
