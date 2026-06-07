import { useCallback, useEffect, useState } from 'react';
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

  const fetchAuditLogs = useCallback(async (filters = {}) => {
    setLoading(true);
    setError('');
    try {
      const data = await auditLogService.getAuditLogs(filters);
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'ไม่สามารถโหลดประวัติระบบได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs(defaultFilters());
  }, [fetchAuditLogs]);

  return {
    auditLogs,
    loading,
    error,
    refreshAuditLogs: fetchAuditLogs
  };
}
