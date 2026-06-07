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

const normalizeId = (value) => String(value ?? '');
const normalizeName = (value) => String(value ?? '').trim();

function buildRegionsFromBranches(branches, fallbackRegions = []) {
  const fallbackMap = new Map(fallbackRegions.map((region) => [normalizeId(region.id), region.name]));
  const regionsMap = new Map();

  branches.forEach((branch) => {
    const regionId = normalizeId(branch.region_id);
    if (!regionId) return;
    const regionName = normalizeName(branch.region_name || fallbackMap.get(regionId));
    if (!regionName) return;
    regionsMap.set(regionId, { id: branch.region_id, name: regionName });
  });

  return Array.from(regionsMap.values()).sort((left, right) => left.name.localeCompare(right.name, 'th'));
}

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

  const loadBranches = async () => {
    const branchesRes = await branchesApi.getBranches();
    setBranches(Array.isArray(branchesRes) ? branchesRes : []);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const branchesRes = await branchesApi.getBranches();
      setBranches(Array.isArray(branchesRes) ? branchesRes : []);
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
    const matchRegion = filterRegion === 'all' || normalizeId(branch.region_id) === normalizeId(filterRegion);
    const term = search.toLowerCase();
    const matchSearch = (branch.name || '').toLowerCase().includes(term) ||
      (branch.code || '').toLowerCase().includes(term);
    return matchRegion && matchSearch;
  }), [branches, filterRegion, search]);

  const branchRegions = useMemo(
    () => buildRegionsFromBranches(branches, regions),
    [branches, regions]
  );

  const stats = useMemo(() => [
    { label: 'สาขาทั้งหมด', value: branches.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'เชียงใหม่', value: branches.filter((branch) => normalizeName(branch.region_name) === 'เชียงใหม่').length, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'กรุงเทพ', value: branches.filter((branch) => normalizeName(branch.region_name) === 'กรุงเทพ').length, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'อื่น ๆ', value: branches.filter((branch) => {
      const regionName = normalizeName(branch.region_name);
      return Boolean(regionName) && regionName !== 'เชียงใหม่' && regionName !== 'กรุงเทพ';
    }).length, color: 'text-slate-600', bg: 'bg-slate-50' }
  ], [branches]);

  const branchRegionIds = useMemo(
    () => new Set(branches.map((branch) => normalizeId(branch.region_id)).filter(Boolean)),
    [branches]
  );

  const visibleRegions = filterRegion === 'all'
    ? branchRegions
    : branchRegions.filter((region) => normalizeId(region.id) === normalizeId(filterRegion));

  useEffect(() => {
    if (filterRegion === 'all') return;
    if (!branchRegionIds.has(normalizeId(filterRegion))) setFilterRegion('all');
  }, [branchRegionIds, filterRegion]);

  async function ensureRegionsLoaded() {
    if (regions.length) return regions;
    const regionsRes = await branchesApi.getRegions();
    const nextRegions = Array.isArray(regionsRes) ? regionsRes : [];
    setRegions(nextRegions);
    return nextRegions;
  }

  async function openCreateModal() {
    try {
      if (!branchRegions.length) {
        await ensureRegionsLoaded();
      }
      setModal('add');
    } catch (error) {
      push(error.message || 'ไม่สามารถดึงข้อมูลจังหวัดได้', 'err');
    }
  }

  const getModalRegions = (branch) => {
    if (!branch) return branchRegions.length ? branchRegions : regions;
    const hasCurrentRegion = branchRegions.some((region) => normalizeId(region.id) === normalizeId(branch.region_id));
    return hasCurrentRegion
      ? branchRegions
      : buildRegionsFromBranches([branch], regions);
  };

  async function handleSave(form) {
    try {
      const exists = form.id && branches.some((branch) => branch.id === form.id);
      const payload = { ...form };
      if (!exists) delete payload.id;

      const response = exists
        ? await branchesApi.updateBranch(form.id, payload)
        : await branchesApi.createBranch(payload);
      const savedBranch = response?.data;

      if (exists) {
        if (savedBranch) {
          setBranches((current) => current.map((branch) => normalizeId(branch.id) === normalizeId(form.id) ? savedBranch : branch));
        } else {
          await loadBranches();
        }
        push(`✅ อัปเดต ${form.code} สำเร็จ`);
      } else {
        if (savedBranch) {
          setBranches((current) => [...current, savedBranch]);
        } else {
          await loadBranches();
        }
        push(`✅ เพิ่มสาขา ${form.code} สำเร็จ`);
      }

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
    branchRegions,
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
    openCreateModal,
    getModalRegions,
    handleSave,
    handleDelete
  };
}
