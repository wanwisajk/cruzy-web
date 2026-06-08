import { useCallback, useEffect, useState } from 'react';
import { alertService } from '../services/alertService.js';

export function useAlerts(initialAlerts = []) {
  const hasInitialAlerts = Array.isArray(initialAlerts) && initialAlerts.length > 0;
  const [alerts, setAlerts] = useState(() => (hasInitialAlerts ? initialAlerts : []));
  const [loading, setLoading] = useState(!hasInitialAlerts);
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
    if (hasInitialAlerts) {
      setAlerts(initialAlerts);
      setLoading(false);
      return;
    }
    fetchAlerts();
  }, [fetchAlerts, hasInitialAlerts, initialAlerts]);

  const createAlert = useCallback(async (payload) => {
    setSaving(true);
    setError('');
    try {
      const result = await alertService.createAlert(payload);
      const created = result?.data || result;
      if (created?.id) {
        setAlerts((current) => [created, ...current]);
      } else {
        await fetchAlerts();
      }
      return created;
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
      const result = await alertService.updateAlert(id, payload);
      const updated = result?.data || result;
      if (updated?.id) {
        setAlerts((current) =>
          current.map((alert) => String(alert.id) === String(updated.id) ? { ...alert, ...updated } : alert),
        );
      } else {
        await fetchAlerts();
      }
      return updated;
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
      setAlerts((current) => current.filter((alert) => String(alert.id) !== String(id)));
    } catch (err) {
      setError(err.message || 'ไม่สามารถลบแจ้งเตือนได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchAlerts]);

  const acknowledgeAlert = useCallback(async (id) => {
    setSaving(true);
    setError('');
    try {
      const result = await alertService.acknowledgeAlert(id);
      const updated = result?.data || result;
      if (updated?.id) {
        setAlerts((current) =>
          current.map((alert) =>
            String(alert.id) === String(updated.id)
              ? { ...alert, ...updated, is_acknowledged: true }
              : alert,
          ),
        );
      } else {
        setAlerts((current) =>
          current.map((alert) =>
            String(alert.id) === String(id)
              ? { ...alert, is_acknowledged: true }
              : alert,
          ),
        );
      }
      return updated;
    } catch (err) {
      setError(err.message || 'ไม่สามารถรับทราบแจ้งเตือนได้');
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    alerts,
    loading,
    saving,
    error,
    refreshAlerts: fetchAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
    acknowledgeAlert
  };
}
