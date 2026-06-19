import { useCallback, useEffect, useRef, useState } from 'react';
import { auditLogService } from '../services/auditLogService.js';

function defaultFilters() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return {
    from_date: from.toISOString().slice(0, 10),
    to_date: to.toISOString().slice(0, 10)
  };
}

export function useAuditLogs() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lastFiltersRef = useRef(defaultFilters());

  const fetchAuditLogs = useCallback(async (filters = {}, { silent = false } = {}) => {
    lastFiltersRef.current = filters;
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await auditLogService.getAuditLogs(filters);
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      if (silent) {
        console.error('Audit log auto-refresh failed:', err);
      } else {
        setError(err.message || 'ไม่สามารถโหลดประวัติระบบได้');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs(defaultFilters());
  }, [fetchAuditLogs]);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    const tick = async () => {
      if (disposed || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        await fetchAuditLogs(lastFiltersRef.current, { silent: true });
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
  }, [fetchAuditLogs]);

  return {
    auditLogs,
    loading,
    error,
    refreshAuditLogs: fetchAuditLogs
  };
}
