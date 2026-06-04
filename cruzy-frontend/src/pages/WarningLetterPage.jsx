import { useState, useMemo } from 'react';
import { FileText, Plus } from 'lucide-react';
import { thaiShortDate } from '../lib/date.js';
import { useWarningLetters } from '../hooks/useWarningLetters.js';

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

function PreviewModal({ letter, employees, onClose }) {
  if (!letter) return null;
  
  const emp = employees.find(e => e.id === letter.employee_id);
  const tpl = TEMPLATES.find(t => t.id === letter.template_id);
  if (!emp || !tpl) return null;

  const body = tpl.body
    .replace(/\{ชื่อพนักงาน\}/g, `${emp.name} (${emp.id})`)
    .replace(/\{สาขา\}/g, emp.id)
    .replace(/\{วันที่ออก\}/g, thaiShortDate(letter.issue_date))
    .replace(/\{วันที่เกิดเหตุ\}/g, thaiShortDate(letter.issue_date))
    .replace(/\{รายละเอียดความผิด\}/g, letter.reason);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Avatar emp={emp} size={8} />
            <div>
              <p className="font-semibold text-gray-900 text-sm">{emp.name}</p>
              <p className="text-xs text-gray-400">{emp.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LevelBadge level={letter.level} />
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 mb-4 font-mono text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
            {body}
          </div>

          <div className="flex gap-6 mt-6 pt-4 border-t border-dashed border-gray-200">
            {['ผู้ออกหนังสือ (นายจ้าง)', `ผู้รับหนังสือ (${emp.name})`, 'พยาน'].map(label => (
              <div key={label} className="flex-1 text-center">
                <div className="h-10 border-b border-dashed border-gray-300 mb-1"></div>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-5">
            <button className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
              📥 ดาวน์โหลด PDF
            </button>
            <button className="py-2 px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              📱 ส่ง LIFF
            </button>
            <button onClick={onClose} className="py-2 px-4 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LetterCard({ letter, employees, onPreview }) {
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

      <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
        <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">คลิกเพื่อดูรายละเอียด →</span>
      </div>
    </div>
  );
}

export default function WarningLetterPage({ data }) {
  const { warningLetters, loading, saving, error, createWarningLetter, deleteWarningLetter } = useWarningLetters();
  const [tab, setTab] = useState('issued');
  const [previewLetter, setPreviewLetter] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stepCreating, setStepCreating] = useState(0); // 0: choose emp, 1: choose template
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedTpl, setSelectedTpl] = useState('');
  const [formData, setFormData] = useState({ reason: '', issue_date: new Date().toISOString().split('T')[0], branch_id: '' });

  const employees = data?.employees ?? [];
  const branches = data?.branches ?? [];

  const handleCreateLetter = async () => {
    if (!selectedEmp || !selectedTpl) return;
    const template = TEMPLATES.find(t => t.id === selectedTpl);
    await createWarningLetter({
      employee_id: selectedEmp,
      template_id: selectedTpl,
      level: template?.level || 'verbal',
      issue_date: formData.issue_date,
      reason: formData.reason,
      branch_id: formData.branch_id && formData.branch_id !== '' ? parseInt(formData.branch_id, 10) : null,
      status: 'draft'
    });
    setStepCreating(0);
    setSelectedEmp('');
    setSelectedTpl('');
    setFormData({ reason: '', issue_date: new Date().toISOString().split('T')[0], branch_id: '' });
  };

  const currentTemplate = TEMPLATES.find(t => t.id === selectedTpl);
  const previewEmp = employees.find(e => e.id === selectedEmp);
  const previewBody = currentTemplate && previewEmp ? currentTemplate.body
    .replace(/\{ชื่อพนักงาน\}/g, `${previewEmp.name} (${previewEmp.id})`)
    .replace(/\{สาขา\}/g, previewEmp.id)
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
        if (tab === 'issued') return letter.status === 'issued';
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
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
            onClick={() => { setTab(t.id); setStepCreating(0); }}
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
          <div className="bg-white rounded-lg border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">ขั้นตอนที่ {stepCreating + 1}: {stepCreating === 0 ? 'เลือกพนักงาน' : 'เลือกเทมเพลต'}</h3>

            {stepCreating === 0 ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-900 block mb-1.5">เลือกพนักงาน</span>
                  <select
                    value={selectedEmp}
                    onChange={(e) => setSelectedEmp(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="">-- เลือก --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                    ))}
                  </select>
                </label>

                <button
                  onClick={() => selectedEmp && setStepCreating(1)}
                  disabled={!selectedEmp}
                  className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  ถัดไป →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-gray-900 block mb-1.5">เทมเพลต</span>
                  <select
                    value={selectedTpl}
                    onChange={(e) => setSelectedTpl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="">-- เลือก --</option>
                    {TEMPLATES.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-900 block mb-1.5">สาเหตุ</span>
                  <textarea
                    rows="3"
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="อธิบายเหตุผลที่ออกหนังสือเตือน"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-900 block mb-1.5">วันที่</span>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-900 block mb-1.5">สาขา (ไม่บังคับ)</span>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, branch_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="">ทั้งบริษัท</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.code} - {branch.name}</option>
                    ))}
                  </select>
                </label>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setStepCreating(0)}
                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    ← ย้อนกลับ
                  </button>
                  <button
                    onClick={handleCreateLetter}
                    disabled={!selectedTpl || !formData.reason || saving}
                    className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'กำลัง...' : 'ออกหนังสือ'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          {stepCreating === 1 && currentTemplate && previewEmp && (
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-6 h-fit">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">ตัวอย่าง</h3>
              <div className="bg-white rounded border border-gray-200 p-4 text-xs leading-relaxed text-gray-800 whitespace-pre-wrap font-serif max-h-96 overflow-y-auto">
                {previewBody}
              </div>
              <div className="flex gap-4 mt-6 pt-4 border-t border-dashed border-gray-300">
                {['ผู้ออก', 'ผู้รับ', 'พยาน'].map(label => (
                  <div key={label} className="flex-1 text-center">
                    <div className="h-8 border-b border-dashed border-gray-400 mb-1"></div>
                    <p className="text-xs text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {previewLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <PreviewModal
            letter={previewLetter}
            employee={employees.find(e => e.id === previewLetter.employee_id)}
            onClose={() => setPreviewLetter(null)}
          />
        </div>
      )}
    </div>
  );
}
