import { useCallback, useEffect, useState } from 'react';
import { alertService } from '../services/alertService.js';

export function useAlerts(filters = {}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAlerts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await alertService.getAlerts(filters);
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      if (silent) {
        console.error('Alert auto-refresh failed:', err);
      } else {
        setError(err.message || 'ไม่สามารถโหลดแจ้งเตือนได้');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters.from, filters.to]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    const tick = async () => {
      if (disposed || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        await fetchAlerts({ silent: true });
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
  }, [fetchAlerts]);

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
