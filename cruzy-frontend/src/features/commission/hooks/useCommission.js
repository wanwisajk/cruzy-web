import { useCallback, useEffect, useState } from 'react';
import { commissionService } from '../services/commissionService.js';

export function useCommission(initialData, notify) {
  const [data, setData] = useState(initialData || null);
  const [loading, setLoading] = useState(false);

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

  return {
    data,
    loading,
    refreshCommissionData
  };
}
