const API_URL = window.__APP_CONFIG?.API_URL || '/api';
let BRANCHES = [];
let EMPS = [];

let DB={};
let curView='weekly';
let weekStart=monday(new Date());
let curMonth=new Date(); curMonth.setDate(1);
let curDay=new Date();
let selectedBranches=['b1','b2','b3','b4']; 
let dragEid=null;
let dragFromBid=null; 
let dragFromDate=null;

// === FETCH DATA FROM BACKEND ===
// === ฟังก์ชันดึงข้อมูลสาขาจาก DB ===
async function fetchBranches() {
  try {
    const res = await fetch(`${API_URL}/branches`);
    if (!res.ok) throw new Error('Failed to fetch branches');
    BRANCHES = await res.json();
    // ถ้าดึงข้อมูลเสร็จแล้วและตัวแปรอื่นๆ พร้อม จะช่วยให้ระบบทำงานได้ถูกต้อง
  } catch (error) {
    console.error('Error fetching branches:', error);
    toast('❌ ดึงข้อมูลสาขาล้มเหลว', 't-err');
  }
}

// === ฟังก์ชันดึงข้อมูลพนักงานจาก DB ===
async function fetchEmployees() {
  try {
    const res = await fetch(`${API_URL}/employees`);
    if (!res.ok) throw new Error('Failed to fetch employees');
    EMPS = await res.json();
    renderEmps(); // พอดึงพนักงานมาแล้ว สั่งให้ Sidebar แสดงผลรายชื่อทันที
  } catch (error) {
    console.error('Error fetching employees:', error);
    toast('❌ ดึงข้อมูลพนักงานล้มเหลว', 't-err');
  }
}

// === ฟังก์ชันรวมสำหรับสั่งโหลดข้อมูลทั้งหมดพร้อมกันตอนเปิดแอป ===
async function initApp() {
  try {
    // โหลดข้อมูลพนักงาน และ สาขามารอก่อนพร้อมๆ กัน
    await Promise.all([fetchBranches(), fetchEmployees()]);
    
    // ตั้งค่าสาขาเริ่มต้นที่เลือก (ติ๊กถูกทุกสาขา)
    selectedBranches = BRANCHES.map(b => b.id);
    
    // หลังจากได้ข้อมูลพนักงานและสาขาแล้ว ค่อยไปดึงตารางงานและแสดงผลหน้าเว็บ
    renderControls();
    await fetchSchedules(); 
  } catch (error) {
    console.error('Init app error:', error);
  }
}
async function fetchSchedules() {
  try {
    const res = await fetch(`${API_URL}/schedule`);
    if (!res.ok) throw new Error('Network response was not ok');
    DB = await res.json();
    renderView();
  } catch (error) {
    console.error('Error fetching data:', error);
    toast('❌ ดึงข้อมูลจากเซิร์ฟเวอร์ล้มเหลว', 't-err');
  }
}

// === API CALL FOR ASSIGNING SCHEDULE ===
async function assignSchedule(bid, date, eid) {
  const existing = getEmpBranchOnDate(eid, date);
  if (existing) {
    const emp = EMPS.find(e => e.id === eid);
    if (existing.id === bid) {
      toast(`${emp.name} อยู่สาขานี้แล้ว`, 't-err');
      return false;
    }
    toast(`❌ ${emp.name} ลงที่ ${existing.name} แล้ว (1คน=1สาขา/วัน)`, 't-err');
    return false;
  }

  try {
    const res = await fetch(`${API_URL}/schedule/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bid, date, eid })
    });
    const result = await res.json();
    if (!res.ok) {
      toast(`❌ ${result.message}`, 't-err');
      return false;
    }
    
    const k = `${bid}_${date}`;
    if (!DB[k]) DB[k] = [];
    DB[k].push(eid);
    return true;
  } catch (error) {
    console.error(error);
    toast('❌ ไม่สามารถบันทึกข้อมูลได้', 't-err');
    return false;
  }
}

// === API CALL FOR REMOVING SCHEDULE ===
async function removeSchedule(bid, date, eid) {
  try {
    const res = await fetch(`${API_URL}/schedule/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bid, date, eid })
    });
    if (!res.ok) {
      toast('❌ ลบข้อมูลจากเซิร์ฟเวอร์ล้มเหลว', 't-err');
      return false;
    }
    
    const k = `${bid}_${date}`;
    if (DB[k]) {
      DB[k] = DB[k].filter(e => e !== eid);
      if (DB[k].length === 0) delete DB[k];
    }
    return true;
  } catch (error) {
    console.error(error);
    toast('❌ เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อลบ', 't-err');
    return false;
  }
}

// === LOCAL CONSTRAINT HELPER ===
function getEmpBranchOnDate(eid,date){
  for(const b of BRANCHES){const k=`${b.id}_${date}`;if(DB[k]&&DB[k].includes(eid))return b}return null;
}

// === TRANSFER (cross-branch) ===
async function transferEmployee(fromBid,toBid,date,eid){
  const removeSuccess = await removeSchedule(fromBid,date,eid);
  if(!removeSuccess) return;
  
  const assignSuccess = await assignSchedule(toBid,date,eid);
  if(!assignSuccess) {
    await fetchSchedules();
    return;
  }
  
  const emp=EMPS.find(e=>e.id===eid);
  const from=BRANCHES.find(b=>b.id===fromBid);
  const to=BRANCHES.find(b=>b.id===toBid);
  toast(`🔄 โอน ${emp.name}: ${from.code} → ${to.code}`,'t-ok');
  broadcastRealtime('transfer',emp.name,date);
  renderView();
}

// === ALERTS ===
function findAlerts(start,days){
  const a=[];for(let i=0;i<days;i++){const dt=new Date(start);dt.setDate(dt.getDate()+i);const ds=fmt(dt);
  for(const b of BRANCHES){const k=`${b.id}_${ds}`;if(!DB[k]||DB[k].length===0)a.push({branch:b,date:ds,dateObj:dt})}}return a;
}
function renderAlerts(){
  let alerts;
  if(curView==='monthly'){const dim=new Date(curMonth.getFullYear(),curMonth.getMonth()+1,0).getDate();alerts=findAlerts(curMonth,dim)}
  else if(curView==='daily')alerts=findAlerts(curDay,1);
  else alerts=findAlerts(weekStart,7);
  const bar=document.getElementById('alertBar'),chips=document.getElementById('alertChips');
  if(!alerts.length){bar.classList.remove('show');return}
  bar.classList.add('show');
  chips.innerHTML=alerts.slice(0,15).map(a=>{
    const dl=new Date(a.date).toLocaleDateString('th-TH',{weekday:'short',day:'numeric',month:'short'});
    return `<div class="alert-chip" onclick="jumpToDate('${a.date}')">${a.branch.code} — ${dl} ❌</div>`;
  }).join('')+(alerts.length>15?`<div class="alert-chip">+${alerts.length-15}</div>`:'');
}

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
  switchView('weekly'); // เปิดมาให้แสดงหน้ารายสัปดาห์ก่อน
  initApp();            // เรียกฟังก์ชันโหลดข้อมูลพนักงาน สาขา และตารางงานจาก DB ทั้งหมด
});

// === VIEW SWITCHING ===
function switchView(v){
  curView=v;
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===v));
  const sb=document.getElementById('empSidebar'),mc=document.getElementById('mainContent');
  sb.style.display=(v==='weekly'||v==='branch')?'':'none';
  mc.classList.toggle('content-with-sidebar',v==='weekly'||v==='branch');
  renderControls();renderView();renderAlerts();
}

function branchTogglesHTML(id){
  return `<div class="branch-toggles" id="${id}">${BRANCHES.map(b=>
    `<button class="b-toggle ${selectedBranches.includes(b.id)?'on':''}" data-bid="${b.id}" onclick="toggleBranch('${b.id}',this)">${b.code}</button>`
  ).join('')}</div>`;
}
function toggleBranch(bid,el){
  if(selectedBranches.includes(bid)){
    if(selectedBranches.length===1)return; 
    selectedBranches=selectedBranches.filter(x=>x!==bid);el.classList.remove('on');
  }else{selectedBranches.push(bid);el.classList.add('on')}
  renderView();
}

function renderControls(){
  const c=document.getElementById('controls');
  if(!c) return;
  if(curView==='weekly'){
    c.innerHTML=`<div class="ctrl-group"><button class="nav-arrow" onclick="moveWeek(-1)">◀</button>
      <div class="period-label" id="periodLabel"></div><button class="nav-arrow" onclick="moveWeek(1)">▶</button>
      <button class="btn-today" onclick="goToday()">วันนี้</button></div><div class="spacer"></div>
      ${branchTogglesHTML('weekToggles')}
      <button class="btn btn-primary" onclick="openModal()">+ เพิ่ม</button>`;
  }else if(curView==='daily'){
    c.innerHTML=`<div class="ctrl-group"><button class="nav-arrow" onclick="moveDay(-1)">◀</button>
      <div class="period-label" id="periodLabel"></div><button class="nav-arrow" onclick="moveDay(1)">▶</button>
      <button class="btn-today" onclick="goTodayDaily()">วันนี้</button></div><div class="spacer"></div>
      <button class="btn btn-primary" onclick="openModal()">+ เพิ่ม</button>`;
  }else if(curView==='monthly'){
    c.innerHTML=`<div class="ctrl-group"><button class="nav-arrow" onclick="moveMonth(-1)">◀</button>
      <div class="period-label" id="periodLabel"></div><button class="nav-arrow" onclick="moveMonth(1)">▶</button>
      <button class="btn-today" onclick="goTodayMonth()">เดือนนี้</button></div><div class="spacer"></div>
      ${branchTogglesHTML('monthToggles')}`;
  }else if(curView==='branch'){
    c.innerHTML=`<div class="ctrl-group"><button class="nav-arrow" onclick="moveWeek(-1)">◀</button>
      <div class="period-label" id="periodLabel"></div><button class="nav-arrow" onclick="moveWeek(1)">▶</button>
      <button class="btn-today" onclick="goToday()">สัปดาห์นี้</button></div><div class="spacer"></div>
      ${branchTogglesHTML('branchToggles')}
      <button class="btn btn-primary" onclick="openModal()">+ เพิ่ม</button>`;
  }else if(curView==='person'){
    c.innerHTML=`<div class="ctrl-group"><button class="nav-arrow" onclick="moveMonth(-1)">◀</button>
      <div class="period-label" id="periodLabel"></div><button class="nav-arrow" onclick="moveMonth(1)">▶</button>
      <button class="btn-today" onclick="goTodayMonth()">เดือนนี้</button></div>`;
  }
}
function renderView(){
  const v=document.getElementById('viewContainer');
  if(!v) return;
  if(curView==='weekly')renderWeekly(v);else if(curView==='daily')renderDaily(v);
  else if(curView==='monthly')renderMonthly(v);else if(curView==='branch')renderBranchView(v);
  else if(curView==='person')renderPerson(v);renderAlerts();
}

// === WEEKLY VIEW (multi-branch) ===
function renderWeekly(container){
  const bids=selectedBranches.filter(id=>BRANCHES.find(b=>b.id===id));
  const end=new Date(weekStart);end.setDate(end.getDate()+6);
  const lbl = document.getElementById('periodLabel');
  if(lbl) lbl.textContent=`${thDate(weekStart)} — ${thDate(end)}`;
  const todayStr=fmt(new Date());
  let html='<div class="week-grid">';
  for(let i=0;i<7;i++){
    const dt=new Date(weekStart);dt.setDate(dt.getDate()+i);const ds=fmt(dt);
    const isToday=ds===todayStr;
    let allCards=[];
    let totalCount=0;
    bids.forEach(bid=>{
      const eids=DB[`${bid}_${ds}`]||[];
      const br=BRANCHES.find(b=>b.id===bid);
      totalCount+=eids.length;
      eids.forEach(eid=>{
        const e=EMPS.find(x=>x.id===eid);if(!e)return;
        allCards.push(`<div class="s-card" draggable="true" ondragstart="dragCardStart(event,'${eid}','${bid}','${ds}')" ondragend="dragEnd(event)">
          <div class="av" style="background:${e.c}">${e.name[0]}</div>
          <span class="nm">${e.name}</span>
          ${bids.length>1?`<span class="br-tag">${br.code}</span>`:''}
          <button class="del" onclick="removeAndRefresh('${bid}','${ds}','${eid}')" title="ลบ">✕</button>
        </div>`);
      });
    });
    const empty=totalCount===0;
    const dn=dt.toLocaleDateString('th-TH',{weekday:'short'});
    const dd=dt.getDate();
    html+=`<div class="day-col ${isToday?'is-today':''} ${empty?'is-empty':''}"
      ondragover="event.preventDefault();this.classList.add('drop-over')"
      ondragleave="this.classList.remove('drop-over')"
      ondrop="event.preventDefault();this.classList.remove('drop-over');dropOnWeekly('${ds}')">
      <div class="dh"><div class="dn">${dn}</div><div class="dd">${dd}</div>
      <div class="dc ${empty?'empty':''}">${empty?'⚠️ ว่าง':totalCount+' คน'}</div></div>
      <div class="db">${allCards.join('')}
      <div class="add-slot" onclick="openModal('${ds}')">+ เพิ่ม</div></div></div>`;
  }
  html+='</div>';container.innerHTML=html;
}

// === DAILY VIEW ===
function renderDaily(container){
  const ds=fmt(curDay);
  const lbl = document.getElementById('periodLabel');
  if(lbl) lbl.textContent=curDay.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  let html='<div class="daily-branches">';
  for(const b of BRANCHES){
    const eids=DB[`${b.id}_${ds}`]||[];const hasAlert=eids.length===0;
    html+=`<div class="daily-branch ${hasAlert?'has-alert':''}"><h4>${b.name} <span class="cnt">${eids.length} คน</span></h4>`;
    if(!eids.length)html+=`<div class="no-one">❌ ไม่มีคนเข้า</div>`;
    else eids.forEach(eid=>{const e=EMPS.find(x=>x.id===eid);if(!e)return;
      html+=`<div class="emp-row"><div class="dot" style="background:${e.c}">${e.name[0]}</div>${e.name}</div>`});
    html+=`</div>`;
  }
  html+='</div>';container.innerHTML=html;
}

// === MONTHLY VIEW ===
function renderMonthly(container){
  const bids=selectedBranches;
  const yr=curMonth.getFullYear(),mo=curMonth.getMonth();
  const lbl = document.getElementById('periodLabel');
  if(lbl) lbl.textContent=new Date(yr,mo).toLocaleDateString('th-TH',{month:'long',year:'numeric'});
  const first=new Date(yr,mo,1),lastDay=new Date(yr,mo+1,0).getDate();
  let startDay=first.getDay();if(startDay===0)startDay=7;startDay--;
  const todayStr=fmt(new Date());
  const days=['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.'];
  let html='<div class="month-grid">';
  days.forEach(d=>{html+=`<div class="month-head">${d}</div>`});
  for(let i=0;i<startDay;i++){const pd=new Date(yr,mo,-(startDay-1-i));html+=`<div class="month-cell other-month"><div class="mdd">${pd.getDate()}</div></div>`}
  for(let d=1;d<=lastDay;d++){
    const dt=new Date(yr,mo,d),ds=fmt(dt),isToday=ds===todayStr;
    let hasEmpty=false;const dots=[];
    for(const b of BRANCHES){if(!bids.includes(b.id))continue;const eids=DB[`${b.id}_${ds}`]||[];
      if(!eids.length)hasEmpty=true;eids.forEach(eid=>{const e=EMPS.find(x=>x.id===eid);if(e)dots.push(e)})}
    html+=`<div class="month-cell ${isToday?'today':''} ${hasEmpty?'alert-cell':''}" onclick="jumpToDate('${ds}')">
      <div class="mdd">${d}</div><div class="mdots">${dots.slice(0,6).map(e=>`<div class="mdot" style="background:${e.c}" title="${e.name}">${e.name[0]}</div>`).join('')}${dots.length>6?`<div class="mdot" style="background:#999">+${dots.length-6}</div>`:''}</div></div>`;
  }
  const total=startDay+lastDay,rem=total%7===0?0:7-total%7;
  for(let i=1;i<=rem;i++)html+=`<div class="month-cell other-month"><div class="mdd">${i}</div></div>`;
  html+='</div>';container.innerHTML=html;
}

// === BRANCH VIEW ===
function renderBranchView(container){
  const bids=selectedBranches;
  const end=new Date(weekStart);end.setDate(end.getDate()+6);
  const lbl = document.getElementById('periodLabel');
  if(lbl) lbl.textContent=`${thDate(weekStart)} — ${thDate(end)}`;
  let html='<div class="branch-grid">';
  for(const bid of bids){
    const branch=BRANCHES.find(b=>b.id===bid);
    html+=`<div class="branch-detail"><div class="bd-head"><h3>🏢 ${branch.name} (${branch.code})</h3></div><div class="bd-body">`;
    for(let i=0;i<7;i++){
      const dt=new Date(weekStart);dt.setDate(dt.getDate()+i);const ds=fmt(dt);
      const eids=DB[`${bid}_${ds}`]||[];
      const dayLabel=dt.toLocaleDateString('th-TH',{weekday:'short',day:'numeric',month:'short'});
      html+=`<div class="bd-day"><div class="bd-day-label">${dayLabel}</div>
        <div class="bd-day-staff drop-zone" data-bid="${bid}" data-date="${ds}"
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="event.preventDefault();this.classList.remove('drag-over');dropOnBranch('${bid}','${ds}')">`;
      if(!eids.length)html+=`<div class="no">❌ ว่าง</div>`;
      else eids.forEach(eid=>{const e=EMPS.find(x=>x.id===eid);if(!e)return;
        html+=`<div class="chip" draggable="true" ondragstart="dragCardStart(event,'${eid}','${bid}','${ds}')" ondragend="dragEnd(event)">
          <div class="dot" style="background:${e.c}">${e.name[0]}</div>${e.name}</div>`});
      html+=`</div></div>`;
    }
    html+=`</div></div>`;
  }
  html+='</div>';container.innerHTML=html;
}

// === PERSON VIEW ===
function renderPerson(container){
  const yr=curMonth.getFullYear(),mo=curMonth.getMonth();
  const lastDay=new Date(yr,mo+1,0).getDate();
  const lbl = document.getElementById('periodLabel');
  if(lbl) lbl.textContent=new Date(yr,mo).toLocaleDateString('th-TH',{month:'long',year:'numeric'});
  let html='<div class="person-cards">';
  for(const emp of EMPS){
    const rows=[];
    for(let d=1;d<=lastDay;d++){const dt=new Date(yr,mo,d),ds=fmt(dt);
      const branch=getEmpBranchOnDate(emp.id,ds);if(branch)rows.push({date:ds,dateObj:dt,branch})}
    html+=`<div class="person-card">
      <div class="pc-head">
        <div class="av" style="background:${emp.c}">${emp.name[0]}</div>
        <div class="info"><h4>${emp.name}</h4><div class="sub">รหัส: ${emp.code}</div></div>
      </div>
      <div class="pc-body">`;
    if(!rows.length) html+=`<div style="color:var(--text-light);font-size:13px;padding:8px 0;">ไม่มีตารางงานในเดือนนี้</div>`;
    else rows.forEach(r=>{
      html+=`<div class="pc-row">
        <div class="pc-date">${r.dateObj.toLocaleDateString('th-TH',{day:'numeric',month:'short'})}</div>
        <div class="pc-branch">🏢 ${r.branch.code}</div>
      </div>`
    });
    html+=`</div><div class="pc-summary">รวมเข้างาน: ${rows.length} วัน</div></div>`;
  }
  html+='</div>';container.innerHTML=html;
}

// === SIDEBAR EMPS ===
function renderEmps(){
  const el=document.getElementById('empList');if(!el)return;
  el.innerHTML=EMPS.map(e=>`<div class="emp-chip" draggable="true" ondragstart="dragSidebarStart(event,'${e.id}')" ondragend="dragEnd(event)">
    <div class="emp-dot" style="background:${e.c}">${e.name[0]}</div><span>${e.name}</span></div>`).join('');
}

// === DRAG AND DROP LOGIC ===
function dragSidebarStart(e,eid){
  dragEid=eid;dragFromBid=null;dragFromDate=null;
  e.target.classList.add('dragging');
}
function dragCardStart(e,eid,bid,date){
  dragEid=eid;dragFromBid=bid;dragFromDate=date;
  e.target.classList.add('dragging');
}
function dragEnd(e){
  e.target.classList.remove('dragging');
}

// 💡 ปรับปรุง: เมื่อปล่อยวางในหน้า Weekly ให้เด้ง Modal เลือกสาขาก่อนบันทึก
async function dropOnWeekly(date){
  if(!dragEid) return;
  
  const targetEid = dragEid;
  const fromBid = dragFromBid;
  const fromDate = dragFromDate;
  
  // ตรวจสอบและแปลงวันที่เพื่อให้ในฟอร์มขึ้นวันตรงตามช่องที่วางเป๊ะๆ ไม่หลุด Timezone
  let exactDate = date;
  if (date instanceof Date) {
    const offset = date.getTimezoneOffset() * 60000;
    exactDate = (new Date(date.getTime() - offset)).toISOString().split('T')[0];
  } else if (typeof date === 'string') {
    exactDate = date.split('T')[0];
  }
  
  // เรียกเปิด Modal เด้งถาม
  openModal(exactDate, targetEid);
  
  // จัดการ Event บันทึกของปุ่มใน Modal
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.onclick = null; 
  
  saveBtn.onclick = async function() {
    const chosenBranch = document.getElementById('mBranch').value;
    if(!chosenBranch) {
      toast('❌ กรุณาเลือกสาขาด้วยครับ', 't-warn');
      return;
    }
    
    closeModal();
    
    // ถ้าเป็นการลากย้ายการ์ดใบเดิม ข้ามวัน ให้ลบอันเก่าก่อน
    if(fromBid && fromDate && fromDate !== exactDate) {
      const removeSuccess = await removeSchedule(fromBid, fromDate, targetEid);
      if(!removeSuccess) return;
    }
    
    await assignAndRefresh(chosenBranch, exactDate, targetEid);
  };
}

async function dropOnBranch(toBid,date){
  if(!dragEid)return;
  const eid=dragEid,fromBid=dragFromBid,fromDate=dragFromDate;
  if(fromBid && fromDate===date){
    if(fromBid===toBid)return;
    await transferEmployee(fromBid,toBid,date,eid);
  }else{
    if(fromBid && fromDate) {
      const removeSuccess = await removeSchedule(fromBid,fromDate,eid);
      if(!removeSuccess) return;
    }
    await assignAndRefresh(toBid,date,eid);
  }
}

// === MODAL FUNCTIONS ===
function openModal(dateStr='', eid=''){
  document.getElementById('overlay').classList.add('open');
  const dInput=document.getElementById('mDate');
  
  // 💡 จุดแก้ไข: ตรวจสอบและล็อกความถูกต้องของรูปแบบข้อความวันที่ก่อนใส่ลงฟอร์ม
  let finalDate = '';
  if (dateStr instanceof Date) {
    const offset = dateStr.getTimezoneOffset() * 60000;
    finalDate = (new Date(dateStr.getTime() - offset)).toISOString().split('T')[0];
  } else if (typeof dateStr === 'string' && dateStr.includes('T')) {
    finalDate = dateStr.split('T')[0];
  } else {
    finalDate = dateStr || fmt(new Date());
  }

  dInput.value = finalDate;
  
  const bSel=document.getElementById('mBranch');
  bSel.innerHTML=`<option value="">เลือกสาขา...</option>`+BRANCHES.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
  
  populateEmpSelect();
  if(eid) document.getElementById('mEmp').value = eid;
  checkConflict();
}

function closeModal(){
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('conflictMsg').classList.remove('show');
  // คืนค่าปุ่มบันทึกให้กลับไปใช้ฟังก์ชันเซฟปกติฝั่งการกดมือแบบธรรมดา
  document.getElementById('saveBtn').onclick = save; 
}

function populateEmpSelect(){
  const date=document.getElementById('mDate').value;
  const eSel=document.getElementById('mEmp');if(!eSel)return;
  const curVal=eSel.value;
  eSel.innerHTML=`<option value="">เลือกพนักงาน...</option>`+EMPS.map(e=>{
    const b=getEmpBranchOnDate(e.id,date);
    return `<option value="${e.id}" class="${b?'taken':''}">${e.name} ${b?`(${b.code})`:''}</option>`;
  }).join('');
  eSel.value=curVal;
}

function checkConflict(){
  const date=document.getElementById('mDate').value,eid=document.getElementById('mEmp').value;
  const msg=document.getElementById('conflictMsg');if(!msg)return;
  if(!date||!eid){msg.classList.remove('show');return}
  const b=getEmpBranchOnDate(eid,date);
  if(b){msg.textContent=`⚠️ วันนี้ลงงานไว้แล้วที่สาขา ${b.code}`;msg.classList.add('show')}
  else msg.classList.remove('show');
}

async function save(){
  const date=document.getElementById('mDate').value;
  const eid=document.getElementById('mEmp').value;
  const bid=document.getElementById('mBranch').value;
  if(!date||!eid||!bid){toast('❌ กรุณากรอกข้อมูลให้ครบถ้วน','t-warn');return}
  
  closeModal();
  await assignAndRefresh(bid,date,eid);
}

// === ACTION UTILS ===
async function assignAndRefresh(bid,date,eid){
  const success = await assignSchedule(bid,date,eid);
  if(success){
    renderView();
    const e=EMPS.find(x=>x.id===eid);
    toast(`✅ เพิ่ม ${e?.name} — ${date}`,'t-ok');
    broadcastRealtime('add',e?.name,date);
  }
}

async function removeAndRefresh(bid,date,eid){
  const success = await removeSchedule(bid,date,eid);
  if(success){
    renderView();
    const e=EMPS.find(x=>x.id===eid);
    toast(`🗑️ ลบ ${e?.name}`,'t-ok');
    broadcastRealtime('remove',e?.name,date);
  }
}

// === REALTIME BANNER ===
function broadcastRealtime(action,empName,date){
  const banner=document.getElementById('rtBanner'),txt=document.getElementById('rtText');
  if(!banner || !txt) return;
  txt.textContent=`${action==='add'?'เพิ่ม':action==='remove'?'ลบ':'โอน'} ${empName} วัน ${date} — synced`;
  banner.classList.add('show');setTimeout(()=>banner.classList.remove('show'),3000);
  setTimeout(()=>toast('📡 Realtime synced','t-rt'),400);
}

// === DATE NAVIGATION UTILS ===
function monday(d){const x=new Date(d);const day=x.getDay();x.setDate(x.getDate()-day+(day===0?-6:1));x.setHours(0,0,0,0);return x}
function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function thDate(d){return d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'})}
function toast(msg,cls='t-ok'){
  const tDiv=document.getElementById('toasts');if(!tDiv)return;
  const el=document.createElement('div');el.className=`t ${cls}`;el.textContent=msg;
  tDiv.appendChild(el);setTimeout(()=>el.remove(),3000);
}
function moveWeek(dir){weekStart.setDate(weekStart.getDate()+dir*7);renderView()}
function goToday(){weekStart=monday(new Date());renderView()}
function moveDay(dir){curDay.setDate(curDay.getDate()+dir);renderView()}
function goTodayDaily(){curDay=new Date();renderView()}
function moveMonth(dir){curMonth.setMonth(curMonth.getMonth()+dir);renderView()}
function goTodayMonth(){curMonth=new Date();curMonth.setDate(1);renderView()}
function jumpToDate(ds){
  const target=new Date(ds);
  curDay=new Date(target);
  weekStart=monday(target);
  curMonth=new Date(target);curMonth.setDate(1);
  switchView('daily');
}
function shareLink(){navigator.clipboard.writeText(window.location.href);toast('📋 ก๊อปปี้ลิงก์เข้าคลิปบอร์ดแล้ว')}
function toggleFullscreen(){
  if(!document.fullscreenElement){document.documentElement.requestFullscreen().catch(()=>{})}
  else{document.exitFullscreen()}
}
