import { useCallback, useEffect, useState } from 'react';
import { alertService } from '../services/alertService.js';

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await alertService.getAlerts();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'ไม่สามารถโหลดแจ้งเตือนได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const createAlert = useCallback(async (payload) => {
    setSaving(true);
    setError('');
    try {
      await alertService.createAlert(payload);
      await fetchAlerts();
    } catch (err) {
      setError(err.message || 'ไม่สามารถสร้างแจ้งเตือนได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchAlerts]);

  const updateAlert = useCallback(async (id, payload) => {
    setSaving(true);
    setError('');
    try {
      await alertService.updateAlert(id, payload);
      await fetchAlerts();
    } catch (err) {
      setError(err.message || 'ไม่สามารถอัปเดตแจ้งเตือนได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchAlerts]);

  const deleteAlert = useCallback(async (id) => {
    setSaving(true);
    setError('');
    try {
      await alertService.deleteAlert(id);
      await fetchAlerts();
    } catch (err) {
      setError(err.message || 'ไม่สามารถลบแจ้งเตือนได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchAlerts]);

  return {
    alerts,
    loading,
    saving,
    error,
    refreshAlerts: fetchAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
    acknowledgeAlert: (id) => alertService.acknowledgeAlert(id)
  };
}
