import { useCallback, useEffect, useState } from 'react';
import { accessService } from '../services/accessService.js';

function normalizeInitialData(data = {}) {
  const regionRows = Array.isArray(data.regions)
    ? data.regions
    : Object.entries(data.regions || {}).map(([id, region]) => ({
        id,
        name: region.name,
        branches: region.branches || [],
      }));

  return {
    users: Array.isArray(data.users) ? data.users : [],
    branches: Array.isArray(data.branches) ? data.branches : [],
    regions: regionRows,
    employees: Array.isArray(data.employees) ? data.employees : []
  };
}

export function useAccess(initialData) {
  const initialAccessData = normalizeInitialData(initialData);
  const hasInitialUsers = initialAccessData.users.length > 0;
  const [accessData, setAccessData] = useState(() => initialAccessData);
  const [loading, setLoading] = useState(!hasInitialUsers);
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
    if (hasInitialUsers) {
      setAccessData(initialAccessData);
      setLoading(false);
      return;
    }
    fetchAccessData();
  }, [fetchAccessData, hasInitialUsers, initialData]);

  return {
    accessData,
    loading,
    error,
    refreshAccessData: fetchAccessData
  };
}
