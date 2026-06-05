import { useCallback, useEffect, useState } from 'react';
import { leaveService } from '../services/leaveService.js';

export function useLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const leavesData = await leaveService.getLeaves();
      setLeaves(Array.isArray(leavesData) ? leavesData : []);
    } catch (err) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลการลาได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const createLeave = useCallback(async (payload) => {
    setSaving(true);
    setError('');
    try {
      await leaveService.createLeave(payload);
      await fetchLeaves();
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
      await leaveService.updateLeave(id, payload);
      await fetchLeaves();
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
      await fetchLeaves();
    } catch (err) {
      setError(err.message || 'ไม่สามารถลบคำขอลาได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchLeaves]);

  return {
    leaves,
    loading,
    saving,
    error,
    refreshLeaves: fetchLeaves,
    createLeave,
    updateLeave,
    deleteLeave
  };
}
