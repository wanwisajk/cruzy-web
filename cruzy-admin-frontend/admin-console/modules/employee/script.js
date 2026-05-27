const API_URL = window.__APP_CONFIG?.API_URL || '/api';

// ================================
// DATA FROM DB ONLY
// ================================
let REGIONS = {};
let BRANCHES = [];
let EMPS = [];
let SCH = {};
let LEAVES = [];
let LBAL = {};
let CONTRACTS = [];
let SALES = [];
let DEPOSITS = [];
let USERS = [];

const TIERS = [
  { min: 0, max: 30000, pct: 3, label: '0-30K' },
  { min: 30001, max: 50000, pct: 4, label: '30-50K' },
  { min: 50001, max: 80000, pct: 5, label: '50-80K' },
  { min: 80001, max: Infinity, pct: 6, label: '80K+' }
];
function getTier(s) { return TIERS.find(t => s >= t.min && s <= t.max) || TIERS[0]; }
// ================================
// STATE
// ================================
let user=null, curTab='schedule', curSub='', curBranch='all', selDate=fmtD(new Date()), selDateTo=fmtD(new Date());
let hasLoadedDbData=false;

// ================================
// REAL DATA LOADER
// ================================
async function loadConsoleData(){
try{
const res=await fetch(`${API_URL}/admin-console/data`);
if(!res.ok)throw new Error('Failed to fetch admin console data');
const data=await res.json();
applyConsoleData(data);
hasLoadedDbData=true;
toast('เชื่อมต่อข้อมูล DB แล้ว');
return true;
}catch(err){
console.error('Load DB data failed:',err);
toast('ดึงข้อมูล DB ไม่สำเร็จ');
return false;
}
}

function applyConsoleData(data){
const regionRows=data.regions||[];
const branchRows=data.branches||[];
const empRows=data.employees||[];
const scheduleRows=data.schedules||[];
const leaveRows=data.leaves||[];
const balanceRows=data.leaveBalances||[];
const contractRows=data.contracts||[];
const salesRows=data.sales||[];
const depositRows=data.cashDeposits||[];
const userRows=data.users||[];

REGIONS={};
regionRows.forEach(r=>{REGIONS[r.id]={name:r.name,branches:[]};});

BRANCHES=branchRows.map(b=>({
id:b.id,
name:b.name,
code:b.code,
region:b.region_id||'cnx'
}));
BRANCHES.forEach(b=>{
if(!REGIONS[b.region])REGIONS[b.region]={name:b.region,branches:[]};
REGIONS[b.region].branches.push(b.id);
});

const empBranchMap=deriveEmployeeBranches(scheduleRows, branchRows);
EMPS=empRows.map(e=>{
const fallbackBranch=branchRows.find(b=>b.region_id===(e.region_id||'cnx'))?.id||branchRows[0]?.id||'';
return {
id:e.id,
name:e.name,
code:e.code,
c:e.color||'#4CAF50',
branch:empBranchMap[e.id]||fallbackBranch,
pos:e.position||'พนักงานขาย',
phone:e.phone||'-',
line:Boolean(e.line),
start:e.start_date||'',
status:e.status||'active',
salary:Number(e.salary||0),
region:e.region_id||'cnx'
};
});

SCH={};
scheduleRows.forEach(row=>{
const k=`${row.branch_id}_${row.work_date}`;
if(!SCH[k])SCH[k]=[];
SCH[k].push(row.employee_id);
});

LEAVES=leaveRows.map(l=>({
id:String(l.id),
empId:l.employee_id,
type:l.leave_type,
from:l.start_date,
to:l.end_date,
days:Number(l.days_count||1),
status:l.status||'pending',
reason:l.reason||''
}));

LBAL={};
balanceRows.forEach(b=>{
LBAL[b.employee_id]={a:Number(b.annual_remaining||0),v:Number(b.vacation_remaining||0),s:Number(b.sick_used||0),p:Number(b.personal_used||0)};
});

CONTRACTS=contractRows.map(c=>({
empId:c.employee_id,
type:c.contract_type,
start:c.start_date,
end:c.end_date
}));

SALES=salesRows.map(s=>({
date:s.sell_date,
bid:s.branch_id,
total:Number(s.total_amount||0),
cash:Number(s.cash_amount||0),
transfer:Number(s.transfer_amount||0),
credit:Number(s.credit_amount||0),
orders:Number(s.orders_count||0)
}));

DEPOSITS=depositRows.map(d=>({
date:d.deposit_date,
bid:d.branch_id,
expected:Number(d.expected_amount||0),
deposited:Number(d.deposited_amount||0),
slip:Boolean(d.slip_url),
status:d.status||'waiting'
}));

USERS=userRows.map(u=>({
username:u.username,
name:u.name,
role:u.role,

scope:u.scope||u.scope_value||u.scope_type
}));
}

function deriveEmployeeBranches(scheduleRows, branchRows){
const byEmployee={};
scheduleRows
.slice()
.sort((a,b)=>String(b.work_date).localeCompare(String(a.work_date)))
.forEach(s=>{if(!byEmployee[s.employee_id])byEmployee[s.employee_id]=s.branch_id;});
branchRows.forEach(b=>{});
return byEmployee;
}

// ================================
// LOGIN
// ================================
async function doLogin(){
const u=document.getElementById('loginUser').value.trim(),p=document.getElementById('loginPass').value.trim();
const errEl=document.getElementById('loginError');
errEl.style.display='none';
try{
const res=await fetch(`${API_URL}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
const result=await res.json().catch(()=>({}));
if(!res.ok)throw new Error(result.message||'Login failed');
user=result.user;
const loaded=await loadConsoleData();
if(!loaded)throw new Error('Load DB failed');
document.getElementById('loginOverlay').classList.add('hidden');
document.getElementById('mainNav').style.display='flex';
document.getElementById('app').style.display='flex';
document.getElementById('navRole').textContent=user.label;
document.getElementById('navUser').textContent=`${user.label} ${user.name}`;
buildSidebar();render();
}catch(err){
console.error(err);
errEl.textContent=err.message||'Username หรือ Password ไม่ถูกต้อง';
errEl.style.display='block';
}
}
function logout(){user=null;document.getElementById('loginOverlay').classList.remove('hidden');document.getElementById('mainNav').style.display='none';document.getElementById('app').style.display='none';}

function visBranches(){if(!user)return[];if(user.scope==='all')return BRANCHES;if(REGIONS[user.scope])return BRANCHES.filter(b=>b.region===user.scope);return BRANCHES.filter(b=>b.id===user.scope);}
function visEmps(){const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];return EMPS.filter(e=>bids.includes(e.branch));}
function branchEmps(bid){return EMPS.filter(e=>e.branch===bid);}

// ================================
// SIDEBAR
// ================================
function buildSidebar(){
const sb=document.getElementById('sidebar');
const branches=visBranches();
let h='<div class="sb-section"><div class="sb-section-title">เมนู</div>';
h+=`<button class="sb-item ${curTab==='schedule'?'active':''}" onclick="setTab('schedule')"><span class="icon">📅</span><span>ตารางงาน</span></button>`;
h+=`<button class="sb-item ${curTab==='leave'?'active':''}" onclick="setTab('leave')"><span class="icon">📝</span><span>การลา</span></button>`;
h+=`<button class="sb-item ${curTab==='contract'?'active':''}" onclick="setTab('contract')"><span class="icon">📄</span><span>สัญญาจ้าง</span></button>`;
h+=`<button class="sb-item ${curTab==='employee'?'active':''}" onclick="setTab('employee')"><span class="icon">👤</span><span>พนักงาน</span></button>`;
h+=`<button class="sb-item ${curTab==='sales'?'active':''}" onclick="setTab('sales')"><span class="icon">💰</span><span>ยอดขาย</span></button>`;
h+=`<button class="sb-item ${curTab==='deposit'?'active':''}" onclick="setTab('deposit')"><span class="icon">🏦</span><span>ฝากเงิน</span></button>`;
h+=`<button class="sb-item ${curTab==='commission'?'active':''}" onclick="setTab('commission')"><span class="icon">💎</span><span>ค่าคอม</span></button>`;
h+=`<button class="sb-item ${curTab==='payroll'?'active':''}" onclick="setTab('payroll')"><span class="icon">💵</span><span>เงินเดือน</span></button>`;
if(user.role==='owner')h+=`<button class="sb-item ${curTab==='access'?'active':''}" onclick="setTab('access')"><span class="icon">🔐</span><span>สิทธิ์</span></button>`;
h+='</div>';

h+='<div class="sb-section"><div class="sb-section-title">สาขา</div>';
h+=`<button class="sb-branch ${curBranch==='all'?'active':''}" onclick="setBranch('all')"><span class="code">ALL</span><span>ทุกสาขา</span></button>`;
let lastRegion='';
branches.forEach(b=>{if(b.region!==lastRegion){lastRegion=b.region;h+=`<div class="sb-region">${REGIONS[b.region].name}</div>`;}h+=`<button class="sb-branch ${curBranch===b.id?'active':''}" onclick="setBranch('${b.id}')"><span class="code">${b.code}</span><span>${b.name.split(' ').pop()}</span></button>`;});
h+='</div>';
sb.innerHTML=h;
}

function setTab(t){curTab=t;buildSidebar();render();}
function setBranch(b){curBranch=b;buildSidebar();render();}

// ================================
// DATE BAR
// ================================
function renderDateBar(){
const db=document.getElementById('dateBar');
const needRange=['sales','deposit','commission','payroll'].includes(curTab);
let h=`<span style="font-size:12px;font-weight:600;color:var(--tl)">📅</span>`;
h+=`<input type="date" id="dFrom" value="${selDate}" onchange="selDate=this.value;${needRange?'':'selDateTo=this.value;'}render()">`;
if(needRange){h+=`<span style="font-size:12px;color:var(--tl)">ถึง</span><input type="date" id="dTo" value="${selDateTo}" onchange="selDateTo=this.value;render()">`;}
h+=`<button class="date-btn" onclick="setDatePreset('today')">วันนี้</button>`;
if(needRange){h+=`<button class="date-btn" onclick="setDatePreset('week')">7 วัน</button><button class="date-btn" onclick="setDatePreset('month')">เดือนนี้</button>`;}
h+=`<span class="date-label" id="dateLabel"></span>`;
db.innerHTML=h;
const d=new Date(selDate+'T00:00:00');
document.getElementById('dateLabel').textContent=d.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function setDatePreset(p){
const today=new Date();
if(p==='today'){selDate=fmtD(today);selDateTo=fmtD(today);}
else if(p==='week'){const start=new Date(today);start.setDate(today.getDate()-6);selDate=fmtD(start);selDateTo=fmtD(today);}
else if(p==='month'){const start=new Date(today.getFullYear(),today.getMonth(),1);selDate=fmtD(start);selDateTo=fmtD(today);}
render();}

// ================================
// RENDER
// ================================
function render(){
renderDateBar();
document.getElementById('subTabs').innerHTML='';
const c=document.getElementById('content');
if(curTab==='schedule')renderSchedule(c);
else if(curTab==='leave')renderLeave(c);
else if(curTab==='contract')renderContract(c);
else if(curTab==='employee')renderEmployee(c);
else if(curTab==='sales')renderSales(c);
else if(curTab==='deposit')renderDeposit(c);
else if(curTab==='commission')renderCommission(c);
else if(curTab==='payroll')renderPayroll(c);
else if(curTab==='access')renderAccess(c);
}

// ================================
// SCHEDULE
// ================================
function renderSchedule(el){
const ds=selDate;
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const branches=BRANCHES.filter(b=>bids.includes(b.id));
let totalStaff=0,totalWorking=0,emptyBranches=0;
branches.forEach(b=>{const emps=branchEmps(b.id);totalStaff+=emps.length;const w=(SCH[`${b.id}_${ds}`]||[]).length;totalWorking+=w;if(!w)emptyBranches++;});
let h=`<div class="stats-row"><div class="stat-card"><div class="stat-num" style="color:var(--primary)">${totalWorking}</div><div class="stat-label">เข้างานวันนี้</div></div><div class="stat-card blue"><div class="stat-num" style="color:var(--info)">${totalStaff}</div><div class="stat-label">พนักงานทั้งหมด</div></div><div class="stat-card ${emptyBranches?'red':''}"><div class="stat-num" style="color:${emptyBranches?'var(--danger)':'var(--primary)'}">${emptyBranches}</div><div class="stat-label">สาขาว่าง</div></div></div>`;
if(curBranch==='all'){
h+='<div class="branch-grid">';
branches.forEach(b=>{const eids=SCH[`${b.id}_${ds}`]||[];const isEmpty=!eids.length;h+=`<div class="b-card"><div class="b-card-head ${isEmpty?'empty':''}"><span>🏢 ${b.code}</span><span>${eids.length} คน</span></div><div class="b-card-body">`;if(isEmpty)h+='<div style="color:var(--danger);text-align:center;padding:8px;font-size:12px;font-weight:600">❌ ไม่มีคนเข้า</div>';else eids.forEach(eid=>{const e=EMPS.find(x=>x.id===eid);if(e)h+=`<div class="b-emp"><span class="emp-dot" style="background:${e.c}">${e.name[0]}</span>${e.name}</div>`;});h+='</div></div>';});
h+='</div>';
}else{
const b=BRANCHES.find(x=>x.id===curBranch);
const emps=branchEmps(curBranch);
const start=new Date(selDate+'T00:00:00');start.setDate(start.getDate()-start.getDay()+1);
h+=`<div class="tw"><div class="tw-head"><h3>🏢 ${b.name} — ตารางสัปดาห์</h3></div><table><tr><th>วัน</th>`;
emps.forEach(e=>{h+=`<th><span class="emp-dot" style="background:${e.c}">${e.name[0]}</span>${e.name}</th>`;});
h+='</tr>';
for(let i=0;i<7;i++){const dt=new Date(start);dt.setDate(dt.getDate()+i);const d=fmtD(dt);const isToday=d===selDate;h+=`<tr${isToday?' style="background:var(--pb)"':''}>`;h+=`<td style="font-weight:600;${isToday?'color:var(--primary)':''}">${dt.toLocaleDateString('th-TH',{weekday:'short',day:'numeric',month:'short'})}</td>`;emps.forEach(e=>{const working=(SCH[`${curBranch}_${d}`]||[]).includes(e.id);h+=`<td style="text-align:center">${working?'<span style="color:var(--primary);font-weight:700">✅</span>':'<span style="color:var(--tl)">—</span>'}</td>`;});h+='</tr>';} 
h+='</table></div>';
}
el.innerHTML=h;
}

// ================================
// LEAVE
// ================================
function renderLeave(el){
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const vis=LEAVES.filter(l=>{const e=EMPS.find(x=>x.id===l.empId);return e&&bids.includes(e.branch);});
const pending=vis.filter(l=>l.status==='pending').length,approved=vis.filter(l=>l.status==='approved').length;
let h=`<div class="stats-row"><div class="stat-card orange"><div class="stat-num" style="color:var(--accent)">${pending}</div><div class="stat-label">รออนุมัติ</div></div><div class="stat-card"><div class="stat-num" style="color:var(--primary)">${approved}</div><div class="stat-label">อนุมัติ</div></div><div class="stat-card blue"><div class="stat-num" style="color:var(--info)">${vis.reduce((s,l)=>s+l.days,0)}</div><div class="stat-label">วันลาทั้งหมด</div></div></div>`;
const p=vis.filter(l=>l.status==='pending');
if(p.length){
h+=`<div class="tw"><div class="tw-head"><h3>⏳ รออนุมัติ</h3></div><table><tr><th>พนักงาน</th><th>ประเภท</th><th>วันที่</th><th>จำนวน</th><th>เหตุผล</th><th>ดำเนินการ</th></tr>`;
p.forEach(l=>{const e=EMPS.find(x=>x.id===l.empId);const b=BRANCHES.find(x=>x.id===e?.branch);h+=`<tr><td><span class="emp-dot" style="background:${e?.c}">${e?.name[0]}</span>${e?.name} <span style="color:var(--tl);font-size:10px">${b?.code}</span></td><td>${l.type}</td><td>${thD(l.from)}${l.from!==l.to?' → '+thD(l.to):''}</td><td>${l.days}</td><td>${l.reason}</td><td><button class="action-btn approve" onclick="updateLeaveStatus('${l.id}','approved')">✅</button><button class="action-btn reject" onclick="updateLeaveStatus('${l.id}','rejected')">❌</button></td></tr>`;});
h+='</table></div>';
}

h+=`<div class="tw"><div class="tw-head"><h3>📊 สรุปวันลา</h3></div><table><tr><th>พนักงาน</th><th>📅 ประจำปี(13)</th><th>🏖 พักร้อน(5)</th><th>🤒 ป่วย</th><th>📋 กิจ</th></tr>`;
visEmps().forEach(e=>{const b=LBAL[e.id]||{a:13,v:5,s:0,p:0};h+=`<tr><td><span class="emp-dot" style="background:${e.c}">${e.name[0]}</span>${e.name}</td><td><b style="color:${b.a<=3?'var(--danger)':'var(--primary)'}">${b.a}</b>/13</td><td><b>${b.v}</b>/5</td><td>${b.s}</td><td>${b.p}</td></tr>`;});
h+='</table></div>';
el.innerHTML=h;
}

// ================================
// CONTRACT
// ================================
function renderContract(el){
const emps=visEmps();
const today=new Date();
const vis=CONTRACTS.filter(c=>emps.some(e=>e.id===c.empId));
function cStatus(c){const d=Math.ceil((new Date(c.end)-today)/(864e5));if(d<0)return{cls:'expired',label:'❌ หมดสัญญา'};if(d<=30)return{cls:'expiring',label:`⚠️ ${d} วัน`};if(c.type.includes('ทดลอง'))return{cls:'trial',label:'🔄 ทดลอง'};return{cls:'active',label:'✅ ประจำ'};}
const trial=vis.filter(c=>cStatus(c).cls==='trial').length,expiring=vis.filter(c=>cStatus(c).cls==='expiring').length;
let h=`<div class="stats-row"><div class="stat-card"><div class="stat-num" style="color:var(--primary)">${vis.length}</div><div class="stat-label">ทั้งหมด</div></div><div class="stat-card orange"><div class="stat-num" style="color:var(--accent)">${trial}</div><div class="stat-label">ทดลองงาน</div></div><div class="stat-card red"><div class="stat-num" style="color:var(--danger)">${expiring}</div><div class="stat-label">ใกล้หมด</div></div></div>`;
h+=`<div class="tw"><div class="tw-head"><h3>📄 สัญญาจ้าง</h3></div><table><tr><th>พนักงาน</th><th>สาขา</th><th>ประเภท</th><th>เริ่ม</th><th>หมด</th><th>สถานะ</th><th></th></tr>`;
vis.forEach(c=>{const e=EMPS.find(x=>x.id===c.empId);const b=BRANCHES.find(x=>x.id===e?.branch);const s=cStatus(c);h+=`<tr><td><span class="emp-dot" style="background:${e?.c}">${e?.name[0]}</span>${e?.name}</td><td>${b?.code}</td><td>${c.type}</td><td>${thD(c.start)}</td><td>${thD(c.end)}</td><td><span class="badge ${s.cls}">${s.label}</span></td><td>${s.cls==='expiring'||s.cls==='expired'?`<button class="action-btn approve" onclick="toast('📝 ต่อสัญญา')">📝 ต่อ</button>`:''}</td></tr>`;});
h+='</table></div>';
el.innerHTML=h;
}

// ================================
// EMPLOYEE
// ================================
function renderEmployee(el){
const emps=visEmps();
let h=`<div class="stats-row"><div class="stat-card"><div class="stat-num" style="color:var(--primary)">${emps.length}</div><div class="stat-label">ทั้งหมด</div></div><div class="stat-card orange"><div class="stat-num" style="color:var(--accent)">${emps.filter(e=>e.status==='trial').length}</div><div class="stat-label">ทดลอง</div></div><div class="stat-card"><div class="stat-num" style="color:var(--primary)">${emps.filter(e=>e.status==='active').length}</div><div class="stat-label">ประจำ</div></div></div>`;
h+=`<div class="tw"><div class="tw-head"><h3>👤 พนักงาน</h3><div><button class="btn btn-ghost" onclick="exportCurrentViewCSV()">Export</button> <button class="btn btn-primary" onclick="toast('➕ เพิ่มพนักงาน')">+ เพิ่ม</button></div></div><table><tr><th>รหัส</th><th>ชื่อ</th><th>ตำแหน่ง</th><th>สาขา</th><th>สถานะ</th><th>LINE</th><th>เบอร์โทร</th></tr>`;
emps.forEach(e=>{const b=BRANCHES.find(x=>x.id===e.branch);h+=`<tr><td style="font-weight:600">${e.code}</td><td><span class="emp-dot" style="background:${e.c}">${e.name[0]}</span>${e.name}</td><td>${e.pos}</td><td>${b?.code}</td><td><span class="badge ${e.status==='trial'?'trial':'active'}">${e.status==='trial'?'ทดลอง':'ประจำ'}</span></td><td>${e.line?'✅':'❌'}</td><td>${e.phone}</td></tr>`;});
h+='</table></div>';
el.innerHTML=h;
}

// ================================
// SALES
// ================================
function renderSales(el){
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const dates=dRange(selDate,selDateTo);
const rows=SALES.filter(s=>bids.includes(s.bid)&&dates.includes(s.date));
const tS=rows.reduce((s,x)=>s+x.total,0),tC=rows.reduce((s,x)=>s+x.cash,0),tTr=rows.reduce((s,x)=>s+x.transfer,0),tCr=rows.reduce((s,x)=>s+x.credit,0);
let h=`<div class="stats-row"><div class="stat-card"><div class="stat-num" style="color:var(--primary)">฿${nf(tS)}</div><div class="stat-label">ยอดขาย</div></div><div class="stat-card blue"><div class="stat-num" style="color:var(--info)">฿${nf(tC)}</div><div class="stat-label">เงินสด</div></div><div class="stat-card purple"><div class="stat-num" style="color:var(--purple)">฿${nf(tTr)}</div><div class="stat-label">โอน</div></div><div class="stat-card orange"><div class="stat-num" style="color:var(--accent)">฿${nf(tCr)}</div><div class="stat-label">เครดิต</div></div></div>`;
if(curBranch==='all'){
h+=`<div class="tw"><div class="tw-head"><h3>💰 ยอดขายแยกสาขา</h3></div><table><tr><th>สาขา</th><th>ยอดรวม</th><th>เงินสด</th><th>โอน</th><th>เครดิต</th><th>ออเดอร์</th></tr>`;
visBranches().forEach(b=>{const br=rows.filter(r=>r.bid===b.id);if(!br.length)return;const t=br.reduce((s,x)=>s+x.total,0),c=br.reduce((s,x)=>s+x.cash,0),tr=br.reduce((s,x)=>s+x.transfer,0),cr=br.reduce((s,x)=>s+x.credit,0),o=br.reduce((s,x)=>s+x.orders,0);h+=`<tr><td style="font-weight:600;color:var(--primary);cursor:pointer" onclick="setBranch('${b.id}')">${b.code} ${b.name}</td><td>฿${nf(t)}</td><td>฿${nf(c)}</td><td>฿${nf(tr)}</td><td>฿${nf(cr)}</td><td>${o}</td></tr>`;});
h+='</table></div>';
}else{
const b=BRANCHES.find(x=>x.id===curBranch);
h+=`<div class="tw"><div class="tw-head"><h3>💰 ${b.code} ${b.name}</h3></div><table><tr><th>วันที่</th><th>ยอดขาย</th><th>เงินสด</th><th>โอน</th><th>เครดิต</th><th>ออเดอร์</th></tr>`;
dates.forEach(d=>{const r=SALES.find(s=>s.date===d&&s.bid===curBranch);if(!r)return;h+=`<tr><td style="font-weight:600">${thD(d)}</td><td>฿${nf(r.total)}</td><td>฿${nf(r.cash)}</td><td>฿${nf(r.transfer)}</td><td>฿${nf(r.credit)}</td><td>${r.orders}</td></tr>`;});
h+='</table></div>';
}
el.innerHTML=h;
}

// ================================
// DEPOSIT
// ================================
function renderDeposit(el){
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const dates=dRange(selDate,selDateTo);
const rows=DEPOSITS.filter(d=>bids.includes(d.bid)&&dates.includes(d.date));
const done=rows.filter(d=>d.deposited>0).length,total=rows.length,mm=rows.filter(d=>d.deposited>0&&d.deposited!==d.expected).length;
let h=`<div class="stats-row"><div class="stat-card teal"><div class="stat-num" style="color:var(--teal)">${done}/${total}</div><div class="stat-label">ฝากแล้ว</div></div><div class="stat-card ${mm?'red':''}"><div class="stat-num" style="color:${mm?'var(--danger)':'var(--primary)'}">${mm}</div><div class="stat-label">ยอดไม่ตรง</div></div><div class="stat-card"><div class="stat-num" style="color:var(--primary)">฿${nf(rows.reduce((s,d)=>s+d.expected,0))}</div><div class="stat-label">ยอดต้องฝาก</div></div><div class="stat-card blue"><div class="stat-num" style="color:var(--info)">฿${nf(rows.reduce((s,d)=>s+d.deposited,0))}</div><div class="stat-label">ฝากจริง</div></div></div>`;
h+=`<div class="tw"><div class="tw-head"><h3>🏦 ประกบยอดฝากเงินสด</h3></div><table><tr>${curBranch==='all'?'<th>สาขา</th>':''}<th>วันที่</th><th>ยอดเงินสด</th><th>ยอดฝาก</th><th>ส่วนต่าง</th><th>สลิป</th><th>สถานะ</th></tr>`;
rows.sort((a,b)=>a.date.localeCompare(b.date)).forEach(d=>{const b=BRANCHES.find(x=>x.id===d.bid);const diff=d.deposited-d.expected;let st,sc;if(!d.deposited){st='⏳ รอฝาก';sc='waiting';}else if(diff===0){st='✅ ตรง';sc='match';}else{st=`❌ ขาด ฿${nf(Math.abs(diff))}`;sc='mismatch';}
h+=`<tr>${curBranch==='all'?`<td style="font-weight:600">${b?.code}</td>`:''}<td>${thD(d.date)}</td><td>฿${nf(d.expected)}</td><td>${d.deposited?'฿'+nf(d.deposited):'—'}</td><td style="font-weight:600;color:${!d.deposited?'var(--tl)':diff===0?'var(--primary)':'var(--danger)'}>${!d.deposited?'—':diff===0?'0':nf(diff)}</td><td>${d.slip?'📎':'—'}</td><td><span class="badge ${sc}">${st}</span></td></tr>`;});
h+='</table></div>';
el.innerHTML=h;
}

// ================================
// COMMISSION
// ================================
function renderCommission(el){
const emps=visEmps();
const dates=dRange(selDate,selDateTo);
const comData=emps.map(e=>{const sales=SALES.filter(s=>s.bid===e.branch&&dates.includes(s.date)).reduce((s,x)=>s+x.total,0);const tier=getTier(sales);const com=Math.round(sales*tier.pct/100);return{...e,sales,tier,com};});
const totalCom=comData.reduce((s,c)=>s+c.com,0);
let h=`<div class="tier-grid">`;
TIERS.forEach((t,i)=>{h+=`<div class="tier-card ${['','t2','t3','t4'][i]}"><div style="font-size:22px;font-weight:700;color:${['var(--primary)','var(--info)','var(--accent)','var(--danger)'][i]}">${t.pct}%</div><div style="font-size:11px;color:var(--tl)">฿${t.label}</div></div>`;});
h+='</div>';
h+=`<div class="stats-row"><div class="stat-card purple"><div class="stat-num" style="color:var(--purple)">฿${nf(totalCom)}</div><div class="stat-label">ค่าคอมรวม</div></div><div class="stat-card"><div class="stat-num" style="color:var(--primary)">${comData.length}</div><div class="stat-label">พนักงาน</div></div></div>`;
h+=`<div class="tw"><div class="tw-head"><h3>💎 ค่าคอม</h3></div><table><tr><th>พนักงาน</th><th>สาขา</th><th>ยอดขาย</th><th>Tier</th><th>%</th><th>ค่าคอม</th></tr>`;
comData.forEach(c=>{const b=BRANCHES.find(x=>x.id===c.branch);h+=`<tr><td><span class="emp-dot" style="background:${c.c}">${c.name[0]}</span>${c.name}</td><td>${b?.code}</td><td>฿${nf(c.sales)}</td><td style="font-size:11px">${c.tier.label}</td><td style="font-weight:700;color:var(--info)">${c.tier.pct}%</td><td style="font-weight:700;color:var(--primary)">฿${nf(c.com)}</td></tr>`;});
h+=`<tr style="background:#F5F5F5;font-weight:700"><td colspan="5">รวม</td><td>฿${nf(totalCom)}</td></tr></table></div>`;
el.innerHTML=h;
}

// ================================
// PAYROLL
// ================================
function renderPayroll(el){
const emps=visEmps();
const dates=dRange(selDate,selDateTo);
const payData=emps.map(e=>{const sales=SALES.filter(s=>s.bid===e.branch&&dates.includes(s.date)).reduce((s,x)=>s+x.total,0);const tier=getTier(sales);const com=Math.round(sales*tier.pct/100);const ot=0;const leaveDeduct=0;const ss=Math.min(Math.round(e.salary*0.05),750);const net=e.salary+com+ot-leaveDeduct-ss;const status='calculated';return{...e,com,ot,leaveDeduct,ss,net,status};});
const tBase=payData.reduce((s,p)=>s+p.salary,0),tCom=payData.reduce((s,p)=>s+p.com,0),tNet=payData.reduce((s,p)=>s+p.net,0);
let h=`<div class="stats-row"><div class="stat-card"><div class="stat-num" style="color:var(--primary)">฿${nf(tBase)}</div><div class="stat-label">เงินเดือนรวม</div></div><div class="stat-card purple"><div class="stat-num" style="color:var(--purple)">฿${nf(tCom)}</div><div class="stat-label">ค่าคอมรวม</div></div><div class="stat-card teal"><div class="stat-num" style="color:var(--teal)">฿${nf(tNet)}</div><div class="stat-label">จ่ายสุทธิ</div></div></div>`;
h+=`<div class="tw"><div class="tw-head"><h3>💵 เงินเดือน</h3><div><button class="btn btn-primary" onclick="toast('🔄 คำนวณเงินเดือน')">🔄 คำนวณ</button> <button class="btn btn-ghost" onclick="exportCurrentViewCSV()">📤 Export</button></div></div><table><tr><th>พนักงาน</th><th>สาขา</th><th>เงินเดือน</th><th>ค่าคอม</th><th>OT</th><th>หักลา</th><th>ปกส.</th><th>สุทธิ</th><th>สถานะ</th></tr>`;
payData.forEach(p=>{const b=BRANCHES.find(x=>x.id===p.branch);const sc=p.status==='paid'?'paid':p.status==='calculated'?'calculated':'pending';const st=p.status==='paid'?'✅ จ่ายแล้ว':p.status==='calculated'?'📊 คำนวณ':'⏳ รอ';h+=`<tr><td><span class="emp-dot" style="background:${p.c}">${p.name[0]}</span>${p.name}</td><td>${b?.code}</td><td>฿${nf(p.salary)}</td><td style="color:var(--purple)">฿${nf(p.com)}</td><td style="color:var(--accent)">฿${nf(p.ot)}</td><td style="color:${p.leaveDeduct?'var(--danger)':'var(--tl)'}">฿${nf(p.leaveDeduct)}</td><td>฿${nf(p.ss)}</td><td style="font-weight:700;color:var(--teal)">฿${nf(p.net)}</td><td><span class="badge ${sc}">${st}</span></td></tr>`;});
h+=`<tr style="background:#F5F5F5;font-weight:700"><td colspan="2">รวม</td><td>฿${nf(tBase)}</td><td>฿${nf(tCom)}</td><td></td><td></td><td></td><td style="color:var(--teal)">฿${nf(tNet)}</td><td></td></tr></table></div>`;
el.innerHTML=h;
}

// ================================
// ACCESS
// ================================
function renderAccess(el){
if(user?.role!=='owner'){el.innerHTML='<div class="empty-state"><div class="icon">🔒</div><h3 style="color:var(--danger)">ไม่มีสิทธิ์</h3></div>';return;}
let h=`<div class="tw"><div class="tw-head"><h3>👥 ผู้ใช้งาน</h3></div><table><tr><th>Username</th><th>ชื่อ</th><th>สิทธิ์</th><th>ขอบเขต</th></tr>`;
USERS.forEach(u=>{h+=`<tr><td style="font-weight:600">${u.username}</td><td>${u.name}</td><td>${u.role}</td><td>${u.scope}</td></tr>`;});
h+='</table></div>';
h+='<div class="group-grid">';
Object.entries(REGIONS).forEach(([rid,region])=>{
const branches=BRANCHES.filter(b=>b.region===rid);
const members=EMPS.filter(e=>branches.some(b=>b.id===e.branch));
h+=`<div class="g-card"><div class="g-card-head">🏢 ${region.name}</div><div class="g-card-body"><div class="g-row"><span style="color:var(--tl)">สาขา</span><span>${branches.map(b=>b.code).join(', ')||'-'}</span></div><div class="g-row"><span style="color:var(--tl)">พนักงาน</span><span>${members.length}</span></div></div></div>`;
});
h+='</div>';
el.innerHTML=h;
}

// ================================
// UTILS
// ================================
function fmtD(d){return d.toISOString().split('T')[0];}
function nf(n){return n.toLocaleString('th-TH');}
function thD(ds){return new Date(ds+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short'});}
function dRange(from,to){const d=[];let c=new Date(from+'T00:00:00');const e=new Date(to+'T00:00:00');while(c<=e){d.push(fmtD(c));c.setDate(c.getDate()+1);}return d;}
function toast(msg){const el=document.createElement('div');el.className='t t-ok';el.textContent=msg;document.getElementById('toasts').appendChild(el);setTimeout(()=>el.remove(),3000);}
function openScheduleManager(){window.open('../schedule/','_blank','noopener');}
async function updateLeaveStatus(id,status){
try{
const res=await fetch(`${API_URL}/leaves/${id}/status`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
if(!res.ok)throw new Error('Update leave failed');
const leave=LEAVES.find(x=>x.id===id);
if(leave)leave.status=status;
toast(status==='approved'?'✅ อนุมัติแล้ว':'❌ ปฏิเสธแล้ว');
render();
}catch(err){
console.error(err);
toast('บันทึกสถานะการลาไม่สำเร็จ');
}
}
function exportCurrentViewCSV(){
const rows=getExportRows();
if(!rows.length){toast('ไม่มีข้อมูลสำหรับ Export');return;}
const headers=Object.keys(rows[0]);
const csv=[headers.join(','),...rows.map(r=>headers.map(h=>csvCell(r[h])).join(','))].join('\n');
const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
const url=URL.createObjectURL(blob);
const a=document.createElement('a');
a.href=url;
a.download=`cruzy-${curTab}-${selDate}${selDateTo!==selDate?'-to-'+selDateTo:''}.csv`;
document.body.appendChild(a);
a.click();
a.remove();
URL.revokeObjectURL(url);

}
function getExportRows(){
if(curTab==='employee')return visEmps().map(e=>({code:e.code,name:e.name,position:e.pos,branch:BRANCHES.find(b=>b.id===e.branch)?.code||'',status:e.status,salary:e.salary,phone:e.phone}));
if(curTab==='schedule'){
const ds=selDate,bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
return bids.flatMap(bid=>(SCH[`${bid}_${ds}`]||[]).map(eid=>{const e=EMPS.find(x=>x.id===eid),b=BRANCHES.find(x=>x.id===bid);return{date:ds,branch:b?.code||bid,employee_code:e?.code||eid,employee_name:e?.name||''};}));
}
if(curTab==='leave')return LEAVES.filter(l=>visEmps().some(e=>e.id===l.empId)).map(l=>{const e=EMPS.find(x=>x.id===l.empId);return{employee:e?.name||l.empId,type:l.type,from:l.from,to:l.to,days:l.days,status:l.status,reason:l.reason};});
if(curTab==='contract')return CONTRACTS.filter(c=>visEmps().some(e=>e.id===c.empId)).map(c=>{const e=EMPS.find(x=>x.id===c.empId);return{employee:e?.name||c.empId,type:c.type,start:c.start,end:c.end};});
if(curTab==='sales'){const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch],dates=dRange(selDate,selDateTo);return SALES.filter(s=>bids.includes(s.bid)&&dates.includes(s.date)).map(s=>({date:s.date,branch:BRANCHES.find(b=>b.id===s.bid)?.code||s.bid,total:s.total,cash:s.cash,transfer:s.transfer,credit:s.credit,orders:s.orders}));}
if(curTab==='deposit'){const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch],dates=dRange(selDate,selDateTo);return DEPOSITS.filter(d=>bids.includes(d.bid)&&dates.includes(d.date)).map(d=>({date:d.date,branch:BRANCHES.find(b=>b.id===d.bid)?.code||d.bid,expected:d.expected,deposited:d.deposited,diff:d.deposited-d.expected,status:d.status}));}
if(curTab==='commission'){const dates=dRange(selDate,selDateTo);return visEmps().map(e=>{const sales=SALES.filter(s=>s.bid===e.branch&&dates.includes(s.date)).reduce((sum,x)=>sum+x.total,0),tier=getTier(sales);return{employee:e.name,branch:BRANCHES.find(b=>b.id===e.branch)?.code||'',sales,tier:tier.label,percent:tier.pct,commission:Math.round(sales*tier.pct/100)};});}
if(curTab==='payroll')return visEmps().map(e=>({employee:e.name,branch:BRANCHES.find(b=>b.id===e.branch)?.code||'',salary:e.salary,status:e.status}));
if(curTab==='access')return USERS;
return [];
}
function csvCell(value){const text=String(value??'');return /[",\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;}
function openModal(t,b,f){document.getElementById('mTitle').textContent=t;document.getElementById('mBody').innerHTML=b;document.getElementById('mFoot').innerHTML=f||'';document.getElementById('overlay').classList.add('open');}
function closeModal(){document.getElementById('overlay').classList.remove('open');}
window.addEventListener('DOMContentLoaded',()=>{});

