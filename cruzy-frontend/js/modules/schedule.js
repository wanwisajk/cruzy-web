// SCHEDULE (จัดคน + สลับ + Alert + Rule-based)
// ================================
let schView='planner'; // planner | overview

function renderSchedule(el){
const st=document.getElementById('subTabs');
st.innerHTML=`<button class="sub-tab ${schView==='planner'?'active':''}" onclick="schView='planner';render()">📋 จัดตาราง</button><button class="sub-tab ${schView==='overview'?'active':''}" onclick="schView='overview';render()">📊 ภาพรวม</button>`;
if(schView==='planner')renderSchPlanner(el);
else renderSchOverview(el);
}

function renderSchPlanner(el){
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const branches=BRANCHES.filter(b=>bids.includes(b.id));
const days=[];{let c=new Date(selDate+'T00:00:00');const e=new Date(selDateTo+'T00:00:00');while(c<=e){days.push(new Date(c));c.setDate(c.getDate()+1);}}
const today=fmtD(new Date());

// Alerts: empty branches in next 30 days
let alerts=[];
for(let ahead=0;ahead<=30;ahead++){
  const fd=new Date((selDate||today)+'T00:00:00');fd.setDate(fd.getDate()+ahead);
  const ds=fmtD(fd);
  branches.forEach(b=>{
    const eids=SCH[`${b.id}_${ds}`]||[];
    const need=requiredStaffFor(b.id,ds);
    if(eids.length<need){
      const daysAway=ahead;
      if(daysAway<=7)alerts.push({type:'danger',branch:b,date:ds,have:eids.length,need,daysAway,msg:`🚨 ${b.code} วันที่ ${thD(ds)} — ต้องการ ${need} คน มี ${eids.length} คน (อีก ${daysAway} วัน)`});
      else if(daysAway<=30)alerts.push({type:'warn',branch:b,date:ds,have:eids.length,need,daysAway,msg:`⚠️ ${b.code} วันที่ ${thD(ds)} — ต้องการ ${need} คน มี ${eids.length} คน (อีก ${daysAway} วัน)`});
    }
  });
}
// Limit alerts
const dangerAlerts=alerts.filter(a=>a.type==='danger').slice(0,5);
const warnAlerts=alerts.filter(a=>a.type==='warn').slice(0,3);

let h='';
// Show alerts
if(dangerAlerts.length){
  dangerAlerts.forEach(a=>{h+=`<div class="alert-bar danger"><span>${a.msg}</span><button class="alert-action" onclick="openAssignModal('${a.branch.id}','${a.date}')">จัดคน</button></div>`;});
}
if(warnAlerts.length){
  warnAlerts.forEach(a=>{h+=`<div class="alert-bar warn"><span>${a.msg}</span><button class="alert-action" onclick="openAssignModal('${a.branch.id}','${a.date}')">จัดคน</button></div>`;});
}

// Leave impact alerts
const approvedLeaves=LEAVES.filter(l=>l.status==='approved'||l.status==='pending');
approvedLeaves.forEach(l=>{
  const e=EMPS.find(x=>x.id===l.empId);
  if(!e||!bids.includes(e.branch))return;
  const fromD=new Date(l.from+'T00:00:00');const toD=new Date(l.to+'T00:00:00');
  if(fromD>new Date('2026-06-22'))return;
  const b=BRANCHES.find(x=>x.id===e.branch);
  if(l.status==='approved')h+=`<div class="alert-bar info"><span>📝 ${e.name} (${b?.code}) ลา ${l.type} ${thD(l.from)}${l.from!==l.to?' — '+thD(l.to):''} — ตารางจะว่าง</span><button class="alert-action" onclick="openAssignModal('${e.branch}','${l.from}')">หาคนแทน</button></div>`;
});

// Stats
let totalWorking=0,emptyCount=0,shortCount=0;
branches.forEach(b=>{
  const eids=SCH[`${b.id}_${today}`]||[];
  const need=requiredStaffFor(b.id,today);
  totalWorking+=eids.length;
  if(!eids.length)emptyCount++;
  if(eids.length<need)shortCount++;
});

h+=`<div class="stats-row">
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${totalWorking}</div><div class="stat-label">เข้างานวันนี้</div></div>
<div class="stat-card ${emptyCount?'red':''}"><div class="stat-num" style="color:${emptyCount?'var(--danger)':'var(--primary)'}">${emptyCount}</div><div class="stat-label">สาขาว่าง</div></div>
<div class="stat-card ${shortCount?'orange':''}"><div class="stat-num" style="color:${shortCount?'var(--accent)':'var(--primary)'}">${shortCount}</div><div class="stat-label">คนไม่พอ</div></div>
<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">${dangerAlerts.length+warnAlerts.length}</div><div class="stat-label">⚠️ แจ้งเตือน</div></div>
</div>`;

// Rule-based Recommendation
h+=`<div class="ai-box"><h4>แนะนำจัดตารางตามกติกา</h4><div style="font-size:11px;color:var(--tl);margin-bottom:8px">กรองจากสาขาที่ลงได้ + วันว่าง/วันหยุด + ไม่ชนตารางเดิม + กระจายจำนวนวันทำงาน</div><div>`;
branches.forEach(b=>{
  h+=`<div style="margin-bottom:6px"><span style="font-weight:600;font-size:11px">${b.code}</span> <span style="font-size:10px;color:var(--tl)">ช่วงวันที่เลือก</span> → `;
  const recs=days.flatMap(d=>recommendedEmployees(b.id,fmtD(d),{from:selDate,to:selDateTo}).map(c=>({date:fmtD(d),...c}))).slice(0,5);
  if(!recs.length)h+=`<span style="font-size:11px;color:var(--tl)">ยังไม่มีช่องว่างหรือไม่มีคนที่ตรงกติกา</span>`;
  recs.forEach(c=>{h+=`<span class="ai-chip" onclick="addToSch('${b.id}','${c.date}','${c.emp.id}')"><span class="emp-dot" style="background:${c.emp.c};width:14px;height:14px;font-size:7px">${c.emp.name[0]}</span>${c.emp.name} · ${thD(c.date)}</span>`;});
  h+=`</div>`;
});
h+=`</div><div style="margin-top:8px"><button class="btn btn-primary" onclick="autoFillScheduleRange()">จัดอัตโนมัติตามกติกา</button></div></div>`;

// Weekly planner grid
h+=`<div class="sch-week" style="grid-template-columns:100px repeat(${days.length},1fr)"><div class="sch-header" style="font-weight:700">สาขา</div>`;
days.forEach(d=>{
  const ds=fmtD(d);const isTd=ds===today;
  h+=`<div class="sch-header ${isTd?'today':''}">${d.toLocaleDateString('th-TH',{weekday:'short'})}<br>${d.getDate()}</div>`;
});

branches.forEach(b=>{
  h+=`<div class="sch-branch-label"><span>${b.code}</span></div>`;
  days.forEach(d=>{
    const ds=fmtD(d);
    const eids=SCH[`${b.id}_${ds}`]||[];
    const need=requiredStaffFor(b.id,ds);
    const short=eids.length<need;
    const empty=!eids.length;
    h+=`<div class="sch-cell ${empty&&need>0?'empty-danger':short?'empty-alert':''}">`;
    eids.forEach(eid=>{
      const e=EMPS.find(x=>x.id===eid);
      if(e)h+=`<span class="sch-emp-chip"><span class="emp-dot" style="background:${e.c};width:14px;height:14px;font-size:7px">${e.name[0]}</span>${e.name}<span class="x" onclick="event.stopPropagation();removeFromSch('${b.id}','${ds}','${eid}')">×</span></span>`;
    });
    h+=`<button class="sch-add-btn" onclick="openAssignModal('${b.id}','${ds}')">+</button>`;
    h+=`<div class="sch-quota ${short?'short':'ok'}">${eids.length}/${need}</div>`;
    h+=`</div>`;
  });
});
h+=`</div>`;

el.innerHTML=h;
}

function renderSchOverview(el){
const ds=selDate;
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const branches=BRANCHES.filter(b=>bids.includes(b.id));
const rangeDates=dRange(selDate,selDateTo);
let totalWorking=0,emptyCount=0;
branches.forEach(b=>{const w=(SCH[`${b.id}_${ds}`]||[]).length;totalWorking+=w;if(!w)emptyCount++;});

let h=`<div class="stats-row">
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${totalWorking}</div><div class="stat-label">เข้างานวันนี้</div></div>
<div class="stat-card ${emptyCount?'red':''}"><div class="stat-num" style="color:${emptyCount?'var(--danger)':'var(--primary)'}">${emptyCount}</div><div class="stat-label">สาขาว่าง</div></div>
</div>`;

h+='<div class="branch-grid">';
branches.forEach(b=>{
const eids=SCH[`${b.id}_${ds}`]||[];
const q={weekday:requiredStaffFor(b.id,ds)};
const isEmpty=!eids.length;
const short=eids.length<q.weekday;
h+=`<div class="b-card"><div class="b-card-head ${isEmpty?'empty':short?'':''}"><span>🏢 ${b.code}</span><span>${eids.length}/${q.weekday} คน</span></div><div class="b-card-body">`;
if(isEmpty)h+='<div style="color:var(--danger);text-align:center;padding:8px;font-size:12px;font-weight:600">❌ ว่าง — <button class="action-btn approve" onclick="openAssignModal(\''+b.id+'\',\''+ds+'\')">จัดคน</button></div>';
else{
  eids.forEach(eid=>{const e=EMPS.find(x=>x.id===eid);if(e)h+=`<div class="b-emp"><span class="emp-dot" style="background:${e.c}">${e.name[0]}</span>${e.name}</div>`;});
  if(short)h+=`<div style="color:var(--accent);font-size:11px;padding:4px 0;font-weight:600">⚠️ ยังขาดอีก ${q.weekday-eids.length} คน <button class="action-btn approve" onclick="openAssignModal('${b.id}','${ds}')">เพิ่ม</button></div>`;
}
h+='</div></div>';
});
h+='</div>';
el.innerHTML=h;
}

// Assign modal: pick employee to add to branch/date
function openAssignModal(branchId,date){
const b=BRANCHES.find(x=>x.id===branchId);
const existing=SCH[`${branchId}_${date}`]||[];
const unique=scheduleCandidates(branchId,date,{from:selDate,to:selDateTo});

let body=`<div style="margin-bottom:10px;font-size:12px;color:var(--tl)">เลือกพนักงานที่จะเข้าทำงาน <b>${b?.code}</b> วันที่ <b>${thD(date)}</b></div>`;
body+='<div class="assign-list">';
unique.forEach(c=>{
  const e=c.emp;
  const disabled=c.disabled;
  body+=`<div class="assign-emp ${disabled?'disabled':''}" onclick="${disabled?'':`addToSch('${branchId}','${date}','${e.id}');closeModal()`}">`;
  body+=`<span class="emp-dot" style="background:${e.c}">${e.name[0]}</span>`;
  body+=`<div><div style="font-weight:600;font-size:12px">${e.name} (${e.code})</div><div style="font-size:10px;color:var(--tl)">${e.pos} · คะแนน ${c.score}</div></div>`;
  body+=`<div class="tags">`;
  if(c.canBranch)body+=`<span class="tag can">ลงสาขานี้ได้</span>`;
  else body+=`<span class="tag">ไม่ได้ตั้งค่าสาขา</span>`;
  if(c.available)body+=`<span class="tag can">ว่าง</span>`;
  else body+=`<span class="tag" style="background:#FFEBEE;color:#C62828">ไม่ว่าง</span>`;
  if(c.alreadyIn)body+=`<span class="tag" style="background:#E8F5E9;color:var(--primary)">อยู่แล้ว</span>`;
  else if(c.busyAt)body+=`<span class="tag" style="background:#FFF3E0;color:#E65100">อยู่ ${c.busyAt.code}</span>`;
  body+=`</div></div>`;
});
body+='</div>';
openModal(`➕ จัดคนเข้า ${b?.code} — ${thD(date)}`,body,`<button class="btn btn-ghost" onclick="closeModal()">ปิด</button>`);
}

async function addToSch(branchId,date,empId){
const key=`${branchId}_${date}`;
try{
const shift=shiftFor(branchId,date);
const res=await fetch(`${API_URL}/schedule/assign`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bid:branchId,date,eid:empId,shiftStart:shift.start,shiftEnd:shift.end})});
const result=await res.json().catch(()=>({}));
if(!res.ok)throw new Error(result.message||'เพิ่มตารางงานไม่สำเร็จ');
if(!SCH[key])SCH[key]=[];
if(!SCH[key].includes(empId)){SCH[key].push(empId);toast(`✅ เพิ่ม ${EMPS.find(e=>e.id===empId)?.name} → ${BRANCHES.find(b=>b.id===branchId)?.code} ${thD(date)}`);}
render();
}catch(err){toast(err.message||'เพิ่มตารางงานไม่สำเร็จ');}
}

async function autoFillScheduleRange(){
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const dates=dRange(selDate,selDateTo);
let added=0,failed=0;
for(const date of dates){
  for(const branchId of bids){
    let existing=SCH[`${branchId}_${date}`]||[];
    let need=requiredStaffFor(branchId,date);
    while(existing.length<need){
      const rec=recommendedEmployees(branchId,date,{from:selDate,to:selDateTo})[0];
      if(!rec)break;
      const before=existing.length;
      await addToSch(branchId,date,rec.emp.id);
      existing=SCH[`${branchId}_${date}`]||[];
      if(existing.length>before)added++;else{failed++;break;}
    }
  }
}
toast(added?`จัดอัตโนมัติแล้ว ${added} รายการ`:`ยังไม่มีรายการที่จัดเพิ่มได้${failed?' บางรายการติดเงื่อนไข':''}`);
render();
}
async function removeFromSch(branchId,date,empId){
const key=`${branchId}_${date}`;
try{
const res=await fetch(`${API_URL}/schedule/remove`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bid:branchId,date,eid:empId})});
const result=await res.json().catch(()=>({}));
if(!res.ok)throw new Error(result.message||'ลบตารางงานไม่สำเร็จ');
if(SCH[key]){SCH[key]=SCH[key].filter(id=>id!==empId);toast(`🗑 ลบ ${EMPS.find(e=>e.id===empId)?.name} ออกจาก ${BRANCHES.find(b=>b.id===branchId)?.code} ${thD(date)}`);}
render();
}catch(err){toast(err.message||'ลบตารางงานไม่สำเร็จ');}
}

// ================================
