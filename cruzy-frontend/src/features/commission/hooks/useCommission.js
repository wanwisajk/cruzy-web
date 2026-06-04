import { useCallback, useEffect, useState } from 'react';
import { commissionService } from '../services/commissionService.js';

export function useCommission(initialData, notify) {
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(false);
  const [statusMap, setStatusMap] = useState({});

  const refreshCommissionData = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await commissionService.fetchConsoleData();
      setData((prev) => ({ ...prev, ...(payload || {}) }));
      notify?.('โหลดข้อมูลคอนโซลสำเร็จ');
    } catch (err) {
      console.error(err);
      notify?.('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (!data) refreshCommissionData();
  }, [data, refreshCommissionData]);

  const markPaid = useCallback((empId) => {
    setStatusMap((current) => ({ ...current, [empId]: 'paid' }));
  }, []);

  return {
    data,
    loading,
    statusMap,
    setStatusMap,
    refreshCommissionData,
    markPaid
  };
}
