import { useCallback, useEffect, useState } from 'react';
import { accessService } from '../services/accessService.js';

export function useAccess() {
  const [accessData, setAccessData] = useState({ users: [], branches: [], regions: [], employees: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAccessData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await accessService.getAccessData();
      setAccessData({
        users: Array.isArray(data.users) ? data.users : [],
        branches: Array.isArray(data.branches) ? data.branches : [],
        regions: Array.isArray(data.regions) ? data.regions : [],
        employees: Array.isArray(data.employees) ? data.employees : []
      });
    } catch (err) {
      setError(err.message || 'ไม่สามารถโหลดข้อมูลสิทธิ์ได้');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccessData();
  }, [fetchAccessData]);

  return {
    accessData,
    loading,
    error,
    refreshAccessData: fetchAccessData
  };
}
