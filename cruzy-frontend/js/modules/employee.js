// LEAVE
// ================================
function renderLeave(el){
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const rangeDates=dRange(selDate,selDateTo);
const vis=LEAVES.filter(l=>{const e=EMPS.find(x=>x.id===l.empId);if(!e||!bids.includes(e.branch))return false;const lFrom=l.from;const lTo=l.to;return lTo>=selDate&&lFrom<=selDateTo;});
const pending=vis.filter(l=>l.status==='pending').length,approved=vis.filter(l=>l.status==='approved').length;
let h=`<div class="stats-row">
<div class="stat-card orange"><div class="stat-num" style="color:var(--accent)">${pending}</div><div class="stat-label">รออนุมัติ</div></div>
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${approved}</div><div class="stat-label">อนุมัติ</div></div>
<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">${vis.reduce((s,l)=>s+l.days,0)}</div><div class="stat-label">วันลาทั้งหมด</div></div>
</div>`;
// Pending
const p=vis.filter(l=>l.status==='pending');
if(p.length){
h+=`<div class="tw"><div class="tw-head"><h3>⏳ รออนุมัติ</h3></div><table><tr><th>พนักงาน</th><th>ประเภท</th><th>วันที่</th><th>จำนวน</th><th>เหตุผล</th><th>ดำเนินการ</th></tr>`;
p.forEach(l=>{const e=EMPS.find(x=>x.id===l.empId);const b=BRANCHES.find(x=>x.id===e?.branch);
h+=`<tr><td><span class="emp-dot" style="background:${e?.c}">${e?.name[0]}</span>${e?.name} <span style="color:var(--tl);font-size:10px">${b?.code}</span></td><td>${l.type}</td><td>${thD(l.from)}${l.from!==l.to?' → '+thD(l.to):''}</td><td>${l.days}</td><td>${l.reason}</td><td><button class="action-btn approve" onclick="LEAVES.find(x=>x.id==='${l.id}').status='approved';toast('✅ อนุมัติ');render()">✅</button><button class="action-btn reject" onclick="LEAVES.find(x=>x.id==='${l.id}').status='rejected';toast('❌ ปฏิเสธ');render()">❌</button></td></tr>`;});
h+='</table></div>';
}
// Summary
h+=`<div class="tw"><div class="tw-head"><h3>📊 สรุปวันลา</h3></div><table><tr><th>พนักงาน</th><th>📅 ประจำปี(13)</th><th>🏖 พักร้อน(5)</th><th>🤒 ป่วย</th><th>📋 กิจ</th></tr>`;
visEmps().forEach(e=>{const b=LBAL[e.id]||{a:13,v:5,s:0,p:0};
h+=`<tr><td><span class="emp-dot" style="background:${e.c}">${e.name[0]}</span>${e.name}</td><td><b style="color:${b.a<=3?'var(--danger)':'var(--primary)'}">${b.a}</b>/13</td><td><b>${b.v}</b>/5</td><td>${b.s}</td><td>${b.p}</td></tr>`;});
h+='</table></div>';
el.innerHTML=h;
}

// ================================
// EMPLOYEE (with sub-tabs: info + contracts + attendance + payroll)
// ================================
let empSub='info';
let contractFilter='all';
let editingEmployeeId = null;

function getEmployeeSelectedBranchIds(emp){
  return EMP_BRANCHES[emp.id] && EMP_BRANCHES[emp.id].length ? EMP_BRANCHES[emp.id] : [emp.branch].filter(Boolean);
}
function getEmployeeSelectedAvailDays(emp){
  const days = EMP_AVAILABILITY_RULES.filter(r=>r.empId===emp.id&&r.type==='available').map(r=>Number(r.dayOfWeek));
  return days.length?days:[0,1,2,3,4,5,6];
}

function renderEmployee(el){
const st=document.getElementById('subTabs');
const canSeePayroll=user&&(user.role==='owner'||user.role==='regional');
let tabs=`<button class="sub-tab ${empSub==='info'?'active':''}" onclick="empSub='info';render()">👤 ข้อมูลพนักงาน</button>`;
tabs+=`<button class="sub-tab ${empSub==='contract'?'active':''}" onclick="empSub='contract';render()">📄 สัญญาจ้าง</button>`;
tabs+=`<button class="sub-tab ${empSub==='attendance'?'active':''}" onclick="empSub='attendance';render()">🕐 การเข้างาน / วินัย</button>`;
if(canSeePayroll) tabs+=`<button class="sub-tab ${empSub==='payroll'?'active':''}" onclick="empSub='payroll';render()">💵 เงินเดือน</button>`;
st.innerHTML=tabs;

if(empSub==='info') renderEmpInfo(el);
else if(empSub==='contract') renderEmpContracts(el);
else if(empSub==='attendance') renderEmpAttendance(el);
else if(empSub==='payroll'&&canSeePayroll) renderPayroll(el);
else{empSub='info';renderEmpInfo(el);}
}

function renderEmpInfo(el){
const emps=visEmps();
const monthlyCount=emps.filter(e=>activePayProfile(e.id).payType==='monthly').length;
const dailyCount=emps.filter(e=>activePayProfile(e.id).payType==='daily').length;
let h=`<div class="stats-row">
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${emps.length}</div><div class="stat-label">ทั้งหมด</div></div>
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${emps.filter(e=>e.status==='active').length}</div><div class="stat-label">ประจำ</div></div>
<div class="stat-card orange"><div class="stat-num" style="color:var(--accent)">${monthlyCount}</div><div class="stat-label">รายเดือน</div></div>
<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">${dailyCount}</div><div class="stat-label">รายวัน</div></div>
</div>`;
h+=`<div class="tw"><div class="tw-head"><h3>👤 พนักงาน</h3><button class="btn btn-primary" onclick="openAddEmployeeModal()">+ เพิ่ม</button></div><table><tr><th>รหัส</th><th>ชื่อ</th><th>ตำแหน่ง</th><th>สาขาที่ลงได้</th><th>การจ่าย</th><th>วันว่าง</th><th>สถานะ</th><th>จัดการ</th></tr>`;
emps.forEach(e=>{const b=BRANCHES.find(x=>x.id===e.branch);
const statusMap={trial:{cls:'trial',label:'ทดลอง'},active:{cls:'active',label:'ประจำ'},freelance:{cls:'waiting',label:'Freelance'}};
const sm=statusMap[e.status]||statusMap.active;
const brs=(EMP_BRANCHES[e.id]||[e.branch]).map(bid=>BRANCHES.find(x=>x.id===bid)?.code).filter(Boolean).join(', ')||b?.code||'-';
const pay=activePayProfile(e.id);
const payLabel=pay.payType==='daily'?`รายวัน ฿${nf(Number(pay.dailyRate||0))}`:`รายเดือน ฿${nf(Number(pay.monthlySalary||e.salary||0))}`;
const avail=EMP_AVAILABILITY_RULES.filter(r=>r.empId===e.id&&r.type==='available').map(r=>WEEKDAY_LABELS[r.dayOfWeek]).join(' ');
h+=`<tr><td style="font-weight:600">${e.code}</td><td><span class="emp-dot" style="background:${e.c}">${e.name[0]}</span>${e.name}</td><td>${e.pos}</td><td>${brs}</td><td>${payLabel}${pay.commissionEnabled?' <span class="badge approved">คอม</span>':''}</td><td>${avail||'<span style="color:var(--tl)">ทุกวัน</span>'}</td><td><span class="badge ${sm.cls}">${sm.label}</span></td><td><button class="action-btn" onclick="openAddEmployeeModal('${e.id}')">แก้ไข</button></td></tr>`;});
h+='</table></div>';
el.innerHTML=h;
}

function openAddEmployeeModal(empId){
const emp = empId ? EMPS.find(e=>e.id===empId) : null;
editingEmployeeId = emp?.id || null;
const branches=visBranches();
const defaultBranch=curBranch!=='all'?curBranch:(branches[0]?.id||'');
const selectedBranchIds = emp ? getEmployeeSelectedBranchIds(emp) : [defaultBranch];
const branchChecks=branches.map(b=>`<label class="check-row"><input type="checkbox" class="empBranchCheck" value="${b.id}" ${selectedBranchIds.includes(b.id)?'checked':''}> <span>${b.code} - ${b.name}</span></label>`).join('');
const selectedAvailDays = emp ? getEmployeeSelectedAvailDays(emp) : [0,1,2,3,4,5,6];
const dayChecks=WEEKDAY_LABELS.map((d,idx)=>`<label class="check-row"><input type="checkbox" class="empAvailCheck" value="${idx}" ${selectedAvailDays.includes(idx)?'checked':''}> <span>${d}</span></label>`).join('');
const pay = emp ? activePayProfile(emp.id) : {payType:'monthly',monthlySalary:15000,dailyRate:500,commissionEnabled:true};
const body=`
<div style="font-size:12px">
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">รหัสพนักงาน</label><input id="empCodeInput" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px" placeholder="EMP009" value="${emp?.code||''}"></div>
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">ชื่อพนักงาน</label><input id="empNameInput" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px" placeholder="ชื่อ-นามสกุล" value="${emp?.name||''}"></div>
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">ตำแหน่ง</label><input id="empPosInput" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px" value="${emp?.pos||'พนักงานขาย'}"></div>
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">ลงสาขาไหนได้บ้าง</label><div class="check-grid">${branchChecks}</div></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
<div><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">สถานะ</label><select id="empStatusInput" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px"><option value="active" ${emp?.status==='active'?'selected':''}>ประจำ</option><option value="trial" ${emp?.status==='trial'?'selected':''}>ทดลอง</option><option value="freelance" ${emp?.status==='freelance'?'selected':''}>Freelance</option></select></div>
<div><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">รูปแบบจ่าย</label><select id="empPayTypeInput" onchange="togglePayTypeFields()" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px"><option value="monthly" ${pay.payType==='monthly'?'selected':''}>รายเดือน</option><option value="daily" ${pay.payType==='daily'?'selected':''}>รายวัน</option></select></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
<div id="empSalaryFieldDiv" style="display:grid"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">เงินเดือน</label><input id="empSalaryInput" type="number" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px" value="${pay.monthlySalary||15000}"></div>
<div id="empDailyRateFieldDiv" style="display:none"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">ค่าแรง/วัน</label><input id="empDailyRateInput" type="number" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px" value="${pay.dailyRate||500}"></div>
</div>
<div style="margin-bottom:10px"><label class="check-row"><input id="empCommissionInput" type="checkbox" ${pay.commissionEnabled?'checked':''}> <span>มีสิทธิ์รับค่าคอม</span></label></div>
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">วันว่างประจำ</label><div class="check-grid days">${dayChecks}</div></div>
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">สีประจำตัว</label><input id="empColorInput" type="color" style="width:100%;height:38px;padding:3px;border:1.5px solid var(--border);border-radius:8px" value="${emp?.c||'#4CAF50'}"></div>
</div>`;
const title = emp ? '✏️ แก้ไขพนักงาน' : '➕ เพิ่มพนักงาน';
const actionLabel = emp ? 'อัปเดต' : 'บันทึก';
openModal(title,body,`<button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button><button class="btn btn-primary" onclick="saveEmployee()">${actionLabel}</button>`);
setTimeout(()=>togglePayTypeFields(),0);
}

function togglePayTypeFields(){
const payType=document.getElementById('empPayTypeInput')?.value||'monthly';
const salaryDiv=document.getElementById('empSalaryFieldDiv');
const dailyDiv=document.getElementById('empDailyRateFieldDiv');
if(payType==='monthly'){
if(salaryDiv)salaryDiv.style.display='grid';
if(dailyDiv)dailyDiv.style.display='none';
}else{
if(salaryDiv)salaryDiv.style.display='none';
if(dailyDiv)dailyDiv.style.display='grid';
}
}

async function saveEmployee(){
const code=document.getElementById('empCodeInput').value.trim();
const name=document.getElementById('empNameInput').value.trim();
const pos=document.getElementById('empPosInput').value.trim()||'พนักงานขาย';
const branchIds=[...document.querySelectorAll('.empBranchCheck:checked')].map(x=>x.value);
const branchId=branchIds[0];
const branch=BRANCHES.find(b=>b.id===branchId);
const status=document.getElementById('empStatusInput').value;
const payType=document.getElementById('empPayTypeInput').value;
const salary=Number(document.getElementById('empSalaryInput').value||0);
const dailyRate=Number(document.getElementById('empDailyRateInput').value||0);
const commissionEnabled=document.getElementById('empCommissionInput').checked;
const availableDays=[...document.querySelectorAll('.empAvailCheck:checked')].map(x=>Number(x.value));
const color=document.getElementById('empColorInput').value;
if(!code||!name||!branch){toast('กรุณากรอกรหัส ชื่อ และสาขาที่ลงได้');return;}
if(payType==='monthly' && salary<=0){toast('กรุณาใส่เงินเดือนให้ถูกต้อง');return;}
if(payType==='daily' && dailyRate<=0){toast('กรุณาใส่ค่าแรง/วันให้ถูกต้อง');return;}
const id = editingEmployeeId || code.toLowerCase().replace(/[^a-z0-9_-]/g,'') || `emp_${Date.now()}`;
const branchEligibility=branchIds.map((bid,idx)=>({branchId:bid,canWork:true,isPreferred:idx===0,priority:idx===0?10:0,commissionEligible:commissionEnabled}));
const availabilityRules=WEEKDAY_LABELS.map((_,idx)=>({dayOfWeek:idx,availabilityType:availableDays.includes(idx)?'available':'unavailable'}));
const payProfile={payType,monthlySalary:salary,dailyRate,commissionEnabled,effectiveFrom:new Date().toISOString().slice(0,10)};
const payload={
  id,
  name,
  code,
  color,
  position:pos,
  salary:payType==='monthly'?salary:dailyRate,
  status,
  regionId:branch.region,
  branchEligibility,
  availabilityRules,
  payProfile
};
try{
  if(editingEmployeeId){
    const basePayload={
      name,
      code,
      position:pos,
      salary:payType==='monthly'?salary:dailyRate,
      status,
      regionId:branch.region
    };
    const res=await fetch(`${API_URL}/employees/${editingEmployeeId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(basePayload)});
    const result=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(result.message||'อัปเดตพนักงานไม่สำเร็จ');
    const ruleRes=await fetch(`${API_URL}/employees/${editingEmployeeId}/work-rules`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({branchEligibility,availabilityRules,payProfile})});
    const ruleResult=await ruleRes.json().catch(()=>({}));
    if(!ruleRes.ok)throw new Error(ruleResult.message||'อัปเดตกติกาพนักงานไม่สำเร็จ');
    toast('✅ แก้ไขพนักงานสำเร็จ');
  } else {
    const res=await fetch(`${API_URL}/employees`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const result=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(result.message||'เพิ่มพนักงานไม่สำเร็จ');
    toast(result.message||'✅ เพิ่มพนักงานสำเร็จ');
  }
  editingEmployeeId=null;
  closeModal();
  if(typeof loadConsoleData==='function') await loadConsoleData();
  buildSidebar();
  render();
}catch(err){toast(err.message||'ไม่สามารถบันทึกข้อมูลพนักงานได้');}
}

function renderEmpContracts(el){
const emps=visEmps();const today=new Date();
const vis=CONTRACTS.filter(c=>emps.some(e=>e.id===c.empId));

const permanent=vis.filter(c=>c.type==='ประจำ');
const trials=vis.filter(c=>c.type==='ทดลองงาน');
const freelances=vis.filter(c=>c.type==='freelance');
const filtered=contractFilter==='all'?vis:vis.filter(c=>c.type===contractFilter);

function trialDaysInfo(c){
  const startD=new Date(c.start);
  const elapsed=Math.ceil((today-startD)/(864e5));
  const remaining=120-elapsed;
  const pct=Math.min(100,Math.round((elapsed/120)*100));
  return {elapsed:Math.max(0,elapsed),remaining:Math.max(0,remaining),pct};
}
function cFileStatus(c){
  const daysLeft=Math.ceil((new Date(c.end)-today)/(864e5));
  if(c.type==='ทดลองงาน'){
    const ti=trialDaysInfo(c);
    if(ti.remaining<=0)return{cls:'expired',label:'⏰ หมดทดลองงาน',color:'var(--danger)',pct:100};
    if(ti.remaining<=14)return{cls:'warn',label:`⏰ เหลือ ${ti.remaining} วัน`,color:'var(--accent)',pct:ti.pct};
    return{cls:'trial-count',label:`📅 ผ่านมา ${ti.elapsed} วัน / เหลือ ${ti.remaining} วัน`,color:'var(--info)',pct:ti.pct};
  }
  if(daysLeft<0)return{cls:'expired',label:'❌ หมดสัญญา',color:'var(--danger)',pct:100};
  if(daysLeft<=30)return{cls:'warn',label:`⚠️ เหลือ ${daysLeft} วัน`,color:'var(--accent)',pct:90};
  return{cls:'ok',label:'✅ ใช้งานอยู่',color:'var(--primary)',pct:0};
}

let h=`<div class="stats-row">
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${vis.length}</div><div class="stat-label">ทั้งหมด</div></div>
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${permanent.length}</div><div class="stat-label">ประจำ</div></div>
<div class="stat-card orange"><div class="stat-num" style="color:var(--accent)">${trials.length}</div><div class="stat-label">ทดลองงาน</div></div>
<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">${freelances.length}</div><div class="stat-label">Freelance</div></div>
</div>`;

// Filter buttons
h+=`<div class="contract-filters">
<button class="cf-btn ${contractFilter==='all'?'active':''}" onclick="contractFilter='all';render()">ทั้งหมด <span class="count">${vis.length}</span></button>
<button class="cf-btn ${contractFilter==='ประจำ'?'active':''}" onclick="contractFilter='ประจำ';render()">✅ ประจำ <span class="count">${permanent.length}</span></button>
<button class="cf-btn ${contractFilter==='ทดลองงาน'?'active':''}" onclick="contractFilter='ทดลองงาน';render()">🔄 ทดลองงาน <span class="count">${trials.length}</span></button>
<button class="cf-btn ${contractFilter==='freelance'?'active':''}" onclick="contractFilter='freelance';render()">💼 Freelance <span class="count">${freelances.length}</span></button>
</div>`;

// File cards grid
h+='<div class="contract-grid">';
filtered.forEach((c,idx)=>{
  const e=EMPS.find(x=>x.id===c.empId);
  const b=BRANCHES.find(x=>x.id===e?.branch);
  const s=cFileStatus(c);
  const iconCls=c.type==='ประจำ'?'permanent':c.type==='ทดลองงาน'?'trial':'freelance';
  const icon=c.type==='ประจำ'?'📋':c.type==='ทดลองงาน'?'⏳':'💼';
  const trialBar=c.type==='ทดลองงาน'?`<div class="c-progress"><div class="c-progress-bar" style="width:${trialDaysInfo(c).pct}%;background:${trialDaysInfo(c).remaining<=14?'var(--accent)':'var(--info)'}"></div></div>`:'';

  h+=`<div class="c-file" onclick="previewContract(${idx})">
  <div class="c-file-top">
    <div class="c-file-icon ${iconCls}">${icon}</div>
    <div class="c-file-info">
      <div class="c-file-name">📎 ${c.file}</div>
      <div class="c-file-emp"><span class="emp-dot" style="background:${e?.c};width:16px;height:16px;font-size:8px">${e?.name[0]}</span>${e?.name} · ${b?.code}</div>
      <div class="c-file-meta">${c.label} · ${thD(c.start)} — ${thD(c.end)}</div>
    </div>
  </div>
  <div class="c-file-bottom">
    <span class="c-file-status ${s.cls}">${s.label}</span>
    ${trialBar}
  </div>
  </div>`;
});
h+='</div>';
el.innerHTML=h;
}

function previewContract(idx){
const emps=visEmps();
const vis=CONTRACTS.filter(c=>emps.some(e=>e.id===c.empId));
const filtered=contractFilter==='all'?vis:vis.filter(c=>c.type===contractFilter);
const c=filtered[idx];if(!c)return;
const e=EMPS.find(x=>x.id===c.empId);
const b=BRANCHES.find(x=>x.id===e?.branch);
const today=new Date();

let trialInfo='';
if(c.type==='ทดลองงาน'){
  const startD=new Date(c.start);
  const elapsed=Math.ceil((today-startD)/(864e5));
  const remaining=Math.max(0,120-elapsed);
  const pct=Math.min(100,Math.round((elapsed/120)*100));
  trialInfo=`
  <div style="margin:12px 0;padding:12px;background:#FFF3E0;border-radius:8px;border-left:4px solid var(--accent)">
    <div style="font-weight:600;color:#E65100;font-size:13px">⏳ สถานะทดลองงาน</div>
    <div style="font-size:12px;margin-top:4px">ผ่านมาแล้ว <b>${elapsed}</b> จาก 120 วัน · เหลืออีก <b style="color:${remaining<=14?'var(--danger)':'var(--info)}'}">${remaining} วัน</b></div>
    <div style="margin-top:6px;height:8px;background:#E0E0E0;border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${remaining<=14?'var(--accent)':'var(--info)'};border-radius:4px"></div></div>
    <div style="font-size:10px;color:var(--tl);margin-top:4px">${pct}% — ${remaining<=0?'ครบกำหนดทดลองงานแล้ว':remaining<=14?'ใกล้ครบกำหนด กรุณาตัดสินใจ':'อยู่ในระหว่างทดลองงาน'}</div>
  </div>`;
}

const typeLabel=c.type==='ประจำ'?'📋 พนักงานประจำ':c.type==='ทดลองงาน'?'⏳ ทดลองงาน':'💼 Freelance';

const body=`
<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
  <span class="emp-dot" style="background:${e?.c};width:36px;height:36px;font-size:14px">${e?.name[0]}</span>
  <div><div style="font-weight:600;font-size:14px">${e?.name} (${e?.code})</div><div style="font-size:12px;color:var(--tl)">${e?.pos} · ${b?.code} ${b?.name}</div></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:8px">
  <div style="background:#FAFAFA;padding:8px 10px;border-radius:6px"><span style="color:var(--tl)">ประเภท</span><br><b>${typeLabel}</b></div>
  <div style="background:#FAFAFA;padding:8px 10px;border-radius:6px"><span style="color:var(--tl)">ไฟล์</span><br><b>${c.file}</b></div>
  <div style="background:#FAFAFA;padding:8px 10px;border-radius:6px"><span style="color:var(--tl)">เริ่มสัญญา</span><br><b>${new Date(c.start+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'})}</b></div>
  <div style="background:#FAFAFA;padding:8px 10px;border-radius:6px"><span style="color:var(--tl)">สิ้นสุดสัญญา</span><br><b>${new Date(c.end+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'})}</b></div>
</div>
${trialInfo}
<div class="preview-pdf">
  <h4>📄 ตัวอย่างสัญญา — ${c.label}</h4>
  <p>สัญญาฉบับนี้ทำขึ้นระหว่าง <b>บริษัท ครูซี่ จำกัด</b> ("นายจ้าง") กับ <b>${e?.name}</b> ("ลูกจ้าง")</p>
  <p>ตำแหน่ง: <b>${e?.pos}</b> ประจำสาขา <b>${b?.name}</b></p>
  <p>อัตราเงินเดือน: <b>฿${e?.salary?.toLocaleString('th-TH')}</b>/เดือน</p>
  <p>ระยะเวลา: ${new Date(c.start+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'})} ถึง ${new Date(c.end+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'})}</p>
  ${c.type==='ทดลองงาน'?'<p style="color:var(--accent)"><b>หมายเหตุ:</b> ระยะทดลองงานไม่เกิน 120 วัน นับจากวันเริ่มทำงาน</p>':''}
  ${c.type==='freelance'?'<p style="color:var(--info)"><b>หมายเหตุ:</b> สัญญา Freelance — คิดค่าจ้างตามจำนวนวันที่ทำงานจริง</p>':''}
  <div class="sig">
    <div class="sig-box">ผู้ว่าจ้าง</div>
    <div class="sig-box">ลูกจ้าง</div>
    <div class="sig-box">พยาน</div>
  </div>
</div>`;

const foot=`<button class="btn btn-ghost" onclick="closeModal()">ปิด</button>
<button class="btn btn-primary" onclick="toast('📥 ดาวน์โหลด ${c.file}');closeModal()">📥 ดาวน์โหลด</button>
${c.type==='ทดลองงาน'?`<button class="btn btn-primary" style="background:var(--accent)" onclick="toast('📝 แปลงเป็นสัญญาประจำ');closeModal()">📝 แปลงเป็นประจำ</button>`:''}`;

openModal(`📄 ${c.file}`,body,foot);
}

// ================================
// ATTENDANCE (การเข้างาน / วินัย)
// ================================
function renderEmpAttendance(el){
const emps=visEmps();
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const dates=dRange(selDate,selDateTo);
const vis=ATTENDANCE.filter(a=>bids.includes(a.branch)&&dates.includes(a.date));

const totalLate=vis.filter(a=>a.lateMin>0).length;
const totalBreakOver=vis.filter(a=>a.breakOver).length;
const avgLate=vis.length?Math.round(vis.reduce((s,a)=>s+a.lateMin,0)/vis.length):0;

let h=`<div class="stats-row">
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${vis.length}</div><div class="stat-label">รายการเข้างาน</div></div>
<div class="stat-card ${totalLate?'red':''}"><div class="stat-num" style="color:${totalLate?'var(--danger)':'var(--primary)'}">${totalLate}</div><div class="stat-label">สาย</div></div>
<div class="stat-card ${totalBreakOver?'orange':''}"><div class="stat-num" style="color:${totalBreakOver?'var(--accent)':'var(--primary)'}">${totalBreakOver}</div><div class="stat-label">พักเกิน 60 นาที</div></div>
<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">${avgLate} น.</div><div class="stat-label">เฉลี่ยสาย</div></div>
</div>`;

// Discipline summary per employee
h+=`<div class="tw"><div class="tw-head"><h3>📊 สรุปวินัย (${thD(selDate)}${selDate!==selDateTo?' — '+thD(selDateTo):''})</h3></div><table><tr><th>พนักงาน</th><th>สาขา</th><th>วันทำงาน</th><th>สาย</th><th>รวมสาย (นาที)</th><th>พักเกิน</th><th>วินัย</th></tr>`;
emps.forEach(e=>{
  const ea=vis.filter(a=>a.empId===e.id);
  if(!ea.length)return;
  const b=BRANCHES.find(x=>x.id===e.branch);
  const lateCount=ea.filter(a=>a.lateMin>0).length;
  const totalLateMins=ea.reduce((s,a)=>s+a.lateMin,0);
  const breakOverCount=ea.filter(a=>a.breakOver).length;
  let disc,discCls;
  if(lateCount>=3||breakOverCount>=2){disc='⚠️ ต้องตักเตือน';discCls='color:var(--danger);font-weight:700';}
  else if(lateCount>=1||breakOverCount>=1){disc='📝 ควรสังเกต';discCls='color:var(--accent);font-weight:600';}
  else{disc='✅ ดี';discCls='color:var(--primary)';}
  h+=`<tr><td><span class="emp-dot" style="background:${e.c}">${e.name[0]}</span>${e.name}</td><td>${b?.code}</td><td>${ea.length}</td><td style="color:${lateCount?'var(--danger)':'var(--primary)'}"><b>${lateCount}</b></td><td style="color:${totalLateMins>30?'var(--danger)':'var(--text)'}">${totalLateMins}</td><td style="color:${breakOverCount?'var(--accent)':'var(--text)'}">${breakOverCount}</td><td style="${discCls}">${disc}</td></tr>`;
});
h+='</table></div>';

// Daily detail
h+=`<div class="tw"><div class="tw-head"><h3>🕐 รายละเอียดรายวัน</h3></div><table><tr><th>วันที่</th><th>พนักงาน</th><th>สาขา</th><th>เข้างาน</th><th>ออกงาน</th><th>สาย</th><th>เริ่มพัก</th><th>พัก (นาที)</th><th>สถานะ</th></tr>`;
vis.sort((a,b)=>a.date.localeCompare(b.date)||a.empId.localeCompare(b.empId)).forEach(a=>{
  const e=EMPS.find(x=>x.id===a.empId);
  const b=BRANCHES.find(x=>x.id===a.branch);
  const lateTag=a.lateMin>0?`<span style="color:var(--danger);font-weight:700">สาย ${a.lateMin} น.</span>`:'<span style="color:var(--primary)">✅ ตรงเวลา</span>';
  const breakTag=a.breakOver?`<span style="color:var(--accent);font-weight:600">${a.breakMins} ⚠️</span>`:`${a.breakMins}`;
  let status;
  if(a.lateMin>0&&a.breakOver)status='<span class="badge rejected">สาย+พักเกิน</span>';
  else if(a.lateMin>0)status='<span class="badge pending">สาย</span>';
  else if(a.breakOver)status='<span class="badge waiting">พักเกิน</span>';
  else status='<span class="badge approved">ปกติ</span>';
  h+=`<tr><td style="font-weight:600">${thD(a.date)}</td><td><span class="emp-dot" style="background:${e?.c}">${e?.name[0]}</span>${e?.name}</td><td>${b?.code}</td><td style="font-weight:600;color:${a.lateMin>0?'var(--danger)':'var(--primary)'}">${a.clockIn}</td><td>${a.clockOut||'<span style="color:var(--tl)">—ยังไม่ออก</span>'}</td><td>${lateTag}</td><td>${a.breakStart}</td><td>${breakTag}</td><td>${status}</td></tr>`;
});
h+='</table></div>';
el.innerHTML=h;
}

// ================================
// SALES

function renderPayroll(el){
const emps=visEmps();
const rows=emps.map(e=>({e,summary:employeePayrollSummary(e.id,selDate,selDateTo)}));
const totalBase=rows.reduce((sum,row)=>sum+row.summary.basePay,0);
const dailyRows=rows.filter(row=>row.summary.profile.payType==='daily');
const monthlyRows=rows.filter(row=>row.summary.profile.payType==='monthly');
let h=`<div class="stats-row">
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">฿${nf(totalBase)}</div><div class="stat-label">ฐานเงินเดือน/ค่าแรง</div></div>
<div class="stat-card orange"><div class="stat-num" style="color:var(--accent)">${monthlyRows.length}</div><div class="stat-label">รายเดือน</div></div>
<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">${dailyRows.length}</div><div class="stat-label">รายวัน</div></div>
<div class="stat-card red"><div class="stat-num" style="color:var(--danger)">${rows.reduce((s,r)=>s+r.summary.lateMinutes,0)}</div><div class="stat-label">นาทีสาย</div></div>
</div>`;
h+=`<div class="tw"><div class="tw-head"><h3>💵 สรุปค่าจ้าง (${thD(selDate)}${selDate!==selDateTo?' — '+thD(selDateTo):''})</h3></div><table><tr><th>พนักงาน</th><th>รูปแบบ</th><th>วันทำงาน</th><th>ฐานจ่าย</th><th>สาย</th><th>ค่าคอม</th><th>หมายเหตุ</th></tr>`;
rows.forEach(({e,summary})=>{
const p=summary.profile;
const payType=p.payType==='daily'?'รายวัน':'รายเดือน';
const rate=p.payType==='daily'?`฿${nf(p.dailyRate)}/วัน`:`฿${nf(p.monthlySalary||e.salary)}/เดือน`;
const note=p.payType==='daily'?'คิดจากวันทำงานจริง':'ฐานรายเดือน ยังไม่รวมขาด/หัก';
h+=`<tr><td><span class="emp-dot" style="background:${e.c}">${e.name[0]}</span>${e.name}</td><td>${payType}<div style="font-size:10px;color:var(--tl)">${rate}</div></td><td>${summary.workedDays}</td><td style="font-weight:700">฿${nf(summary.basePay)}</td><td style="color:${summary.lateMinutes?'var(--danger)':'var(--text)'}">${summary.lateMinutes} นาที</td><td>${summary.commissionEnabled?'<span class="badge approved">เปิด</span>':'<span class="badge expired">ปิด</span>'}</td><td style="color:var(--tl);font-size:11px">${note}</td></tr>`;
});
h+='</table></div>';
el.innerHTML=h;
}
