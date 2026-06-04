import { useCallback, useEffect, useState } from 'react';
import { auditLogService } from '../services/auditLogService.js';

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
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return {
    auditLogs,
    loading,
    error,
    refreshAuditLogs: fetchAuditLogs
  };
}
