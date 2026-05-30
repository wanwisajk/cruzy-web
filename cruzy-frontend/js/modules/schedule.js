// SCHEDULE (จัดคน + สลับ + Alert + AI)
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
    const q=BRANCH_QUOTA[b.id]||{weekday:1,weekend:1};
    const isWE=fd.getDay()===0||fd.getDay()===6;
    const need=isWE?q.weekend:q.weekday;
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
  const q=BRANCH_QUOTA[b.id]||{weekday:1};
  totalWorking+=eids.length;
  if(!eids.length)emptyCount++;
  if(eids.length<q.weekday)shortCount++;
});

h+=`<div class="stats-row">
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${totalWorking}</div><div class="stat-label">เข้างานวันนี้</div></div>
<div class="stat-card ${emptyCount?'red':''}"><div class="stat-num" style="color:${emptyCount?'var(--danger)':'var(--primary)'}">${emptyCount}</div><div class="stat-label">สาขาว่าง</div></div>
<div class="stat-card ${shortCount?'orange':''}"><div class="stat-num" style="color:${shortCount?'var(--accent)':'var(--primary)'}">${shortCount}</div><div class="stat-label">คนไม่พอ</div></div>
<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">${dangerAlerts.length+warnAlerts.length}</div><div class="stat-label">⚠️ แจ้งเตือน</div></div>
</div>`;

// AI Recommendation
h+=`<div class="ai-box"><h4>🤖 AI แนะนำจัดตาราง (สัปดาห์นี้)</h4><div style="font-size:11px;color:var(--tl);margin-bottom:8px">ตาม quota + ความถนัดสาขา + วันหยุดที่อนุมัติ</div><div>`;
branches.forEach(b=>{
  const q=BRANCH_QUOTA[b.id]||{weekday:1};
  const canWork=Object.entries(EMP_BRANCHES).filter(([eid,brs])=>brs.includes(b.id)).map(([eid])=>EMPS.find(x=>x.id===eid)).filter(Boolean);
  h+=`<div style="margin-bottom:6px"><span style="font-weight:600;font-size:11px">${b.code}</span> <span style="font-size:10px;color:var(--tl)">ต้องการ ${q.weekday} คน/วัน</span> → `;
  canWork.slice(0,q.weekday).forEach(e=>{h+=`<span class="ai-chip" onclick="toast('✅ จัดให้ ${e.name} → ${b.code}')"><span class="emp-dot" style="background:${e.c};width:14px;height:14px;font-size:7px">${e.name[0]}</span>${e.name}</span>`;});
  h+=`</div>`;
});
h+=`</div><div style="margin-top:8px"><button class="btn btn-primary" onclick="toast('🤖 AI จัดตารางอัตโนมัติ สัปดาห์ 19-25 พ.ค.')">✨ ใช้ AI จัดตารางทั้งสัปดาห์</button></div></div>`;

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
    const q=BRANCH_QUOTA[b.id]||{weekday:1,weekend:1};
    const isWE=d.getDay()===0||d.getDay()===6;
    const need=isWE?q.weekend:q.weekday;
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
const q=BRANCH_QUOTA[b.id]||{weekday:1};
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
const allEmps=visBranches().flatMap(br=>branchEmps(br.id));
const unique=[...new Map(allEmps.map(e=>[e.id,e])).values()];

let body=`<div style="margin-bottom:10px;font-size:12px;color:var(--tl)">เลือกพนักงานที่จะเข้าทำงาน <b>${b?.code}</b> วันที่ <b>${thD(date)}</b></div>`;
body+='<div class="assign-list">';
unique.forEach(e=>{
  const alreadyIn=existing.includes(e.id);
  const canBranches=EMP_BRANCHES[e.id]||[];
  const canGo=canBranches.includes(branchId);
  const busyAt=visBranches().find(br=>(SCH[`${br.id}_${date}`]||[]).includes(e.id));
  const disabled=alreadyIn;
  body+=`<div class="assign-emp ${disabled?'disabled':''}" onclick="${disabled?'':`addToSch('${branchId}','${date}','${e.id}');closeModal()`}">`;
  body+=`<span class="emp-dot" style="background:${e.c}">${e.name[0]}</span>`;
  body+=`<div><div style="font-weight:600;font-size:12px">${e.name} (${e.code})</div><div style="font-size:10px;color:var(--tl)">${e.pos} · ${BRANCHES.find(x=>x.id===e.branch)?.code}</div></div>`;
  body+=`<div class="tags">`;
  if(canGo)body+=`<span class="tag can">✓ quota</span>`;
  else body+=`<span class="tag">✗ ไม่อยู่ quota</span>`;
  if(alreadyIn)body+=`<span class="tag" style="background:#E8F5E9;color:var(--primary)">อยู่แล้ว</span>`;
  else if(busyAt)body+=`<span class="tag" style="background:#FFF3E0;color:#E65100">อยู่ ${busyAt.code}</span>`;
  body+=`</div></div>`;
});
body+='</div>';
openModal(`➕ จัดคนเข้า ${b?.code} — ${thD(date)}`,body,`<button class="btn btn-ghost" onclick="closeModal()">ปิด</button>`);
}

async function addToSch(branchId,date,empId){
const key=`${branchId}_${date}`;
try{
const res=await fetch(`${API_URL}/schedule/assign`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bid:branchId,date,eid:empId})});
const result=await res.json().catch(()=>({}));
if(!res.ok)throw new Error(result.message||'เพิ่มตารางงานไม่สำเร็จ');
if(!SCH[key])SCH[key]=[];
if(!SCH[key].includes(empId)){SCH[key].push(empId);toast(`✅ เพิ่ม ${EMPS.find(e=>e.id===empId)?.name} → ${BRANCHES.find(b=>b.id===branchId)?.code} ${thD(date)}`);}
render();
}catch(err){toast(err.message||'เพิ่มตารางงานไม่สำเร็จ');}
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
