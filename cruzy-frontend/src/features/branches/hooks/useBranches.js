import { useEffect, useMemo, useState } from 'react';
import { branchesApi } from '../services/branchesApi';

export const DAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
export const DAY_LABELS = { จ: 'จันทร์', อ: 'อังคาร', พ: 'พุธ', พฤ: 'พฤหัส', ศ: 'ศุกร์', ส: 'เสาร์', อา: 'อาทิตย์' };

export const EMPTY_BRANCH = {
  id: '',
  name: '',
  code: '',
  region_id: '',
  minWeekday: 1,
  minWeekend: 1,
  minSpecial: '',
  hours: { จ: '10:00', อ: '10:00', พ: '10:00', พฤ: '10:00', ศ: '10:00', ส: '10:00', อา: '10:00' },
  hoursEnd: { จ: '21:00', อ: '21:00', พ: '21:00', พฤ: '21:00', ศ: '21:00', ส: '21:00', อา: '21:00' },
  staffCount: 0
};

export const regionColor = {
  cnx: 'bg-sky-100 text-sky-700',
  bkk: 'bg-violet-100 text-violet-700',
  default: 'bg-slate-100 text-slate-700'
};

export function useBranches() {
  const [branches, setBranches] = useState([]);
  const [regions, setRegions] = useState([]);
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterRegion, setFilterRegion] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const push = (msg, type = 'ok') => {
    const id = Date.now();
    setToasts((items) => [...items, { id, msg, type }]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 2800);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [branchesRes, regionsRes] = await Promise.all([
        branchesApi.getBranches(),
        branchesApi.getRegions()
      ]);
      setBranches(Array.isArray(branchesRes) ? branchesRes : []);
      setRegions(Array.isArray(regionsRes) ? regionsRes : []);
    } catch (error) {
      console.error('Failed to load branches:', error);
      push('ไม่สามารถดึงข้อมูลได้', 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => branches.filter((branch) => {
    const matchRegion = filterRegion === 'all' || branch.region_id === filterRegion;
    const term = search.toLowerCase();
    const matchSearch = (branch.name || '').toLowerCase().includes(term) ||
      (branch.code || '').toLowerCase().includes(term);
    return matchRegion && matchSearch;
  }), [branches, filterRegion, search]);

  const stats = useMemo(() => [
    { label: 'สาขาทั้งหมด', value: branches.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'เชียงใหม่', value: branches.filter((b) => b.region_id === regions.find((r) => r.name === 'เชียงใหม่')?.id).length, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'กรุงเทพ', value: branches.filter((b) => b.region_id === regions.find((r) => r.name === 'กรุงเทพ')?.id).length, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'อื่น ๆ', value: branches.filter((b) => !regions.some((r) => r.id === b.region_id)).length, color: 'text-slate-600', bg: 'bg-slate-50' }
  ], [branches, regions]);

  const visibleRegions = filterRegion === 'all'
    ? regions
    : regions.filter((region) => region.id === filterRegion);

  async function handleSave(form) {
    try {
      const exists = form.id && branches.some((branch) => branch.id === form.id);
      const payload = { ...form };
      if (!exists) delete payload.id;

      if (exists) {
        await branchesApi.updateBranch(form.id, payload);
        push(`✅ อัปเดต ${form.code} สำเร็จ`);
      } else {
        await branchesApi.createBranch(payload);
        push(`✅ เพิ่มสาขา ${form.code} สำเร็จ`);
      }
      
      // Reload branches to ensure data consistency
      const branchesRes = await branchesApi.getBranches();
      setBranches(Array.isArray(branchesRes) ? branchesRes : []);
      setModal(null);
    } catch (error) {
      push(error.message || 'เกิดข้อผิดพลาด', 'err');
    }
  }

  async function handleDelete(id) {
    try {
      await branchesApi.deleteBranch(id);
      const branch = branches.find((item) => item.id === id);
      setBranches((current) => current.filter((item) => item.id !== id));
      setDeleteTarget(null);
      push(`🗑 ลบสาขา ${branch?.code} แล้ว`, 'err');
    } catch (error) {
      push(error.message || 'ไม่สามารถลบได้', 'err');
    }
  }

  return {
    branches,
    regions,
    filtered,
    stats,
    visibleRegions,
    modal,
    deleteTarget,
    filterRegion,
    search,
    loading,
    toasts,
    setModal,
    setDeleteTarget,
    setFilterRegion,
    setSearch,
    handleSave,
    handleDelete
  };
}
