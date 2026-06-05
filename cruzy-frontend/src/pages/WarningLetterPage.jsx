import { useState, useMemo } from 'react';
import { FileText, Plus } from 'lucide-react';
import { Badge } from '../components/ui/Badge.jsx';
import { thaiShortDate } from '../lib/date.js';
import { useWarningLetters } from '../features/warningLetters/hooks/useWarningLetters.js';

const TEMPLATES = [
  {
    id: 't1', level: 'verbal', levelLabel: 'ตักเตือนด้วยวาจา',
    name: 'ตักเตือนด้วยวาจา',
    desc: 'สำหรับความผิดครั้งแรก เช่น มาสาย ลืม check-in',
    body: `เรียน {ชื่อพนักงาน}

ตามที่ท่านได้ {รายละเอียดความผิด} เมื่อวันที่ {วันที่เกิดเหตุ}

ทางบริษัทจึงขอตักเตือนด้วยวาจา ขอให้ท่านปรับปรุงพฤติกรรมดังกล่าว หากเกิดขึ้นซ้ำอีกจะพิจารณาออกหนังสือเตือนเป็นลายลักษณ์อักษร

สาขา: {สาขา}
วันที่ออกหนังสือ: {วันที่ออก}`,
  },
  {
    id: 't2', level: 'written', levelLabel: 'หนังสือเตือนครั้งที่ 1',
    name: 'หนังสือเตือนครั้งที่ 1',
    desc: 'สำหรับความผิดซ้ำ หรือความผิดที่ร้ายแรงกว่า',
    body: `เรียน {ชื่อพนักงาน}

ตามที่ท่านได้ {รายละเอียดความผิด} เมื่อวันที่ {วันที่เกิดเหตุ}

ซึ่งเป็นการกระทำผิดระเบียบของบริษัท ทางบริษัทจึงขอออกหนังสือเตือนฉบับนี้ เพื่อให้ท่านปรับปรุงแก้ไขพฤติกรรมดังกล่าวโดยทันที

หากท่านกระทำผิดซ้ำอีก บริษัทจะพิจารณาลงโทษทางวินัยขั้นร้ายแรงต่อไป

สาขา: {สาขา}
วันที่ออกหนังสือ: {วันที่ออก}`,
  },
  {
    id: 't3', level: 'written', levelLabel: 'หนังสือเตือนครั้งที่ 2',
    name: 'หนังสือเตือนครั้งที่ 2',
    desc: 'สำหรับความผิดซ้ำครั้งที่ 2',
    body: `เรียน {ชื่อพนักงาน}

ตามที่ท่านได้รับหนังสือเตือนครั้งที่ 1 ไปแล้ว แต่ท่านยังคง {รายละเอียดความผิด} อีกเมื่อวันที่ {วันที่เกิดเหตุ}

ทางบริษัทจึงขอออกหนังสือเตือนครั้งที่ 2 นี้ เป็นครั้งสุดท้าย หากท่านยังกระทำผิดซ้ำ บริษัทมีสิทธิ์เลิกจ้างโดยไม่จ่ายค่าชดเชย ตามมาตรา 119 แห่ง พ.ร.บ.คุ้มครองแรงงาน

สาขา: {สาขา}
วันที่ออกหนังสือ: {วันที่ออก}`,
  },
  {
    id: 't4', level: 'final', levelLabel: 'หนังสือเลิกจ้าง',
    name: 'หนังสือเลิกจ้าง',
    desc: 'สำหรับกรณีร้ายแรง หรือหลังเตือน 2 ครั้งแล้ว',
    body: `เรียน {ชื่อพนักงาน}

ตามที่ท่านได้รับหนังสือเตือนจำนวน 2 ครั้ง แต่ท่านยังไม่ปรับปรุงพฤติกรรม

ทางบริษัทจึงมีความจำเป็นต้องเลิกจ้างท่าน มีผลตั้งแต่วันที่ {วันที่ออก}

เนื่องจากเป็นการเลิกจ้างเพราะกระทำผิดซ้ำ ตามมาตรา 119 แห่ง พ.ร.บ.คุ้มครองแรงงาน บริษัทจึงไม่ต้องจ่ายค่าชดเชย

สาขา: {สาขา}`,
  },
];

const levelConfig = {
  verbal: { label: 'ตักเตือนด้วยวาจา', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-400' },
  written: { label: 'หนังสือเตือน', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
  final: { label: 'เลิกจ้าง', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-400', dot: 'bg-rose-600' },
};

function Avatar({ emp, size = 8 }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-medium text-xs shrink-0`}
      style={{ background: emp?.color || '#888', width: size * 4, height: size * 4, fontSize: size * 1.5 }}
    >
      {emp?.name?.[0] || '?'}
    </div>
  );
}

function LevelBadge({ level }) {
  const cfg = levelConfig[level] || levelConfig.verbal;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ signedByEmp, status }) {
  if (status === 'draft') return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500 border border-gray-200">แบบร่าง</span>;
  if (signedByEmp) return <span className="px-2 py-0.5 rounded text-xs bg-green-50 text-green-700 border border-green-200">เซ็นแล้ว</span>;
  return <span className="px-2 py-0.5 rounded text-xs bg-yellow-50 text-yellow-700 border border-yellow-200">รอเซ็น</span>;
}

function templateIdFromValue(value) {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function templateValueFromId(value) {
  if (!value) return '';
  const text = String(value);
  return text.startsWith('t') ? text : `t${text}`;
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] font-semibold text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-800 break-words">{value || '-'}</div>
    </div>
  );
}

function PreviewModal({ letter, employees, branches, onClose, onEdit, onDelete }) {
  if (!letter) return null;
  
  const emp = employees.find(e => e.id === letter.employee_id);
  const branch = branches.find((item) => String(item.id) === String(letter.branch_id));
  const tpl = TEMPLATES.find(t => t.id === templateValueFromId(letter.template_id)) || TEMPLATES.find(t => t.level === letter.level);
  if (!emp || !tpl) return null;

  const body = tpl.body
    .replace(/\{ชื่อพนักงาน\}/g, `${emp.name} (${emp.id})`)
    .replace(/\{สาขา\}/g, branch ? `${branch.code} - ${branch.name}` : 'ทั้งบริษัท')
    .replace(/\{วันที่ออก\}/g, thaiShortDate(letter.issue_date))
    .replace(/\{วันที่เกิดเหตุ\}/g, thaiShortDate(letter.issue_date))
    .replace(/\{รายละเอียดความผิด\}/g, letter.reason);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.45)' }}>
      <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 bg-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar emp={emp} size={8} />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900 text-base">รายละเอียดหนังสือเตือน</p>
                <Badge tone={letter.status === 'issued' ? 'green' : 'blue'}>{letter.status || 'issued'}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{emp.name} · {emp.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LevelBadge level={letter.level} />
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-132px)] overflow-y-auto bg-slate-50/70 p-5">
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="space-y-4">
              <div className="card rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">ข้อมูลทั้งหมด</div>
                <div className="mt-3 grid gap-2">
                  <DetailItem label="พนักงาน" value={`${emp.name} (${emp.id})`} />
                  <DetailItem label="ตำแหน่ง" value={emp.position} />
                  <DetailItem label="สาขา" value={branch ? `${branch.code} - ${branch.name}` : 'ทั้งบริษัท'} />
                  <DetailItem label="ประเภทหนังสือ" value={tpl.name} />
                  <DetailItem label="วันที่ออก" value={thaiShortDate(letter.issue_date)} />
                  <DetailItem label="ผู้ออกหนังสือ" value={letter.issued_by} />
                  <DetailItem label="สถานะการเซ็น" value={letter.is_signed_by_emp ? 'เซ็นแล้ว' : 'ยังไม่เซ็น'} />
                  <DetailItem label="วันที่เซ็น" value={letter.signed_at ? thaiShortDate(String(letter.signed_at).slice(0, 10)) : '-'} />
                </div>
              </div>

              <div className="card rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">สาเหตุ</div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{letter.reason || '-'}</p>
              </div>
            </div>

            <div className="card rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">{tpl.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">ตัวอย่างเนื้อหาหนังสือจากข้อมูลล่าสุด</div>
                </div>
                <StatusBadge signedByEmp={letter.is_signed_by_emp} status={letter.status} />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 font-serif text-sm leading-7 text-slate-800 whitespace-pre-wrap">
                {body}
              </div>

              <div className="grid gap-4 sm:grid-cols-3 mt-6 pt-4 border-t border-dashed border-slate-200">
                {['ผู้ออกหนังสือ (นายจ้าง)', `ผู้รับหนังสือ (${emp.name})`, 'พยาน'].map(label => (
                  <div key={label} className="text-center">
                    <div className="h-10 border-b border-dashed border-slate-300 mb-1"></div>
                    <p className="text-xs text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white px-5 py-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => onEdit(letter)} className="btn btn-primary">
            แก้ไข
          </button>
          <button type="button" onClick={() => onDelete(letter)} className="rounded-lg border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
            ลบ
          </button>
          <button onClick={onClose} className="btn btn-ghost">
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

function LetterCard({ letter, employees, onPreview, onEdit, onDelete }) {
  const emp = employees.find(e => e.id === letter.employee_id);
  const cfg = levelConfig[letter.level] || levelConfig.verbal;
  return (
    <div
      key={letter.id}
      onClick={() => onPreview(letter)}
      className={`bg-white rounded-xl border-l-4 ${cfg.border} border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-all group`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar emp={emp} size={9} />
          <div>
            <p className="font-semibold text-gray-900 text-sm">{emp?.name}</p>
            <p className="text-xs text-gray-400">{emp?.id}</p>
          </div>
        </div>
        <LevelBadge level={letter.level} />
      </div>

      <div className="space-y-1.5 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>สาเหตุ</span>
          <span className="text-gray-700 font-medium">{letter.reason}</span>
        </div>
        <div className="flex justify-between">
          <span>วันที่</span>
          <span className="text-gray-700">{thaiShortDate(letter.issue_date)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>สถานะ</span>
          <StatusBadge signedByEmp={letter.is_signed_by_emp} status={letter.status} />
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(letter);
            }}
            className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold"
          >
            แก้ไข
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(letter);
            }}
            className="px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-bold"
          >
            ลบ
          </button>
        </div>
        <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">คลิกเพื่อดูรายละเอียด →</span>
      </div>
    </div>
  );
}

export default function WarningLetterPage({ data, user }) {
  const { warningLetters, loading, saving, error, createWarningLetter, updateWarningLetter, deleteWarningLetter } = useWarningLetters();
  const [tab, setTab] = useState('issued');
  const [previewLetter, setPreviewLetter] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stepCreating, setStepCreating] = useState(0); // 0: choose emp, 1: choose template
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedTpl, setSelectedTpl] = useState('');
  const [formData, setFormData] = useState({ reason: '', issue_date: new Date().toISOString().split('T')[0], branch_id: '' });
  const [editingLetter, setEditingLetter] = useState(null);

  const employees = data?.employees ?? [];
  const branches = data?.branches ?? [];

  const issuer = user?.username || user?.name || user?.id || 'system';

  const resetForm = () => {
    setStepCreating(0);
    setSelectedEmp('');
    setSelectedTpl('');
    setEditingLetter(null);
    setFormData({ reason: '', issue_date: new Date().toISOString().split('T')[0], branch_id: '' });
  };

  const handleSaveLetter = async () => {
    if (!selectedEmp || !selectedTpl) return;
    const template = TEMPLATES.find(t => t.id === selectedTpl);
    const payload = {
      employee_id: selectedEmp,
      template_id: templateIdFromValue(selectedTpl),
      level: template?.level || 'verbal',
      issue_date: formData.issue_date,
      reason: formData.reason,
      branch_id: formData.branch_id && formData.branch_id !== '' ? parseInt(formData.branch_id, 10) : null,
      issued_by: issuer,
      status: 'issued'
    };
    if (editingLetter) {
      await updateWarningLetter(editingLetter.id, payload);
    } else {
      await createWarningLetter(payload);
    }
    resetForm();
    setTab('issued');
  };

  const startEditLetter = (letter) => {
    setEditingLetter(letter);
    setSelectedEmp(letter.employee_id || '');
    setSelectedTpl(templateValueFromId(letter.template_id) || TEMPLATES.find((tpl) => tpl.level === letter.level)?.id || '');
    setFormData({
      reason: letter.reason || '',
      issue_date: letter.issue_date || new Date().toISOString().split('T')[0],
      branch_id: letter.branch_id ? String(letter.branch_id) : ''
    });
    setStepCreating(1);
    setTab('create');
  };

  const handleDeleteLetter = async (letter) => {
    if (!window.confirm(`ลบหนังสือเตือนของ ${employees.find((emp) => emp.id === letter.employee_id)?.name || letter.employee_id} ใช่ไหม?`)) return;
    await deleteWarningLetter(letter.id);
  };

  const currentTemplate = TEMPLATES.find(t => t.id === selectedTpl);
  const previewEmp = employees.find(e => e.id === selectedEmp);
  const selectedEmployeeWarningLetters = useMemo(() => {
    if (!selectedEmp) return [];
    return warningLetters
      .filter((letter) => letter.employee_id === selectedEmp)
      .sort((a, b) => String(b.issue_date || '').localeCompare(String(a.issue_date || '')));
  }, [warningLetters, selectedEmp]);
  const selectedEmployeeHasWarning = selectedEmployeeWarningLetters.length > 0;
  const previewBody = currentTemplate && previewEmp ? currentTemplate.body
    .replace(/\{ชื่อพนักงาน\}/g, `${previewEmp.name} (${previewEmp.id})`)
    .replace(/\{สาขา\}/g, branches.find((branch) => String(branch.id) === String(formData.branch_id))?.name || 'ทั้งบริษัท')
    .replace(/\{วันที่ออก\}/g, thaiShortDate(formData.issue_date))
    .replace(/\{วันที่เกิดเหตุ\}/g, thaiShortDate(formData.issue_date))
    .replace(/\{รายละเอียดความผิด\}/g, formData.reason) : '';

  const stats = useMemo(() => ({
    total: warningLetters.length,
    verbal: warningLetters.filter(l => l.level === 'verbal').length,
    written: warningLetters.filter(l => l.level === 'written').length,
    unsigned: warningLetters.filter(l => !l.is_signed_by_emp).length
  }), [warningLetters]);

  const filteredLetters = useMemo(() => {
    return warningLetters
      .filter(letter => {
        if (tab === 'issued') return true;
        if (tab === 'create') return false;
        return true;
      })
      .filter(letter => {
        if (!searchTerm) return true;
        const emp = employees.find(e => e.id === letter.employee_id);
        return (emp?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
               (letter.reason || '').toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [warningLetters, tab, searchTerm, employees]);

  return (
    <div className="max-w-7xl  p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText size={24} />
          หนังสือเตือน
        </h1>
        <p className="text-sm text-gray-500">จัดการหนังสือเตือน สร้างหนังสือใหม่ และดูเทมเพลต</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'ทั้งหมด', value: stats.total, icon: '📄' },
          { label: 'ตักเตือนวาจา', value: stats.verbal, icon: '💬' },
          { label: 'หนังสือเตือน', value: stats.written, icon: '⚠️' },
          { label: 'รอเซ็น', value: stats.unsigned, icon: '✍️' }
        ].map(s => (
          <div key={s.label} className="rounded-lg bg-white border border-gray-100 p-3 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
            <div className="text-lg font-bold text-gray-900 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-lg bg-white border border-gray-100 p-1">
        {[
          { id: 'issued', label: 'หนังสือที่ออก' },
          { id: 'templates', label: 'เทมเพลต' },
          { id: 'create', label: 'ออกหนังสือใหม่' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); resetForm(); }}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              tab === t.id 
                ? 'bg-gray-900 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {/* Tab: หนังสือที่ออก */}
      {tab === 'issued' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2">
            <span className="text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="ค้นหา พนักงาน หรือ สาเหตุ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>)}
            </div>
          ) : filteredLetters.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredLetters.map(letter => (
                <LetterCard
                  key={letter.id}
                  letter={letter}
                  employees={employees}
                  onPreview={setPreviewLetter}
                  onEdit={startEditLetter}
                  onDelete={handleDeleteLetter}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>ไม่พบหนังสือเตือน</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: เทมเพลต */}
      {tab === 'templates' && (
        <div className="grid gap-3 md:grid-cols-2">
          {TEMPLATES.map(tpl => (
            <div key={tpl.id} className={`rounded-lg border p-4 bg-white cursor-pointer hover:shadow-md transition-all ${
              levelConfig[tpl.level]?.border
            } border-l-4`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{tpl.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{tpl.desc}</p>
                </div>
                <LevelBadge level={tpl.level} />
              </div>
              <div className="text-xs text-gray-600 mt-3 p-3 bg-gray-50 rounded border border-gray-100 line-clamp-2">
                {tpl.body}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: ออกหนังสือใหม่ */}
      {tab === 'create' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form Panel */}
          <div className="card rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{editingLetter ? 'แก้ไขหนังสือเตือน' : 'ออกหนังสือเตือนใหม่'}</h3>
                <p className="mt-1 text-xs text-slate-500">เลือกพนักงานก่อน แล้วระบบจะแสดงประวัติเตือนก่อนเลือกเทมเพลต</p>
              </div>
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
                <span className={`rounded-lg px-2.5 py-1 ${stepCreating === 0 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>1 พนักงาน</span>
                <span className={`rounded-lg px-2.5 py-1 ${stepCreating === 1 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>2 เทมเพลต</span>
              </div>
            </div>

            {stepCreating === 0 ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-bold text-slate-900 block mb-1.5">เลือกพนักงาน</span>
                  <select
                    value={selectedEmp}
                    onChange={(e) => setSelectedEmp(e.target.value)}
                    className="input"
                  >
                    <option value="">-- เลือก --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                    ))}
                  </select>
                </label>

                {previewEmp ? (
                  <div className={`rounded-2xl border p-4 ${selectedEmployeeHasWarning ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar emp={previewEmp} size={10} />
                        <div>
                          <div className="text-sm font-bold text-slate-900">{previewEmp.name}</div>
                          <div className="text-xs text-slate-500">{previewEmp.id} · {previewEmp.position || 'พนักงาน'}</div>
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${selectedEmployeeHasWarning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {selectedEmployeeHasWarning ? `เคยโดนเตือนแล้ว ${selectedEmployeeWarningLetters.length} ครั้ง` : 'ยังไม่มีประวัติเตือน'}
                      </span>
                    </div>
                  </div>
                ) : null}

                <button
                  onClick={() => selectedEmp && setStepCreating(1)}
                  disabled={!selectedEmp}
                  className="btn btn-primary w-full justify-center disabled:opacity-50"
                >
                  ถัดไป: เลือกเทมเพลต
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {previewEmp ? (
                  <div className={`rounded-2xl border p-4 ${selectedEmployeeHasWarning ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{previewEmp.name} ({previewEmp.id})</div>
                        <div className="mt-0.5 text-xs text-slate-500">{previewEmp.position || 'พนักงาน'} · {branches.find((branch) => String(branch.id) === String(previewEmp.branch))?.code || 'ไม่ระบุสาขา'}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${selectedEmployeeHasWarning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {selectedEmployeeHasWarning ? `เคยโดนเตือนแล้ว ${selectedEmployeeWarningLetters.length} ครั้ง` : 'ยังไม่มีประวัติเตือน'}
                      </span>
                    </div>
                    {selectedEmployeeHasWarning ? (
                      <div className="mt-3 space-y-2">
                        {selectedEmployeeWarningLetters.slice(0, 3).map((letter) => (
                          <div key={letter.id} className="rounded-xl border border-amber-100 bg-white px-3 py-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-800">{levelConfig[letter.level]?.label || letter.level}</span>
                              <span className="text-slate-400">{thaiShortDate(letter.issue_date)}</span>
                            </div>
                            <div className="mt-1 text-slate-600 line-clamp-2">{letter.reason || '-'}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <span className="text-sm font-bold text-slate-900 block mb-2">เลือกเทมเพลต</span>
                  <div className="grid gap-2">
                    {TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setSelectedTpl(tpl.id)}
                        className={`rounded-2xl border p-3 text-left transition-all ${selectedTpl === tpl.id ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-slate-900">{tpl.name}</div>
                            <div className="mt-1 text-xs text-slate-500">{tpl.desc}</div>
                          </div>
                          <LevelBadge level={tpl.level} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-slate-900 block mb-1.5">สาเหตุ</span>
                  <textarea
                    rows="3"
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="อธิบายเหตุผลที่ออกหนังสือเตือน"
                    className="input min-h-24 resize-none"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-bold text-slate-900 block mb-1.5">วันที่</span>
                    <input
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                      className="input"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold text-slate-900 block mb-1.5">สาขา (ไม่บังคับ)</span>
                    <select
                      value={formData.branch_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, branch_id: e.target.value }))}
                      className="input"
                    >
                      <option value="">ทั้งบริษัท</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.code} - {branch.name}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => editingLetter ? resetForm() : setStepCreating(0)}
                    className="btn btn-ghost flex-1 justify-center"
                  >
                    {editingLetter ? 'ยกเลิก' : '← ย้อนกลับ'}
                  </button>
                  <button
                    onClick={handleSaveLetter}
                    disabled={!selectedTpl || !formData.reason || saving}
                    className="btn btn-primary flex-1 justify-center disabled:opacity-50"
                  >
                    {saving ? 'กำลัง...' : editingLetter ? 'บันทึกแก้ไข' : 'ออกหนังสือ'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="card rounded-2xl border border-slate-200 bg-white p-5 h-fit">
            {stepCreating === 0 ? (
              <div>
                <h3 className="font-bold text-slate-900 mb-2 text-lg">ลำดับการออกหนังสือ</h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="font-bold text-slate-900">1. เลือกพนักงาน</div>
                    <div className="mt-1 text-xs text-slate-500">ระบบจะแสดงทันทีว่าคนนี้เคยโดนเตือนหรือไม่</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="font-bold text-slate-900">2. เลือกเทมเพลตและกรอกสาเหตุ</div>
                    <div className="mt-1 text-xs text-slate-500">ดูตัวอย่างหนังสือก่อนบันทึกได้ทางด้านนี้</div>
                  </div>
                </div>
              </div>
            ) : currentTemplate && previewEmp ? (
              <div>
                <h3 className="font-bold text-slate-900 mb-4 text-lg">ตัวอย่างหนังสือ</h3>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-serif max-h-96 overflow-y-auto">
                  {previewBody}
                </div>
                <div className="flex gap-4 mt-6 pt-4 border-t border-dashed border-slate-300">
                  {['ผู้ออก', 'ผู้รับ', 'พยาน'].map(label => (
                    <div key={label} className="flex-1 text-center">
                      <div className="h-8 border-b border-dashed border-slate-400 mb-1"></div>
                      <p className="text-xs text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : previewEmp ? (
              <div>
                <h3 className="font-bold text-slate-900 mb-4 text-lg">ประวัติของ {previewEmp.name}</h3>
                {selectedEmployeeHasWarning ? (
                  <div className="space-y-2">
                    {selectedEmployeeWarningLetters.map((letter) => (
                      <div key={letter.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">{levelConfig[letter.level]?.label || letter.level}</span>
                          <span className="text-xs text-slate-400">{thaiShortDate(letter.issue_date)}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-600">{letter.reason || '-'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">ยังไม่มีประวัติหนังสือเตือน</div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewLetter && (
        <PreviewModal
          letter={previewLetter}
          employees={employees}
          branches={branches}
          onEdit={(letter) => {
            setPreviewLetter(null);
            startEditLetter(letter);
          }}
          onDelete={async (letter) => {
            setPreviewLetter(null);
            await handleDeleteLetter(letter);
          }}
          onClose={() => setPreviewLetter(null)}
        />
      )}
    </div>
  );
}
