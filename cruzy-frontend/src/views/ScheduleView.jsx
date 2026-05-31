import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CalendarCheck, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Modal } from '../components/Modal';
import { dateRange, fmtDate, thaiShortDate } from '../lib/date';
import { getVisibleBranches, recommendedEmployees, requiredStaffFor, scheduleCandidates, shiftFor } from '../lib/schedule';
import { api } from '../lib/api';

export function ScheduleView({ data, setData, user, currentBranch, from, to, toast }) {
  const [view, setView] = useState('planner');
  const [assignTarget, setAssignTarget] = useState(null);
  const branches = useMemo(() => getVisibleBranches(data, user, currentBranch), [data, user, currentBranch]);
  const days = useMemo(() => dateRange(from, to), [from, to]);
  const today = fmtDate(new Date());
  const alerts = useMemo(() => buildAlerts(data, branches, from), [data, branches, from]);

  async function addToSchedule(branchId, date, empId) {
    const key = `${branchId}_${date}`;
    const employee = data.employees.find((item) => item.id === empId);
    const branch = data.branches.find((item) => item.id === branchId);
    try {
      const shift = shiftFor(data, branchId, date);
      await api.assignSchedule({ bid: branchId, date, eid: empId, shiftStart: shift.start, shiftEnd: shift.end });
      setData((current) => ({
        ...current,
        schedule: {
          ...current.schedule,
          [key]: current.schedule[key]?.includes(empId) ? current.schedule[key] : [...(current.schedule[key] || []), empId]
        }
      }));
      toast(`เพิ่ม ${employee?.name || 'พนักงาน'} → ${branch?.code || ''} ${thaiShortDate(date)}`);
    } catch (error) {
      toast(error.message || 'เพิ่มตารางงานไม่สำเร็จ', 'error');
    }
  }

  async function removeFromSchedule(branchId, date, empId) {
    const key = `${branchId}_${date}`;
    try {
      await api.removeSchedule({ bid: branchId, date, eid: empId });
      setData((current) => ({
        ...current,
        schedule: {
          ...current.schedule,
          [key]: (current.schedule[key] || []).filter((id) => id !== empId)
        }
      }));
      toast('ลบออกจากตารางแล้ว');
    } catch (error) {
      toast(error.message || 'ลบตารางงานไม่สำเร็จ', 'error');
    }
  }

  async function autoFill() {
    let added = 0;
    for (const date of days) {
      for (const branch of branches) {
        let existing = data.schedule[`${branch.id}_${date}`] || [];
        const need = requiredStaffFor(data, branch.id, date);
        while (existing.length < need) {
          const rec = recommendedEmployees(data, user, branch.id, date, { from, to })[0];
          if (!rec) break;
          await addToSchedule(branch.id, date, rec.employee.id);
          added += 1;
          existing = [...existing, rec.employee.id];
        }
      }
    }
    toast(added ? `จัดอัตโนมัติแล้ว ${added} รายการ` : 'ยังไม่มีรายการที่จัดเพิ่มได้');
  }

  return (
    <>
      <div className="flex shrink-0 overflow-x-auto border-b border-slate-200 bg-[#fafafa] scrollbar-none">
        <button className={`px-4 py-2.5 text-xs font-bold ${view === 'planner' ? 'border-b-2 border-cruzy text-cruzy' : 'text-slate-500 hover:text-cruzy'}`} onClick={() => setView('planner')}>จัดตาราง</button>
        <button className={`px-4 py-2.5 text-xs font-bold ${view === 'overview' ? 'border-b-2 border-cruzy text-cruzy' : 'text-slate-500 hover:text-cruzy'}`} onClick={() => setView('overview')}>ภาพรวม</button>
      </div>
      <div className="p-5">
        {view === 'planner' ? (
          <Planner
            data={data}
            branches={branches}
            days={days}
            today={today}
            from={from}
            to={to}
            user={user}
            alerts={alerts}
            onAssign={setAssignTarget}
            onAutoFill={autoFill}
            onQuickAdd={addToSchedule}
            onRemove={removeFromSchedule}
          />
        ) : (
          <Overview data={data} branches={branches} date={from} onAssign={setAssignTarget} />
        )}
      </div>
      <AssignModal
        target={assignTarget}
        data={data}
        user={user}
        from={from}
        to={to}
        onClose={() => setAssignTarget(null)}
        onAdd={async (branchId, date, empId) => {
          await addToSchedule(branchId, date, empId);
          setAssignTarget(null);
        }}
      />
    </>
  );
}

function Planner({ data, branches, days, today, from, to, user, alerts, onAssign, onAutoFill, onQuickAdd, onRemove }) {
  const stats = branches.reduce((acc, branch) => {
    const employees = data.schedule[`${branch.id}_${today}`] || [];
    const need = requiredStaffFor(data, branch.id, today);
    acc.total += employees.length;
    if (!employees.length) acc.empty += 1;
    if (employees.length < need) acc.short += 1;
    return acc;
  }, { total: 0, empty: 0, short: 0 });

  return (
    <div>
      <AlertStack alerts={alerts} onAssign={onAssign} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} value={stats.total} label="เข้างานวันนี้" tone="border-cruzy text-cruzy" />
        <Stat icon={AlertTriangle} value={stats.empty} label="สาขาว่าง" tone={stats.empty ? 'border-danger text-danger' : 'border-cruzy text-cruzy'} />
        <Stat icon={CalendarCheck} value={stats.short} label="คนไม่พอ" tone={stats.short ? 'border-warn text-warn' : 'border-cruzy text-cruzy'} />
        <Stat icon={BarChart3} value={alerts.length} label="แจ้งเตือน" tone="border-info text-info" />
      </div>
      <RecommendationBox data={data} branches={branches} days={days} from={from} to={to} user={user} onQuickAdd={onQuickAdd} onAutoFill={onAutoFill} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-200">
        <div className="grid min-w-[860px] gap-px" style={{ gridTemplateColumns: `100px repeat(${days.length}, minmax(108px, 1fr))` }}>
          <div className="bg-[#fafafa] p-2 text-center text-[11px] font-bold text-slate-600">สาขา</div>
          {days.map((date) => {
            const day = new Date(`${date}T00:00:00`);
            return (
              <div key={date} className={`p-2 text-center text-[11px] font-bold ${date === today ? 'bg-cruzy-50 text-cruzy' : 'bg-[#fafafa] text-slate-500'}`}>
                {day.toLocaleDateString('th-TH', { weekday: 'short' })}<br />{day.getDate()}
              </div>
            );
          })}
          {branches.map((branch) => (
            <ScheduleRow key={branch.id} data={data} branch={branch} days={days} onAssign={onAssign} onRemove={onRemove} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ScheduleRow({ data, branch, days, onAssign, onRemove }) {
  return (
    <>
      <div className="flex items-center border-r-2 border-cruzy bg-white p-2 text-[11px] font-bold">{branch.code}</div>
      {days.map((date) => {
        const employeeIds = data.schedule[`${branch.id}_${date}`] || [];
        const need = requiredStaffFor(data, branch.id, date);
        const short = employeeIds.length < need;
        const empty = employeeIds.length === 0;
        return (
          <div key={`${branch.id}_${date}`} className={`relative min-h-[74px] bg-white p-1.5 pb-5 ${empty && need > 0 ? 'bg-red-50' : short ? 'bg-orange-50' : ''}`}>
            {employeeIds.map((empId) => {
              const employee = data.employees.find((item) => item.id === empId);
              if (!employee) return null;
              return (
                <span key={empId} className="m-0.5 inline-flex items-center gap-1 rounded-full border border-green-200 bg-cruzy-50 px-1.5 py-0.5 text-[10px]">
                  <Avatar employee={employee} size="sm" />
                  {employee.name}
                  <button className="text-danger/60 hover:text-danger" onClick={() => onRemove(branch.id, date, empId)} aria-label="ลบ">
                    <Trash2 size={11} />
                  </button>
                </span>
              );
            })}
            <button className="mt-1 flex w-full items-center justify-center rounded-lg border border-dashed border-slate-300 py-0.5 text-slate-400 hover:border-cruzy hover:bg-cruzy-50 hover:text-cruzy" onClick={() => onAssign({ branchId: branch.id, date })}>
              <Plus size={14} />
            </button>
            <div className={`absolute bottom-1 right-1 text-[9px] font-bold ${short ? 'text-danger' : 'text-cruzy'}`}>{employeeIds.length}/{need}</div>
          </div>
        );
      })}
    </>
  );
}

function AlertStack({ alerts, onAssign }) {
  return (
    <div className="mb-3 space-y-2">
      {alerts.slice(0, 8).map((alert) => (
        <div key={`${alert.type}_${alert.branch.id}_${alert.date}`} className={`flex items-center gap-3 rounded-lg border-l-4 px-4 py-2 text-xs ${alert.type === 'danger' ? 'border-danger bg-red-50 text-red-700' : 'border-warn bg-orange-50 text-orange-700'}`}>
          <span className="flex-1">{alert.message}</span>
          <button className={`btn text-white ${alert.type === 'danger' ? 'bg-danger' : 'bg-warn'}`} onClick={() => onAssign({ branchId: alert.branch.id, date: alert.date })}>จัดคน</button>
        </div>
      ))}
    </div>
  );
}

function RecommendationBox({ data, branches, days, from, to, user, onQuickAdd, onAutoFill }) {
  return (
    <div className="mb-4 rounded-lg border border-green-300 bg-[linear-gradient(135deg,#E8F5E9,#E3F2FD)] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-cruzy"><Sparkles size={16} />แนะนำจัดตารางตามกติกา</h3>
          <p className="text-[11px] text-slate-500">กรองจากสาขาที่ลงได้ วันว่าง ไม่ชนตารางเดิม และกระจายจำนวนวันทำงาน</p>
        </div>
        <button className="btn btn-primary shrink-0" onClick={onAutoFill}>จัดอัตโนมัติ</button>
      </div>
      <div className="space-y-1">
        {branches.map((branch) => {
          const recs = days.flatMap((date) => recommendedEmployees(data, user, branch.id, date, { from, to }).map((candidate) => ({ ...candidate, date }))).slice(0, 5);
          return (
            <div key={branch.id} className="text-xs">
              <span className="font-bold">{branch.code}</span>
              <span className="ml-2 text-slate-500">ช่วงวันที่เลือก</span>
              <span className="mx-2 text-slate-400">→</span>
              {recs.length ? recs.map((rec) => (
                <button key={`${rec.employee.id}_${rec.date}`} className="chip m-1 hover:border-cruzy hover:bg-cruzy-50" onClick={() => onQuickAdd(branch.id, rec.date, rec.employee.id)}>
                  <Avatar employee={rec.employee} size="sm" />
                  {rec.employee.name} · {thaiShortDate(rec.date)}
                </button>
              )) : <span className="text-slate-500">ยังไม่มีช่องว่างหรือไม่มีคนที่ตรงกติกา</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Overview({ data, branches, date, onAssign }) {
  const totalWorking = branches.reduce((sum, branch) => sum + (data.schedule[`${branch.id}_${date}`] || []).length, 0);
  const emptyCount = branches.filter((branch) => !(data.schedule[`${branch.id}_${date}`] || []).length).length;
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat icon={Users} value={totalWorking} label="เข้างานวันนี้" tone="border-cruzy text-cruzy" />
        <Stat icon={AlertTriangle} value={emptyCount} label="สาขาว่าง" tone={emptyCount ? 'border-danger text-danger' : 'border-cruzy text-cruzy'} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((branch) => {
          const ids = data.schedule[`${branch.id}_${date}`] || [];
          const need = requiredStaffFor(data, branch.id, date);
          return (
            <div key={branch.id} className="card overflow-hidden">
              <div className={`flex items-center justify-between px-4 py-2 text-xs font-bold text-white ${ids.length ? 'bg-cruzy' : 'bg-danger'}`}>
                <span>{branch.code}</span>
                <span>{ids.length}/{need} คน</span>
              </div>
              <div className="p-3">
                {ids.length ? ids.map((id) => {
                  const employee = data.employees.find((item) => item.id === id);
                  return <div key={id} className="flex items-center gap-2 border-b border-slate-100 py-1.5 text-xs last:border-0"><Avatar employee={employee} />{employee?.name}</div>;
                }) : <div className="text-center text-xs font-bold text-danger">ว่าง <button className="btn ml-2 bg-cruzy-50 text-cruzy" onClick={() => onAssign({ branchId: branch.id, date })}>จัดคน</button></div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssignModal({ target, data, user, from, to, onClose, onAdd }) {
  if (!target) return null;
  const branch = data.branches.find((item) => item.id === target.branchId);
  const candidates = scheduleCandidates(data, user, target.branchId, target.date, { from, to });
  return (
    <Modal title={`จัดคนเข้า ${branch?.code || ''} - ${thaiShortDate(target.date)}`} onClose={onClose} footer={<button className="btn btn-ghost" onClick={onClose}>ปิด</button>}>
      <p className="mb-3 text-xs text-slate-500">เลือกพนักงานที่จะเข้าทำงาน <b>{branch?.code}</b> วันที่ <b>{thaiShortDate(target.date)}</b></p>
      <div className="max-h-[340px] overflow-y-auto">
        {candidates.map((candidate) => (
          <button key={candidate.employee.id} disabled={candidate.disabled} onClick={() => onAdd(target.branchId, target.date, candidate.employee.id)} className="flex w-full items-center gap-3 rounded-lg border-b border-slate-100 px-2 py-2 text-left hover:bg-cruzy-50 disabled:opacity-40">
            <Avatar employee={candidate.employee} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold">{candidate.employee.name} ({candidate.employee.code})</div>
              <div className="text-[10px] text-slate-500">{candidate.employee.position} · คะแนน {candidate.score}</div>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              <Tag good={candidate.canBranch}>{candidate.canBranch ? 'ลงสาขานี้ได้' : 'ไม่ได้ตั้งค่า'}</Tag>
              <Tag good={candidate.available}>{candidate.available ? 'ว่าง' : 'ไม่ว่าง'}</Tag>
              {candidate.alreadyIn ? <Tag good>อยู่แล้ว</Tag> : null}
              {candidate.busyAt && !candidate.alreadyIn ? <Tag>อยู่ {candidate.busyAt.code}</Tag> : null}
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function Stat({ icon: Icon, value, label, tone }) {
  return (
    <div className={`stat ${tone.split(' ')[0]}`}>
      <Icon className={`mx-auto mb-1 ${tone.split(' ')[1]}`} size={18} />
      <div className={`text-2xl font-bold leading-none ${tone.split(' ')[1]}`}>{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function Tag({ good = false, children }) {
  return <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${good ? 'bg-cruzy-50 text-cruzy' : 'bg-orange-50 text-orange-700'}`}>{children}</span>;
}

function buildAlerts(data, branches, from) {
  const alerts = [];
  for (let ahead = 0; ahead <= 30; ahead += 1) {
    const dateObj = new Date(`${from}T00:00:00`);
    dateObj.setDate(dateObj.getDate() + ahead);
    const date = fmtDate(dateObj);
    branches.forEach((branch) => {
      const employeeIds = data.schedule[`${branch.id}_${date}`] || [];
      const need = requiredStaffFor(data, branch.id, date);
      if (employeeIds.length < need) {
        alerts.push({
          type: ahead <= 7 ? 'danger' : 'warn',
          branch,
          date,
          message: `${ahead <= 7 ? '🚨' : '⚠️'} ${branch.code} วันที่ ${thaiShortDate(date)} ต้องการ ${need} คน มี ${employeeIds.length} คน (อีก ${ahead} วัน)`
        });
      }
    });
  }
  return [...alerts.filter((alert) => alert.type === 'danger').slice(0, 5), ...alerts.filter((alert) => alert.type === 'warn').slice(0, 3)];
}
