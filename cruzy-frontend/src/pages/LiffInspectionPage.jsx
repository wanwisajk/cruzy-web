import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, Loader2, Store, UploadCloud, UserRound } from 'lucide-react';
import { api } from '../lib/api';
import { fmtDate } from '../lib/date';

const LIFF_SCRIPT_SRC = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
const GENERAL_PHOTO_KEYS = ['opening_general', 'closing_general'];

function makeStableKey(value, fallback) {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_-]+/gu, '');
  return cleaned || fallback;
}

function normalizeConfigList(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === 'string') return { key: makeStableKey(item, item), label: item };
      if (item && typeof item === 'object') {
        const label = item.label || item.name || item.title || item.text || item.key || '';
        return { ...item, key: item.key || item.id || makeStableKey(label, label), label };
      }
      return { key: String(item), label: String(item) };
    })
    .filter((item) => item.label);
}

function normalizeSectionItems(items = [], sectionKey = 'section', fallbackPrefix = 'item') {
  return normalizeConfigList(items).map((item, index) => ({
    ...item,
    key: item.key || makeStableKey(item.label, `${fallbackPrefix}_${index + 1}`),
    label: item.label,
    sectionKey,
    photoRequired: item.photoRequired !== false && item.photo_required !== false,
    minPhotos: Math.max(1, Number(item.minPhotos ?? item.min_photos ?? 1) || 1),
  }));
}

function normalizeInspectionSectionsFromChecklists(checklists = []) {
  if (!Array.isArray(checklists)) return [];
  const hasSectionShape = checklists.some((item) => item && typeof item === 'object' && Array.isArray(item.items));
  if (!hasSectionShape) {
    const items = normalizeSectionItems(checklists, 'general', 'check');
    return items.length ? [{ key: 'general', label: 'รายการตรวจ', items }] : [];
  }
  return checklists
    .map((section, sectionIndex) => {
      if (typeof section === 'string') {
        const key = makeStableKey(section, `section_${sectionIndex + 1}`);
        return { key, label: section, items: [] };
      }
      const label = section.label || section.name || section.title || section.key || `โซน ${sectionIndex + 1}`;
      const key = section.key || section.id || makeStableKey(label, `section_${sectionIndex + 1}`);
      return {
        ...section,
        key,
        label,
        items: normalizeSectionItems(section.items || [], key, `${key}_item`),
      };
    })
    .filter((section) => section.label);
}

function buildInspectionSections(setting = {}) {
  const sections = normalizeInspectionSectionsFromChecklists(setting.checklists || []);
  const productItems = normalizeSectionItems(setting.required_products || [], 'required_products', 'product');
  if (productItems.length) {
    sections.push({ key: 'required_products', label: 'สินค้าที่ต้องตรวจ', items: productItems });
  }
  const requiredPhotoItems = normalizeSectionItems(
    (setting.required_photos || []).filter((item) => {
      const key = item?.key || item?.id || item?.source;
      return !GENERAL_PHOTO_KEYS.includes(String(key || ''));
    }),
    'required_photos',
    'photo'
  );
  if (!sections.length && requiredPhotoItems.length) {
    sections.push({ key: 'required_photos', label: 'รูปที่ต้องถ่าย', items: requiredPhotoItems });
  }
  if (!sections.length) {
    return [{
      key: 'inspection_general',
      label: 'ตรวจร้าน',
      items: normalizeSectionItems(['รูปตรวจร้านทั่วไป'], 'inspection_general', 'general'),
    }];
  }
  return sections.filter((section) => section.items?.length);
}

function flattenSections(sections = []) {
  return sections.flatMap((section) => (section.items || []).map((item) => ({
    ...item,
    sectionKey: section.key,
    sectionLabel: section.label,
    itemKey: item.key,
  })));
}

function fileToImageEntry(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      fileUrl: reader.result,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function filesToImageEntries(fileList) {
  const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
  return Promise.all(files.map(fileToImageEntry));
}

function loadLiffScript() {
  if (window.liff) return Promise.resolve();
  if (document.querySelector(`script[src="${LIFF_SCRIPT_SRC}"]`)) {
    return new Promise((resolve, reject) => {
      const timer = window.setInterval(() => {
        if (window.liff) {
          window.clearInterval(timer);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(timer);
        reject(new Error('ไม่สามารถโหลด LIFF SDK ได้'));
      }, 8000);
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = LIFF_SCRIPT_SRC;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('ไม่สามารถโหลด LIFF SDK ได้'));
    document.head.appendChild(script);
  });
}

async function initLiffProfile() {
  const liffId = import.meta.env.VITE_LIFF_INSPECTION_ID || import.meta.env.VITE_LIFF_ID;
  if (!liffId) return null;
  await loadLiffScript();
  await window.liff.init({ liffId });
  if (!window.liff.isLoggedIn()) {
    window.liff.login();
    return { pendingLogin: true };
  }
  return window.liff.getProfile();
}

function today() {
  return fmtDate(new Date());
}

export default function LiffInspectionPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const lockedBranchId = query.get('branchId') || query.get('branch') || '';
  const lockedEmployeeId = query.get('employeeId') || query.get('employee') || '';
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [settings, setSettings] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(() => ({
    branchId: lockedBranchId,
    employeeId: lockedEmployeeId,
    workDate: query.get('date') || today(),
  }));
  const [itemImages, setItemImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let alive = true;
    async function loadPage() {
      setLoading(true);
      setError('');
      try {
        const [liffProfile, dashboardData] = await Promise.all([
          initLiffProfile().catch(() => null),
          api.getInspectionDashboard({ from: form.workDate, to: form.workDate }),
        ]);
        if (!alive) return;
        if (liffProfile?.pendingLogin) return;
        setProfile(liffProfile);
        const nextEmployees = dashboardData.employees || [];
        setBranches(dashboardData.branches || []);
        setEmployees(nextEmployees);
        setSettings(dashboardData.inspectionSettings || []);
        setInspections(dashboardData.storeInspections || []);
        if (!lockedEmployeeId && !form.employeeId && liffProfile?.userId) {
          const matchedEmployee = nextEmployees.find((employee) => employee.line_user_id === liffProfile.userId);
          if (matchedEmployee) {
            setForm((current) => ({ ...current, employeeId: String(matchedEmployee.id) }));
          }
        }
      } catch (err) {
        if (alive) setError(err.message || 'ไม่สามารถโหลดหน้าตรวจร้านได้');
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadPage();
    return () => {
      alive = false;
    };
  }, []);

  const selectedBranch = branches.find((branch) => String(branch.id) === String(form.branchId));
  const selectedEmployee = employees.find((employee) => String(employee.id) === String(form.employeeId));
  const selectedSetting = settings.find((setting) => String(setting.branch_id) === String(form.branchId)) || {};
  const openingInspection = inspections.find((inspection) => {
    const items = inspection.inspection_items && typeof inspection.inspection_items === 'object' ? inspection.inspection_items : {};
    return String(inspection.branch_id) === String(form.branchId)
      && inspection.work_date === form.workDate
      && items.open_shop;
  });
  const sections = useMemo(() => buildInspectionSections(selectedSetting), [selectedSetting]);
  const items = useMemo(() => flattenSections(sections), [sections]);
  const totalRequired = items.reduce((sum, item) => sum + Math.max(1, Number(item.minPhotos || 1)), 0);
  const totalSelected = items.reduce((sum, item) => sum + (itemImages[`${item.sectionKey}:${item.itemKey}`]?.length || 0), 0);
  const isComplete = totalRequired > 0 && totalSelected >= totalRequired;

  async function addImages(item, fileList) {
    const images = await filesToImageEntries(fileList);
    if (!images.length) return;
    const key = `${item.sectionKey}:${item.itemKey}`;
    setItemImages((current) => ({
      ...current,
      [key]: [...(current[key] || []), ...images],
    }));
    setSuccess(null);
  }

  function removeImage(item, index) {
    const key = `${item.sectionKey}:${item.itemKey}`;
    setItemImages((current) => ({
      ...current,
      [key]: (current[key] || []).filter((_, imageIndex) => imageIndex !== index),
    }));
  }

  async function submitInspection() {
    setError('');
    setSuccess(null);
    if (!form.branchId) {
      setError('ไม่พบสาขา กรุณาเปิดจากปุ่มตรวจร้านใน LINE');
      return;
    }
    if (!form.employeeId) {
      setError('ไม่พบพนักงานผู้ตรวจ กรุณาเปิดจากปุ่มใน LINE หรือผูก LINE กับพนักงานก่อน');
      return;
    }
    if (!openingInspection) {
      setError('ยังไม่มีรายการเปิดร้านของสาขาและวันที่นี้ กรุณาเปิดร้านก่อนเริ่มตรวจร้าน');
      return;
    }
    const missingItem = items.find((item) => {
      const key = `${item.sectionKey}:${item.itemKey}`;
      return (itemImages[key]?.length || 0) < Math.max(1, Number(item.minPhotos || 1));
    });
    if (missingItem) {
      setError(`กรุณาเพิ่มรูปให้ครบ: ${missingItem.sectionLabel} / ${missingItem.label}`);
      return;
    }

    setSaving(true);
    try {
      const inspectionItems = items.map((item) => {
        const key = `${item.sectionKey}:${item.itemKey}`;
        return {
          key: item.itemKey,
          itemKey: item.itemKey,
          sectionKey: item.sectionKey,
          sectionLabel: item.sectionLabel,
          label: item.label,
          status: 'submitted',
          minPhotos: Math.max(1, Number(item.minPhotos || 1)),
          photoCount: itemImages[key]?.length || 0,
        };
      });
      const existingItems = openingInspection.inspection_items && typeof openingInspection.inspection_items === 'object'
        ? openingInspection.inspection_items
        : {};
      const nextInspectionItems = inspectionItems.reduce((map, item) => ({
        ...map,
        [`${item.sectionKey}:${item.itemKey}`]: item,
      }), {
        ...existingItems,
        inspected_shop: true,
        inspection_source: 'liff',
        inspection_photo_count: totalSelected,
        submitted_by_name: selectedEmployee?.nickname || selectedEmployee?.name || profile?.displayName || null,
      });
      const submitTime = new Date().toTimeString().slice(0, 5);

      const updatedResult = await api.updateInspection(openingInspection.id, {
        submit_time: submitTime,
        submitted_by: form.employeeId || null,
        status: 'pending',
        inspection_items: nextInspectionItems,
        photo_count: Number(openingInspection.photo_count || 0) + totalSelected,
      });
      const updated = updatedResult?.data || updatedResult;
      const attachments = items.flatMap((item) => {
        const key = `${item.sectionKey}:${item.itemKey}`;
        return (itemImages[key] || []).map((image, index) => ({
          entityType: 'store_inspection',
          entityId: openingInspection.id,
          fileUrl: image.fileUrl,
          fileName: image.fileName,
          fileType: image.fileType,
          fileSize: image.fileSize,
          metadata: {
            source: 'liff_inspection',
            sectionKey: item.sectionKey,
            sectionLabel: item.sectionLabel,
            itemKey: item.itemKey,
            itemLabel: item.label,
            photoIndex: index + 1,
            lineUserId: profile?.userId || null,
            lineDisplayName: profile?.displayName || null,
          },
        }));
      });
      if (attachments.length) {
        await api.createAttachments(attachments);
      }
      await api.createInspectionLog({
        inspection_id: openingInspection.id,
        user_name: profile?.displayName || form.employeeId || 'LIFF',
        action: 'create',
        description: 'บันทึกรูปตรวจร้านจาก LIFF',
        source: 'liff',
      });
      setSuccess({
        id: updated?.id || openingInspection.id,
        branch: selectedBranch?.name || selectedBranch?.code || form.branchId,
        count: attachments.length,
      });
      setInspections((current) => current.map((inspection) => (
        String(inspection.id) === String(openingInspection.id)
          ? { ...inspection, ...updated, inspection_items: nextInspectionItems }
          : inspection
      )));
      setItemImages({});
    } catch (err) {
      setError(err.message || 'ไม่สามารถบันทึกตรวจร้านได้');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-700">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <Loader2 className="mb-3 animate-spin text-cruzy" size={28} />
          <div className="body-strong">กำลังโหลดหน้าตรวจร้าน</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900">
      <div className="mx-auto grid max-w-2xl gap-4">
        <div className="rounded-2xl bg-cruzy p-5 text-white shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-white/15">
              <Store size={22} />
            </span>
            <div className="min-w-0">
              <div className="heading-3">ตรวจร้าน</div>
              <div className="mt-1 body-text text-white/80">อัปโหลดรูปตามหัวข้อที่ตั้งค่าไว้</div>
            </div>
          </div>
          {profile?.displayName ? (
            <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 caption">
              <UserRound size={14} />
              <span className="truncate">{profile.displayName}</span>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 body-text text-red-700">
            <AlertCircle size={18} className="mt-0.5 flex-none" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
            <div className="flex items-center gap-2 body-strong">
              <CheckCircle2 size={18} /> ส่งรูปตรวจร้านแล้ว
            </div>
            <div className="mt-1 caption">เลขที่ #{success.id} · {success.branch} · {success.count} รูป</div>
          </div>
        ) : null}

        {form.branchId ? (
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="body-strong">หัวข้อตรวจร้าน</div>
                <div className="caption text-slate-500">{totalSelected}/{totalRequired} รูปที่ต้องมี</div>
              </div>
              <span className={`rounded-full px-3 py-1 caption-bold ${isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                {isComplete ? 'ครบแล้ว' : 'ยังไม่ครบ'}
              </span>
            </div>
            {sections.map((section) => (
              <div key={section.key} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="mb-3 body-strong">{section.label}</div>
                <div className="grid gap-3">
                  {section.items.map((item) => {
                    const itemWithSection = { ...item, sectionKey: section.key, sectionLabel: section.label, itemKey: item.key };
                    const key = `${section.key}:${item.key}`;
                    const images = itemImages[key] || [];
                    const required = Math.max(1, Number(item.minPhotos || 1));
                    return (
                      <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="body-strong text-slate-900">{item.label}</div>
                            <div className="caption text-slate-500">ต้องมีอย่างน้อย {required} รูป</div>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 caption-bold ${images.length >= required ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {images.length}/{required}
                          </span>
                        </div>
                        {images.length ? (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {images.map((image, index) => (
                              <div key={`${image.fileName}_${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <img src={image.fileUrl} alt={image.fileName || item.label} className="h-full w-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removeImage(itemWithSection, index)}
                                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 caption-bold text-white"
                                  aria-label="ลบรูป"
                                >
                                  ลบ
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <label className="btn btn-secondary w-full cursor-pointer">
                            <Camera size={16} /> ถ่ายรูป
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                addImages(itemWithSection, event.target.files);
                                event.target.value = '';
                              }}
                            />
                          </label>
                          <label className="btn btn-secondary w-full cursor-pointer">
                            <UploadCloud size={16} /> เลือกรูป
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                addImages(itemWithSection, event.target.files);
                                event.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center body-text text-slate-500">
            ไม่พบสาขา กรุณาเปิดหน้านี้จากปุ่มตรวจร้านใน LINE
          </div>
        )}

        <button
          type="button"
          className="btn btn-primary sticky bottom-4 min-h-12 w-full shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving || !form.branchId || !isComplete}
          onClick={submitInspection}
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <UploadCloud size={18} />}
          {saving ? 'กำลังส่งรูป...' : 'ส่งตรวจร้าน'}
        </button>
      </div>
    </div>
  );
}
