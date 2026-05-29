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
let BRANCH_QUOTA = {};
let EMP_BRANCHES = {};
let SALES = [];
let BANK_ACCOUNTS = [];
let DEPOSITS = [];
let ATTENDANCE = [];
let LINE_GROUPS = [];
let USERS = [];
let STORE_OPENINGS = [];
let INSPECTIONS = [];
let AUDIT_LOGS = [];
let ATT_ALERTS = [];
let WL_TEMPLATES = [];
let WARNING_LETTERS = [];

const TIERS = [
  { min: 0, max: 30000, pct: 3, label: '0-30K' },
  { min: 30001, max: 50000, pct: 4, label: '30-50K' },
  { min: 50001, max: 80000, pct: 5, label: '50-80K' },
  { min: 80001, max: Infinity, pct: 6, label: '80K+' }
];
function getTier(s){return TIERS.find(t=>s>=t.min&&s<=t.max)||TIERS[0];}

// ================================
// STATE
// ================================
let user=null, curTab='schedule', curSub='', curBranch='all', selDate='', selDateTo='';

// ================================
// DB DATA LOADER
// ================================
async function loadConsoleData(){
try{
const res=await fetch(`${API_URL}/admin-console/data`);
if(!res.ok)throw new Error('Failed to fetch admin console data');
const data=await res.json();
applyConsoleData(data);
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
const attendanceRows=data.attendance||[];
const alertRows=data.attendanceAlerts||[];
const bankRows=data.bankAccounts||[];
const inspectionRows=data.storeInspections||[];
const templateRows=data.warningLetterTemplates||[];
const warningRows=data.warningLetters||[];
const userRows=data.users||[];

REGIONS={};
regionRows.forEach(r=>{REGIONS[r.id]={name:r.name,branches:[]};});
BRANCHES=branchRows.map(b=>({id:b.id,name:b.name,code:b.code,region:b.region_id||b.region||'default'}));
BRANCHES.forEach(b=>{if(!REGIONS[b.region])REGIONS[b.region]={name:b.region,branches:[]};REGIONS[b.region].branches.push(b.id);});

const empBranchMap=deriveEmployeeBranches(scheduleRows);
EMPS=empRows.map(e=>{
const fallbackBranch=branchRows.find(b=>b.region_id===(e.region_id||BRANCHES[0]?.region))?.id||BRANCHES[0]?.id||'';
return {id:e.id,name:e.name,code:e.code,c:e.color||'#4CAF50',branch:empBranchMap[e.id]||e.branch_id||fallbackBranch,pos:e.position||'พนักงานขาย',phone:e.phone||'-',line:Boolean(e.line_connected),start:e.start_date||'',status:e.status||'active',salary:Number(e.salary||0),region:e.region_id||''};
});

SCH={};
scheduleRows.forEach(row=>{const k=`${row.branch_id}_${row.work_date}`;if(!SCH[k])SCH[k]=[];SCH[k].push(row.employee_id);});
BRANCH_QUOTA=deriveBranchQuotaFromDb();
EMP_BRANCHES=deriveEmployeeBranchesFromDb();
LEAVES=leaveRows.map(l=>({id:String(l.id),empId:l.employee_id,type:l.leave_type||'ลา',from:l.start_date,to:l.end_date,days:Number(l.days_count||1),status:l.status||'pending',reason:l.reason||''}));
LBAL={};
balanceRows.forEach(b=>{LBAL[b.employee_id]={a:Number(b.annual_remaining||0),v:Number(b.vacation_remaining||0),s:Number(b.sick_used||0),p:Number(b.personal_used||0)};});
CONTRACTS=contractRows.map(c=>({id:String(c.id),empId:c.employee_id,type:c.contract_type||c.type||'ประจำ',label:c.label||c.contract_type||'สัญญาจ้าง',start:c.start_date,end:c.end_date,file:c.file_url||''}));
SALES=salesRows.map(s=>mapSaleRow(s));
BANK_ACCOUNTS=bankRows.map(b=>({id:b.id,bank:b.bank_name,bankShort:b.bank_short,color:b.color_code||'#138F2D',accNo:b.account_no,accName:b.account_name,type:b.account_type||'ออมทรัพย์',active:b.is_active!==false}));
DEPOSITS=depositRows.map(d=>mapDepositRow(d));
ATTENDANCE=attendanceRows.map(a=>({id:String(a.id),empId:a.employee_id,date:a.work_date,clockIn:formatDbTime(a.clock_in),clockOut:formatDbTime(a.clock_out),lateMin:Number(a.late_minutes||0),breakStart:formatDbTime(a.break_start),breakMins:Number(a.break_minutes||0),breakOver:Boolean(a.is_break_over),branch:a.branch_id}));
STORE_OPENINGS=deriveStoreOpeningsFromAttendance(ATTENDANCE);
INSPECTIONS=inspectionRows.map(i=>({id:String(i.id),date:i.work_date,bid:i.branch_id,submittedBy:i.submitted_by,lineUserId:i.submitted_by,submitTime:formatDbTime(i.submit_time),status:i.status||'pass',items:normalizeInspectionItems(i.inspection_items),reviewedBy:i.reviewed_by,reviewTime:formatDbTime(i.review_time),note:i.manager_note||'',editLog:[]}));
ATT_ALERTS=alertRows.map(a=>({id:String(a.id),type:a.alert_type,empId:a.employee_id,date:a.work_date,branch:a.branch_id,title:a.title,detail:a.detail||'',severity:a.severity||'warning',time:formatDbTime(a.created_at)||'',ack:Boolean(a.is_acknowledged),warningIssued:false}));
WL_TEMPLATES=templateRows.map(t=>({id:t.id,level:t.level,name:t.name,desc:t.description||'',body:t.body_template||''}));
WARNING_LETTERS=warningRows.map(w=>({id:String(w.id),empId:w.employee_id,templateId:w.template_id,level:w.level,date:w.issue_date,reason:w.reason,alertId:null,branch:w.branch_id,issuedBy:w.issued_by,status:w.status||'draft',signedByEmp:Boolean(w.is_signed_by_emp),signDate:(w.signed_at||'').split('T')[0]||null}));
AUDIT_LOGS=buildAuditLogsFromDb(SALES,INSPECTIONS,DEPOSITS);
LINE_GROUPS=buildLineGroupsFromDb();
USERS=userRows.map(u=>({username:u.username,name:u.name,role:u.role,scope:u.scope||u.scope_value||u.scopeType||u.scope_type,label:u.label||u.role}));
setDateRangeFromDbRows({scheduleRows,salesRows,depositRows,attendanceRows,inspectionRows,warningRows,leaveRows});
}

function deriveEmployeeBranches(scheduleRows){
const byEmployee={};
scheduleRows.slice().sort((a,b)=>String(b.work_date).localeCompare(String(a.work_date))).forEach(s=>{if(!byEmployee[s.employee_id])byEmployee[s.employee_id]=s.branch_id;});
return byEmployee;
}

function deriveBranchQuotaFromDb(){
const quota={};
BRANCHES.forEach(b=>{
const counts=Object.entries(SCH)
.filter(([key])=>key.startsWith(b.id+'_'))
.map(([,eids])=>eids.length);
const maxCount=counts.length?Math.max(...counts):1;
quota[b.id]={weekday:Math.max(1,maxCount),weekend:Math.max(1,Math.min(maxCount,1))};
});
return quota;
}

function deriveEmployeeBranchesFromDb(){
const byEmployee={};
EMPS.forEach(e=>{byEmployee[e.id]=[e.branch].filter(Boolean);});
Object.entries(SCH).forEach(([key,eids])=>{
const branchId=key.split('_')[0];
eids.forEach(eid=>{
if(!byEmployee[eid])byEmployee[eid]=[];
if(branchId&&!byEmployee[eid].includes(branchId))byEmployee[eid].push(branchId);
});
});
return byEmployee;
}

function formatDbTime(value){
if(!value)return null;
const text=String(value);
if(text.includes('T'))return text.split('T')[1].slice(0,5);
return text.slice(0,5);
}

function mapSaleRow(s){
const editLog=Array.isArray(s.edit_logs)?s.edit_logs:[];
return {
id:String(s.id),
date:s.sell_date||s.date,
bid:s.branch_id,
total:Number(s.total_amount||0),
cash:Number(s.cash_amount||0),
transfer:Number(s.transfer_amount||0),
credit:Number(s.credit_amount||0),
qr:Number(s.qr_amount||0),
orders:Number(s.orders_count||0),
submittedBy:s.submitted_by||null,
submitTime:formatDbTime(s.created_at),
confirmedBy:s.confirmed_by||null,
confirmTime:formatDbTime(s.confirmed_at),
status:s.status||'confirmed',
editLog:editLog.map(log=>({time:formatDbTime(log.time||log.created_at),by:log.by||log.user_id,field:log.field,from:log.from??log.oldValue,to:log.to??log.newValue,reason:log.reason||''})),
rawText:s.raw_text||''
};
}

function mapDepositRow(d){
return {
id:String(d.id),
date:d.deposit_date||d.date,
bid:d.branch_id,
expected:Number(d.expected_amount||0),
deposited:Number(d.deposited_amount||0),
slip:Boolean(d.slip_url),
bankAccId:d.bank_account_id||null,
depositedBy:d.deposited_by||null,
depositTime:formatDbTime(d.created_at),
verifiedBy:d.verified_by||null,
verifyTime:formatDbTime(d.verified_at),
status:d.status||'waiting'
};
}

function deriveStoreOpeningsFromAttendance(rows){
return rows.map(a=>({
id:'open_'+a.branch+'_'+a.date+'_'+a.empId,
date:a.date,
bid:a.branch,
empId:a.empId,
opened:Boolean(a.clockIn),
time:a.clockIn,
isLate:Number(a.lateMin||0)>0,
lateMin:Number(a.lateMin||0),
photos:0
}));
}

function normalizeInspectionItems(items){
const parsed=typeof items==='string'?safeJsonParse(items,{}):(items||{});
const normalized={...parsed};
['storeOpen','changeMoney','utilities','storePhotos','inventory'].forEach(key=>{
if(!normalized[key])normalized[key]={pass:true,photos:[]};
if(typeof normalized[key].pass==='undefined')normalized[key].pass=true;
});
return normalized;
}

function safeJsonParse(text,fallback){
try{return JSON.parse(text);}catch(_err){return fallback;}
}

function buildAuditLogsFromDb(sales,inspections,deposits){
const logs=[];
sales.forEach(s=>(s.editLog||[]).forEach((log,idx)=>logs.push({id:'sale_'+s.id+'_'+idx,timestamp:s.date+'T'+(log.time||'00:00'),userId:log.by,action:'update',tableName:'sales',recordId:s.id,field:log.field,oldValue:log.from,newValue:log.to,source:'dashboard',branchId:s.bid})));
inspections.forEach(i=>logs.push({id:'inspection_'+i.id,timestamp:i.date+'T'+(i.submitTime||'00:00'),userId:i.submittedBy,action:'create',tableName:'inspection',recordId:i.id,field:'status',oldValue:null,newValue:i.status,source:'liff',branchId:i.bid}));
deposits.filter(d=>d.verifiedBy).forEach(d=>logs.push({id:'deposit_'+d.id,timestamp:d.date+'T'+(d.verifyTime||'00:00'),userId:d.verifiedBy,action:'verify',tableName:'deposit',recordId:d.id,field:'verified_by',oldValue:null,newValue:d.verifiedBy,source:'dashboard',branchId:d.bid}));
return logs.sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
}

function buildLineGroupsFromDb(){
return Object.entries(REGIONS).map(([regionId,region])=>({
name:'Cruzy '+region.name,
region:regionId,
branches:region.branches,
members:EMPS.filter(e=>region.branches.includes(e.branch)).map(e=>e.id),
manager:null
}));
}

function setDateRangeFromDbRows(groups){
let dates=[];
groups.scheduleRows.forEach(r=>dates.push(r.work_date));
groups.salesRows.forEach(r=>dates.push(r.sell_date));
groups.depositRows.forEach(r=>dates.push(r.deposit_date));
groups.attendanceRows.forEach(r=>dates.push(r.work_date));
groups.inspectionRows.forEach(r=>dates.push(r.work_date));
groups.warningRows.forEach(r=>dates.push(r.issue_date));
if(!dates.filter(Boolean).length){
groups.leaveRows.forEach(r=>dates.push(r.start_date,r.end_date));
}
const valid=dates.filter(Boolean).sort();
if(!valid.length)return;
selDate=valid[valid.length-1];
selDateTo=selDate;
}

// ================================
// LOGIN
// ================================
function fillLogin(u,p){document.getElementById('loginUser').value=u;document.getElementById('loginPass').value=p;doLogin();}
async function doLogin(){
const u=document.getElementById('loginUser').value.trim(),p=document.getElementById('loginPass').value.trim();
const errEl=document.getElementById('loginError');
errEl.style.display='none';
try{
const res=await fetch(`${API_URL}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
const result=await res.json().catch(()=>({}));
if(!res.ok)throw new Error(result.message||'Username หรือ Password ไม่ถูกต้อง');
user=result.user;
const loaded=await loadConsoleData();
if(!loaded)throw new Error('Load DB failed');
document.getElementById('loginOverlay').classList.add('hidden');
document.getElementById('mainNav').style.display='flex';
document.getElementById('app').style.display='flex';
document.getElementById('navRole').textContent=user.label||user.role;
document.getElementById('navUser').textContent=`${user.label||user.role} ${user.name}`;
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
h+=`<button class="sb-item ${curTab==='employee'?'active':''}" onclick="setTab('employee')"><span class="icon">👤</span><span>พนักงาน</span></button>`;
h+=`<button class="sb-item ${curTab==='sales'?'active':''}" onclick="setTab('sales')"><span class="icon">💰</span><span>ยอดขาย</span></button>`;
h+=`<button class="sb-item ${curTab==='commission'?'active':''}" onclick="setTab('commission')"><span class="icon">💎</span><span>ค่าคอม</span></button>`;
h+=`<button class="sb-item ${curTab==='inspection'?'active':''}" onclick="setTab('inspection')"><span class="icon">🔍</span><span>ตรวจร้าน</span></button>`;
const unackAlerts=ATT_ALERTS.filter(a=>!a.ack&&(curBranch==='all'||a.branch===curBranch)).length;
h+=`<button class="sb-item ${curTab==='alerts'?'active':''}" onclick="setTab('alerts')"><span class="icon">🚨</span><span>แจ้งเตือน${unackAlerts?'<span class="alert-count-badge">'+unackAlerts+'</span>':''}</span></button>`;
h+=`<button class="sb-item ${curTab==='warning'?'active':''}" onclick="setTab('warning')"><span class="icon">📄</span><span>หนังสือเตือน</span></button>`;
if(user.role==='owner')h+=`<button class="sb-item ${curTab==='auditlog'?'active':''}" onclick="setTab('auditlog')"><span class="icon">📋</span><span>Log</span></button>`;
if(user.role==='owner')h+=`<button class="sb-item ${curTab==='access'?'active':''}" onclick="setTab('access')"><span class="icon">🔐</span><span>สิทธิ์</span></button>`;
h+='</div>';

h+='<div class="sb-section"><div class="sb-section-title">สาขา</div>';
h+=`<button class="sb-branch ${curBranch==='all'?'active':''}" onclick="setBranch('all')"><span class="code">ALL</span><span>ทุกสาขา</span></button>`;
let lastRegion='';
branches.forEach(b=>{
if(b.region!==lastRegion){lastRegion=b.region;h+=`<div class="sb-region">${REGIONS[b.region].name}</div>`;}
h+=`<button class="sb-branch ${curBranch===b.id?'active':''}" onclick="setBranch('${b.id}')"><span class="code">${b.code}</span><span>${b.name.split(' ').pop()}</span></button>`;
});
h+='</div>';
sb.innerHTML=h;
}

let salesSub='sales';
let alertFilter='all',warnSub='issued',warnSelTpl=null,warnSelEmp=null;
function setTab(t){curTab=t;empSub='info';contractFilter='all';schView='planner';salesSub='sales';inspSub='opening';logFilter='all';alertFilter='all';warnSub='issued';warnSelTpl=null;warnSelEmp=null;buildSidebar();render();}
function setBranch(b){curBranch=b;buildSidebar();render();}

// ================================
// DATE BAR
// ================================
function renderDateBar(){
const db=document.getElementById('dateBar');
let h=`<span style="font-size:12px;font-weight:600;color:var(--tl)">📅</span>`;
h+=`<input type="date" id="dFrom" value="${selDate}" onchange="selDate=this.value;if(this.value>selDateTo){selDateTo=this.value;}render()">`;
h+=`<span style="font-size:12px;color:var(--tl)">ถึง</span>`;
h+=`<input type="date" id="dTo" value="${selDateTo}" onchange="selDateTo=this.value;if(this.value<selDate){selDate=this.value;}render()">`;
h+=`<button class="date-btn" onclick="setDatePreset('today')">วันนี้</button>`;
h+=`<button class="date-btn" onclick="setDatePreset('week')">7 วัน</button>`;
h+=`<button class="date-btn" onclick="setDatePreset('month')">เดือนนี้</button>`;
h+=`<span class="date-label" id="dateLabel"></span>`;
db.innerHTML=h;
// label
const dF=new Date(selDate+'T00:00:00');
const dT=new Date(selDateTo+'T00:00:00');
const optF={weekday:'long',day:'numeric',month:'long',year:'numeric'};
const optS={day:'numeric',month:'long',year:'numeric'};
if(selDate===selDateTo){
  document.getElementById('dateLabel').textContent=dF.toLocaleDateString('th-TH',optF);
}else{
  document.getElementById('dateLabel').textContent=dF.toLocaleDateString('th-TH',optS)+' — '+dT.toLocaleDateString('th-TH',optS);
}
}
function setDatePreset(p){
const today=new Date();
if(p==='today'){selDate=fmtD(today);selDateTo=fmtD(today);}
else if(p==='week'){const start=new Date(today);start.setDate(today.getDate()-6);selDate=fmtD(start);selDateTo=fmtD(today);}
else if(p==='month'){const start=new Date(today.getFullYear(),today.getMonth(),1);selDate=fmtD(start);selDateTo=fmtD(today);}
render();
}

// ================================
// RENDER
// ================================
function render(){
renderDateBar();
document.getElementById('subTabs').innerHTML='';
const c=document.getElementById('content');
if(curTab==='schedule')renderSchedule(c);
else if(curTab==='leave')renderLeave(c);
else if(curTab==='employee')renderEmployee(c);
else if(curTab==='sales')renderSales(c);
else if(curTab==='commission')renderCommission(c);
else if(curTab==='inspection')renderInspection(c);
else if(curTab==='alerts')renderAlerts(c);
else if(curTab==='warning')renderWarning(c);
else if(curTab==='auditlog')renderAuditLog(c);
else if(curTab==='access')renderAccess(c);
}

// ================================
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

function addToSch(branchId,date,empId){
const key=`${branchId}_${date}`;
if(!SCH[key])SCH[key]=[];
if(!SCH[key].includes(empId)){SCH[key].push(empId);toast(`✅ เพิ่ม ${EMPS.find(e=>e.id===empId)?.name} → ${BRANCHES.find(b=>b.id===branchId)?.code} ${thD(date)}`);}
render();
}
function removeFromSch(branchId,date,empId){
const key=`${branchId}_${date}`;
if(SCH[key]){SCH[key]=SCH[key].filter(id=>id!==empId);toast(`🗑 ลบ ${EMPS.find(e=>e.id===empId)?.name} ออกจาก ${BRANCHES.find(b=>b.id===branchId)?.code} ${thD(date)}`);}
render();
}

// ================================
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
let h=`<div class="stats-row">
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${emps.length}</div><div class="stat-label">ทั้งหมด</div></div>
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${emps.filter(e=>e.status==='active').length}</div><div class="stat-label">ประจำ</div></div>
<div class="stat-card orange"><div class="stat-num" style="color:var(--accent)">${emps.filter(e=>e.status==='trial').length}</div><div class="stat-label">ทดลอง</div></div>
<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">${emps.filter(e=>e.status==='freelance').length}</div><div class="stat-label">Freelance</div></div>
</div>`;
h+=`<div class="tw"><div class="tw-head"><h3>👤 พนักงาน</h3><button class="btn btn-primary" onclick="toast('➕ เพิ่มพนักงาน')">+ เพิ่ม</button></div><table><tr><th>รหัส</th><th>ชื่อ</th><th>ตำแหน่ง</th><th>สาขา</th><th>สถานะ</th><th>LINE</th><th>เบอร์โทร</th></tr>`;
emps.forEach(e=>{const b=BRANCHES.find(x=>x.id===e.branch);
const statusMap={trial:{cls:'trial',label:'ทดลอง'},active:{cls:'active',label:'ประจำ'},freelance:{cls:'waiting',label:'Freelance'}};
const sm=statusMap[e.status]||statusMap.active;
h+=`<tr><td style="font-weight:600">${e.code}</td><td><span class="emp-dot" style="background:${e.c}">${e.name[0]}</span>${e.name}</td><td>${e.pos}</td><td>${b?.code}</td><td><span class="badge ${sm.cls}">${sm.label}</span></td><td>${e.line?'✅':'❌'}</td><td>${e.phone}</td></tr>`;});
h+='</table></div>';
el.innerHTML=h;
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
// ================================
function renderSales(el){
// Sub-tabs
const st=document.getElementById('subTabs');
const isOwner=user&&(user.role==='owner'||user.role==='regional');
let tabs=`<button class="sub-tab ${salesSub==='sales'?'active':''}" onclick="salesSub='sales';render()">💰 ยอดขาย</button>`;
tabs+=`<button class="sub-tab ${salesSub==='deposit'?'active':''}" onclick="salesSub='deposit';render()">🏦 ฝากเงิน</button>`;
tabs+=`<button class="sub-tab ${salesSub==='account'?'active':''}" onclick="salesSub='account';render()">📊 สรุปบัญชี</button>`;
if(isOwner)tabs+=`<button class="sub-tab ${salesSub==='manage'?'active':''}" onclick="salesSub='manage';render()">⚙️ จัดการบัญชี</button>`;
st.innerHTML=tabs;

if(salesSub==='sales')renderSalesMain(el);
else if(salesSub==='deposit')renderDepositSub(el);
else if(salesSub==='account')renderAccountSummary(el);
else if(salesSub==='manage'&&isOwner)renderManageAccounts(el);
else{salesSub='sales';renderSalesMain(el);}
}

function renderSalesMain(el){
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const dates=dRange(selDate,selDateTo);
const rows=SALES.filter(s=>bids.includes(s.bid)&&dates.includes(s.date));
const tS=rows.reduce((s,x)=>s+x.total,0),tC=rows.reduce((s,x)=>s+x.cash,0),tTr=rows.reduce((s,x)=>s+x.transfer,0),tCr=rows.reduce((s,x)=>s+x.credit,0);
const tQr=rows.reduce((s,x)=>s+(x.qr||0),0);
const drafts=rows.filter(r=>r.status==='draft').length;
const edited=rows.filter(r=>r.status==='edited').length;
const confirmed=rows.filter(r=>r.status==='confirmed').length;

let h=`<div class="stats-row">
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">฿${nf(tS)}</div><div class="stat-label">ยอดขาย</div></div>
<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">฿${nf(tC)}</div><div class="stat-label">เงินสด</div></div>
<div class="stat-card purple"><div class="stat-num" style="color:var(--purple)">฿${nf(tQr)}</div><div class="stat-label">QR Code</div></div>
<div class="stat-card orange"><div class="stat-num" style="color:var(--accent)">฿${nf(tCr)}</div><div class="stat-label">เครดิต</div></div>
</div>`;

// Status summary
h+=`<div class="stats-row">
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${confirmed}</div><div class="stat-label">✅ ยืนยันแล้ว</div></div>
<div class="stat-card ${drafts?'orange':''}"><div class="stat-num" style="color:${drafts?'var(--accent)':'var(--primary)'}">${drafts}</div><div class="stat-label">📝 รอยืนยัน</div></div>
<div class="stat-card ${edited?'blue':''}"><div class="stat-num" style="color:${edited?'var(--info)':'var(--primary)'}">${edited}</div><div class="stat-label">✏️ มีแก้ไข</div></div>
</div>`;

function empName(eid){const e=EMPS.find(x=>x.id===eid);return e?`<span class="emp-dot" style="background:${e.c};width:16px;height:16px;font-size:7px">${e.name[0]}</span>${e.name}`:'—';}
function empChip(eid,time){const e=EMPS.find(x=>x.id===eid);if(!e)return'—';return `<span class="submitter"><span class="emp-dot" style="background:${e.c};width:14px;height:14px;font-size:7px">${e.name[0]}</span>${e.name}${time?' · '+time:''}</span>`;}

if(curBranch==='all'){
h+=`<div class="tw"><div class="tw-head"><h3>💰 ยอดขายแยกสาขา</h3></div><table><tr><th>สาขา</th><th>ยอดรวม</th><th>เงินสด</th><th>QR</th><th>เครดิต</th><th>ส่งโดย</th><th>สถานะ</th></tr>`;
visBranches().forEach(b=>{
const br=rows.filter(r=>r.bid===b.id);if(!br.length)return;
const t=br.reduce((s,x)=>s+x.total,0),c=br.reduce((s,x)=>s+x.cash,0),q=br.reduce((s,x)=>s+(x.qr||0),0),cr=br.reduce((s,x)=>s+x.credit,0);
const latestRow=br[br.length-1];
const stLabel=latestRow.status==='confirmed'?'<span class="badge confirmed">✅ ยืนยัน</span>':latestRow.status==='draft'?'<span class="badge draft">📝 รอยืนยัน</span>':'<span class="badge edited">✏️ แก้ไข</span>';
h+=`<tr><td style="font-weight:600;color:var(--primary);cursor:pointer" onclick="setBranch('${b.id}')">${b.code} ${b.name}</td><td>฿${nf(t)}</td><td>฿${nf(c)}</td><td>฿${nf(q)}</td><td>฿${nf(cr)}</td><td>${empChip(latestRow.submittedBy,latestRow.submitTime)}</td><td>${stLabel}</td></tr>`;
});
h+='</table></div>';
}else{
const b=BRANCHES.find(x=>x.id===curBranch);
h+=`<div class="tw"><div class="tw-head"><h3>💰 ${b.code} ${b.name}</h3></div><table><tr><th>วันที่</th><th>ยอดรวม</th><th>เงินสด</th><th>QR</th><th>เครดิต</th><th>ส่งโดย</th><th>ยืนยันโดย</th><th>สถานะ</th><th></th></tr>`;
dates.forEach(d=>{const r=SALES.find(s=>s.date===d&&s.bid===curBranch);if(!r)return;
const stLabel=r.status==='confirmed'?'<span class="badge confirmed">✅ ยืนยัน</span>':r.status==='draft'?'<span class="badge draft">📝 รอยืนยัน</span>':'<span class="badge edited">✏️ แก้ไข</span>';
h+=`<tr><td style="font-weight:600">${thD(d)}</td><td>฿${nf(r.total)}</td><td>฿${nf(r.cash)}</td><td>฿${nf(r.qr||0)}</td><td>฿${nf(r.credit)}</td>`;
h+=`<td>${empChip(r.submittedBy,r.submitTime)}</td>`;
h+=`<td>${r.confirmedBy?empChip(r.confirmedBy,r.confirmTime):'<span style="color:var(--accent);font-size:10px">⏳ รอ</span>'}</td>`;
h+=`<td>${stLabel}</td>`;
h+=`<td>${r.editLog&&r.editLog.length?`<button class="action-btn view" onclick="showSalesLog('${r.id}')">📋 log (${r.editLog.length})</button>`:''}${r.status==='draft'?`<button class="action-btn approve" onclick="confirmSale('${r.id}')">✅</button>`:''}</td>`;
h+=`</tr>`;});
h+='</table></div>';
}
el.innerHTML=h;
}

function showSalesLog(saleId){
const s=SALES.find(x=>x.id===saleId);if(!s)return;
const e=EMPS.find(x=>x.id===s.submittedBy);
const b=BRANCHES.find(x=>x.id===s.bid);

let body=`<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;padding:10px;background:#FAFAFA;border-radius:8px">
<div style="font-size:12px"><b>${b?.code}</b> · ${thD(s.date)} · ฿${nf(s.total)}</div></div>`;

body+='<div class="log-timeline">';
// Submit event
body+=`<div class="log-item submit"><span class="time">${s.submitTime}</span><div class="detail"><b>📤 ส่งยอดขาย</b> ผ่าน LINE Chat<br><span style="font-size:11px;color:var(--tl)">โดย ${empName(s.submittedBy)} · LINE ID: ${s.submittedBy}</span></div></div>`;

// Confirm event
if(s.confirmedBy){
body+=`<div class="log-item confirm"><span class="time">${s.confirmTime}</span><div class="detail"><b>✅ ยืนยันยอด</b> ผ่าน LIFF<br><span style="font-size:11px;color:var(--tl)">โดย ${empName(s.confirmedBy)} · LINE ID: ${s.confirmedBy}</span></div></div>`;
}

// Edit events
if(s.editLog){s.editLog.forEach(log=>{
const fieldLabel={total:'ยอดรวม',cash:'เงินสด',transfer:'โอน',credit:'เครดิต',qr:'QR Code'}[log.field]||log.field;
body+=`<div class="log-item edit"><span class="time">${log.time}</span><div class="detail"><b>✏️ แก้ไข${fieldLabel}</b><br><span style="font-size:11px;color:var(--tl)">โดย ${empName(log.by)} · LINE ID: ${log.by}</span>
<div class="change"><span class="old">฿${nf(log.from)}</span> → <span class="new">฿${nf(log.to)}</span></div>
${log.reason?`<div style="font-size:10px;color:var(--tl);margin-top:2px">💬 "${log.reason}"</div>`:''}</div></div>`;
});}

body+='</div>';

// Raw text
body+=`<div style="margin-top:12px"><div style="font-size:11px;font-weight:600;color:var(--tl);margin-bottom:4px">💬 ข้อความต้นฉบับจาก LINE:</div><div style="background:#F5F5F5;border-radius:8px;padding:10px;font-size:11px;font-family:monospace;white-space:pre-wrap;color:#555">${s.rawText||'—'}</div></div>`;

openModal(`📋 ประวัติยอดขาย — ${b?.code} ${thD(s.date)}`,body,`<button class="btn btn-ghost" onclick="closeModal()">ปิด</button>`);
}

function confirmSale(saleId){
const s=SALES.find(x=>x.id===saleId);if(!s)return;
s.status='confirmed';s.confirmedBy=s.submittedBy;s.confirmTime='ตอนนี้';
toast('✅ ยืนยันยอดขาย ฿'+nf(s.total));render();
}

// ================================
// DEPOSIT (sub-tab of Sales)
// ================================
function bankChip(accId){
  const a=BANK_ACCOUNTS.find(x=>x.id===accId);
  if(!a)return'—';
  return `<span class="bank-chip" style="background:${a.color}">${a.bankShort} ${a.accNo.slice(-6)}</span>`;
}
function empChipSmall(eid,time){const e=EMPS.find(x=>x.id===eid);if(!e)return'—';return `<span class="submitter"><span class="emp-dot" style="background:${e.c};width:14px;height:14px;font-size:7px">${e.name[0]}</span>${e.name}${time?' · '+time:''}</span>`;}

function renderDepositSub(el){
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const dates=dRange(selDate,selDateTo);
const rows=DEPOSITS.filter(d=>bids.includes(d.bid)&&dates.includes(d.date));
const done=rows.filter(d=>d.deposited>0).length,total=rows.length;
const mm=rows.filter(d=>d.deposited>0&&d.deposited!==d.expected).length;
const verified=rows.filter(d=>d.verifiedBy).length;

let h=`<div class="stats-row">
<div class="stat-card teal"><div class="stat-num" style="color:var(--teal)">${done}/${total}</div><div class="stat-label">ฝากแล้ว</div></div>
<div class="stat-card ${mm?'red':''}"><div class="stat-num" style="color:${mm?'var(--danger)':'var(--primary)'}">${mm}</div><div class="stat-label">ยอดไม่ตรง</div></div>
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">฿${nf(rows.reduce((s,d)=>s+d.expected,0))}</div><div class="stat-label">ยอดต้องฝาก</div></div>
<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">${verified}/${done}</div><div class="stat-label">✅ ตรวจแล้ว</div></div>
</div>`;

h+=`<div class="tw"><div class="tw-head"><h3>🏦 ฝากเงินสด</h3></div><table><tr>${curBranch==='all'?'<th>สาขา</th>':''}<th>วันที่</th><th>ยอดเงินสด</th><th>ยอดฝาก</th><th>ธนาคาร / บัญชี</th><th>ส่งฝากโดย</th><th>สลิป</th><th>สถานะ</th><th>ตรวจสอบ</th></tr>`;
rows.sort((a,b)=>a.date.localeCompare(b.date)).forEach(d=>{
const br=BRANCHES.find(x=>x.id===d.bid);const diff=d.deposited-d.expected;
let st,sc;if(!d.deposited){st='⏳ รอฝาก';sc='waiting';}else if(diff===0){st='✅ ตรง';sc='match';}else{st=`❌ ขาด ฿${nf(Math.abs(diff))}`;sc='mismatch';}
h+=`<tr>${curBranch==='all'?`<td style="font-weight:600">${br?.code}</td>`:''}`;
h+=`<td>${thD(d.date)}</td><td>฿${nf(d.expected)}</td><td>${d.deposited?'฿'+nf(d.deposited):'—'}</td>`;
h+=`<td>${d.bankAccId?bankChip(d.bankAccId):'—'}</td>`;
h+=`<td>${d.depositedBy?empChipSmall(d.depositedBy,d.depositTime):'—'}</td>`;
h+=`<td>${d.slip?'📎':'—'}</td>`;
h+=`<td><span class="badge ${sc}">${st}</span></td>`;
h+=`<td>${d.verifiedBy?`<span class="verified-badge">✅ ตรวจแล้ว</span>`:d.deposited?`<button class="action-btn approve" onclick="toast('✅ ยืนยันตรวจสอบ')">ตรวจ</button>`:'—'}</td>`;
h+=`</tr>`;});
h+='</table></div>';
el.innerHTML=h;
}

// ================================
// ACCOUNT SUMMARY (สรุปบัญชี — เทียบ statement)
// ================================
function renderAccountSummary(el){
const dates=dRange(selDate,selDateTo);
const allDeps=DEPOSITS.filter(d=>dates.includes(d.date)&&d.deposited>0);
const activeAccs=BANK_ACCOUNTS.filter(a=>a.active);

let h='';

// Account cards with totals
h+='<div class="acc-grid">';
activeAccs.forEach(acc=>{
  const accDeps=allDeps.filter(d=>d.bankAccId===acc.id);
  const total=accDeps.reduce((s,d)=>s+d.deposited,0);
  const count=accDeps.length;
  h+=`<div class="acc-card" style="border-left-color:${acc.color}">
  <div class="acc-card-head">
    <div><span class="bank-chip" style="background:${acc.color}">${acc.bankShort}</span> <span style="font-size:12px;font-weight:600;margin-left:4px">${acc.bank}</span></div>
    <div class="acc-total" style="color:${acc.color}">฿${nf(total)}</div>
  </div>
  <div class="acc-card-body">
    <div class="acc-row"><span style="color:var(--tl)">บัญชี</span><span>${acc.accNo}</span></div>
    <div class="acc-row"><span style="color:var(--tl)">ชื่อบัญชี</span><span>${acc.accName}</span></div>
    <div class="acc-row"><span style="color:var(--tl)">ประเภท</span><span>${acc.type}</span></div>
    <div class="acc-row"><span style="color:var(--tl)">จำนวนรายการ</span><span style="font-weight:700">${count} รายการ</span></div>
  </div></div>`;
});
h+='</div>';

// Grand total
const grandTotal=allDeps.reduce((s,d)=>s+d.deposited,0);
h+=`<div class="stats-row">
<div class="stat-card teal"><div class="stat-num" style="color:var(--teal)">฿${nf(grandTotal)}</div><div class="stat-label">ยอดฝากรวมทุกบัญชี</div></div>
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${allDeps.length}</div><div class="stat-label">รายการทั้งหมด</div></div>
<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">${activeAccs.length}</div><div class="stat-label">บัญชีที่ใช้งาน</div></div>
</div>`;

// Daily breakdown per account (for statement matching)
h+=`<div class="tw"><div class="tw-head"><h3>📊 ยอดเข้าบัญชีรายวัน (ทุกสาขารวม) — เทียบ Statement</h3></div><table><tr><th>วันที่</th>`;
activeAccs.forEach(acc=>{h+=`<th><span class="bank-chip" style="background:${acc.color}">${acc.bankShort}</span></th>`;});
h+=`<th style="font-weight:700">รวมวัน</th></tr>`;

dates.forEach(date=>{
  const dayDeps=allDeps.filter(d=>d.date===date);
  const dayTotal=dayDeps.reduce((s,d)=>s+d.deposited,0);
  if(!dayTotal)return;
  h+=`<tr><td style="font-weight:600">${thD(date)}</td>`;
  activeAccs.forEach(acc=>{
    const accDayDeps=dayDeps.filter(d=>d.bankAccId===acc.id);
    const accDayTotal=accDayDeps.reduce((s,d)=>s+d.deposited,0);
    const count=accDayDeps.length;
    h+=`<td>${accDayTotal?`<div style="font-weight:700">฿${nf(accDayTotal)}</div><div style="font-size:9px;color:var(--tl)">${count} รายการ</div>`:'—'}</td>`;
  });
  h+=`<td style="font-weight:700;color:var(--primary)">฿${nf(dayTotal)}</td></tr>`;
});
// Total row
h+=`<tr style="background:#F5F5F5;font-weight:700"><td>รวม</td>`;
activeAccs.forEach(acc=>{
  const t=allDeps.filter(d=>d.bankAccId===acc.id).reduce((s,d)=>s+d.deposited,0);
  h+=`<td style="color:${acc.color}">฿${nf(t)}</td>`;
});
h+=`<td style="color:var(--primary)">฿${nf(grandTotal)}</td></tr>`;
h+='</table></div>';

// Detail per account: which branch deposited what
h+=`<div class="tw"><div class="tw-head"><h3>📋 รายละเอียดแยกสาขา × บัญชี</h3></div><table><tr><th>วันที่</th><th>สาขา</th><th>ยอดฝาก</th><th>ธนาคาร</th><th>ฝากโดย</th><th>เวลา</th><th>ตรวจ</th></tr>`;
allDeps.sort((a,b)=>a.date.localeCompare(b.date)).forEach(d=>{
  const br=BRANCHES.find(x=>x.id===d.bid);
  h+=`<tr><td>${thD(d.date)}</td><td style="font-weight:600">${br?.code}</td><td>฿${nf(d.deposited)}</td><td>${bankChip(d.bankAccId)}</td><td>${empChipSmall(d.depositedBy)}</td><td>${d.depositTime||'—'}</td><td>${d.verifiedBy?'<span class="verified-badge">✅</span>':'<span class="unverified-badge">⏳ รอ</span>'}</td></tr>`;
});
h+='</table></div>';

el.innerHTML=h;
}

// ================================
// MANAGE BANK ACCOUNTS (Owner only)
// ================================
function renderManageAccounts(el){
let h=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><h3 style="font-size:15px">⚙️ จัดการบัญชีธนาคาร</h3><button class="btn btn-primary" onclick="addBankAccount()">➕ เพิ่มบัญชี</button></div>`;

h+='<div class="acc-grid">';
BANK_ACCOUNTS.forEach((acc,idx)=>{
  const deps=DEPOSITS.filter(d=>d.bankAccId===acc.id&&d.deposited>0);
  const total=deps.reduce((s,d)=>s+d.deposited,0);
  h+=`<div class="acc-card" style="border-left-color:${acc.active?acc.color:'#ccc'};${acc.active?'':'opacity:.6'}">
  <div class="acc-card-head">
    <div><span class="bank-chip" style="background:${acc.color}">${acc.bankShort}</span>
    <span style="font-size:12px;font-weight:600;margin-left:4px">${acc.bank}</span>
    ${acc.active?'<span class="verified-badge" style="margin-left:4px">ใช้งาน</span>':'<span class="unverified-badge" style="margin-left:4px">ปิดใช้งาน</span>'}
    </div>
    <div style="display:flex;gap:4px">
      <button class="action-btn view" onclick="toast('✏️ แก้ไขบัญชี ${acc.bankShort}')">✏️</button>
      <button class="action-btn ${acc.active?'reject':'approve'}" onclick="toggleBankAcc(${idx})">${acc.active?'ปิด':'เปิด'}</button>
    </div>
  </div>
  <div class="acc-card-body">
    <div class="acc-row"><span style="color:var(--tl)">เลขบัญชี</span><span style="font-weight:600">${acc.accNo}</span></div>
    <div class="acc-row"><span style="color:var(--tl)">ชื่อบัญชี</span><span>${acc.accName}</span></div>
    <div class="acc-row"><span style="color:var(--tl)">ประเภท</span><span>${acc.type}</span></div>
    <div class="acc-row"><span style="color:var(--tl)">ยอดรวมฝาก</span><span style="font-weight:700;color:${acc.color}">฿${nf(total)}</span></div>
    <div class="acc-row"><span style="color:var(--tl)">จำนวนรายการ</span><span>${deps.length}</span></div>
  </div></div>`;
});
h+='</div>';
el.innerHTML=h;
}

function toggleBankAcc(idx){
BANK_ACCOUNTS[idx].active=!BANK_ACCOUNTS[idx].active;
toast(BANK_ACCOUNTS[idx].active?'✅ เปิดใช้งานบัญชี':'🔒 ปิดใช้งานบัญชี');
render();
}

function addBankAccount(){
const body=`
<div style="font-size:12px">
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">ธนาคาร</label><select style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px"><option>กสิกรไทย (KBANK)</option><option>กรุงเทพ (BBL)</option><option>ไทยพาณิชย์ (SCB)</option><option>กรุงไทย (KTB)</option><option>กรุงศรี (BAY)</option><option>ทหารไทยธนชาต (TTB)</option></select></div>
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">เลขบัญชี</label><input style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px" placeholder="xxx-x-xxxxx-x"></div>
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">ชื่อบัญชี</label><input style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px" value="บจก. ครูซี่"></div>
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">ประเภท</label><select style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px"><option>ออมทรัพย์</option><option>กระแสรายวัน</option></select></div>
</div>`;
openModal('➕ เพิ่มบัญชีธนาคาร',body,`<button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button><button class="btn btn-primary" onclick="toast('✅ เพิ่มบัญชีสำเร็จ');closeModal()">บันทึก</button>`);
}

// ================================
// COMMISSION
// ================================
function renderCommission(el){
const emps=visEmps();
const dates=dRange(selDate,selDateTo);
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];

// Calc commission per employee
const comData=emps.map(e=>{
const sales=SALES.filter(s=>s.bid===e.branch&&dates.includes(s.date)).reduce((s,x)=>s+x.total,0);
const tier=getTier(sales);const com=Math.round(sales*tier.pct/100);
return{...e,sales,tier,com};
});
const totalCom=comData.reduce((s,c)=>s+c.com,0);

let h=`<div class="tier-grid">`;
TIERS.forEach((t,i)=>{h+=`<div class="tier-card ${['','t2','t3','t4'][i]}"><div style="font-size:22px;font-weight:700;color:${['var(--primary)','var(--info)','var(--accent)','var(--danger)'][i]}">${t.pct}%</div><div style="font-size:11px;color:var(--tl)">฿${t.label}</div></div>`;});
h+='</div>';

h+=`<div class="stats-row"><div class="stat-card purple"><div class="stat-num" style="color:var(--purple)">฿${nf(totalCom)}</div><div class="stat-label">ค่าคอมรวม</div></div><div class="stat-card"><div class="stat-num" style="color:var(--primary)">${comData.length}</div><div class="stat-label">พนักงาน</div></div></div>`;

h+=`<div class="tw"><div class="tw-head"><h3>💎 ค่าคอม</h3></div><table><tr><th>พนักงาน</th><th>สาขา</th><th>ยอดขาย</th><th>Tier</th><th>%</th><th>ค่าคอม</th></tr>`;
comData.forEach(c=>{const b=BRANCHES.find(x=>x.id===c.branch);
h+=`<tr><td><span class="emp-dot" style="background:${c.c}">${c.name[0]}</span>${c.name}</td><td>${b?.code}</td><td>฿${nf(c.sales)}</td><td style="font-size:11px">${c.tier.label}</td><td style="font-weight:700;color:var(--info)">${c.tier.pct}%</td><td style="font-weight:700;color:var(--primary)">฿${nf(c.com)}</td></tr>`;});
h+=`<tr style="background:#F5F5F5;font-weight:700"><td colspan="5">รวม</td><td>฿${nf(totalCom)}</td></tr></table></div>`;
el.innerHTML=h;
}

// ================================
// PAYROLL
// ================================
function renderPayroll(el){
const emps=visEmps();
const dates=dRange(selDate,selDateTo);
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];

const payData=emps.map(e=>{
const sales=SALES.filter(s=>s.bid===e.branch&&dates.includes(s.date)).reduce((s,x)=>s+x.total,0);
const tier=getTier(sales);const com=Math.round(sales*tier.pct/100);
const ot=0;
const approvedLeaveDays=LEAVES
  .filter(l=>l.empId===e.id&&l.status==='approved'&&dates.some(d=>d>=l.from&&d<=l.to))
  .reduce((sum,l)=>sum+l.days,0);
const leaveDeduct=Math.round((e.salary/30)*approvedLeaveDays);
const ss=Math.min(Math.round(e.salary*0.05),750);
const net=e.salary+com+ot-leaveDeduct-ss;
const status='calculated';
return{...e,com,ot,leaveDeduct,ss,net,status};
});
const tBase=payData.reduce((s,p)=>s+p.salary,0),tCom=payData.reduce((s,p)=>s+p.com,0),tNet=payData.reduce((s,p)=>s+p.net,0);

let h=`<div class="stats-row">
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">฿${nf(tBase)}</div><div class="stat-label">เงินเดือนรวม</div></div>
<div class="stat-card purple"><div class="stat-num" style="color:var(--purple)">฿${nf(tCom)}</div><div class="stat-label">ค่าคอมรวม</div></div>
<div class="stat-card teal"><div class="stat-num" style="color:var(--teal)">฿${nf(tNet)}</div><div class="stat-label">จ่ายสุทธิ</div></div>
</div>`;
h+=`<div class="tw"><div class="tw-head"><h3>💵 เงินเดือน</h3><div><button class="btn btn-primary" onclick="toast('🔄 คำนวณเงินเดือน')">🔄 คำนวณ</button> <button class="btn btn-ghost" onclick="toast('📤 Export')">📤 Export</button></div></div><table><tr><th>พนักงาน</th><th>สาขา</th><th>เงินเดือน</th><th>ค่าคอม</th><th>OT</th><th>หักลา</th><th>ปกส.</th><th>สุทธิ</th><th>สถานะ</th></tr>`;
payData.forEach(p=>{const b=BRANCHES.find(x=>x.id===p.branch);
const sc=p.status==='paid'?'paid':p.status==='calculated'?'calculated':'pending';
const st=p.status==='paid'?'✅ จ่ายแล้ว':p.status==='calculated'?'📊 คำนวณ':'⏳ รอ';
h+=`<tr><td><span class="emp-dot" style="background:${p.c}">${p.name[0]}</span>${p.name}</td><td>${b?.code}</td><td>฿${nf(p.salary)}</td><td style="color:var(--purple)">฿${nf(p.com)}</td><td style="color:var(--accent)">฿${nf(p.ot)}</td><td style="color:${p.leaveDeduct?'var(--danger)':'var(--tl)'}">฿${nf(p.leaveDeduct)}</td><td>฿${nf(p.ss)}</td><td style="font-weight:700;color:var(--teal)">฿${nf(p.net)}</td><td><span class="badge ${sc}">${st}</span></td></tr>`;});
h+=`<tr style="background:#F5F5F5;font-weight:700"><td colspan="2">รวม</td><td>฿${nf(tBase)}</td><td>฿${nf(tCom)}</td><td></td><td></td><td></td><td style="color:var(--teal)">฿${nf(tNet)}</td><td></td></tr></table></div>`;
el.innerHTML=h;
}

// ================================
// INSPECTION (ตรวจร้าน)
// ================================
let inspSub='opening';

function renderInspection(el){
const st=document.getElementById('subTabs');
st.innerHTML='<button class="sub-tab '+(inspSub==='opening'?'active':'')+'" onclick="inspSub=\'opening\';render()">🏪 เปิดร้าน</button><button class="sub-tab '+(inspSub==='summary'?'active':'')+'" onclick="inspSub=\'summary\';render()">📊 ตรวจสาขา</button><button class="sub-tab '+(inspSub==='detail'?'active':'')+'" onclick="inspSub=\'detail\';render()">📋 รายละเอียด</button><button class="sub-tab '+(inspSub==='log'?'active':'')+'" onclick="inspSub=\'log\';render()">📝 Log</button>';
if(inspSub==='opening')renderStoreOpening(el);
else if(inspSub==='summary')renderInspSummary(el);
else if(inspSub==='detail')renderInspDetail(el);
else renderInspLog(el);
}

// STORE OPENING STATUS
function renderStoreOpening(el){
var bids=curBranch==='all'?visBranches().map(function(b){return b.id;}):[curBranch];
var dates=dRange(selDate,selDateTo);
var rows=STORE_OPENINGS.filter(function(o){return bids.indexOf(o.bid)!==-1&&dates.indexOf(o.date)!==-1;});
var branches=BRANCHES.filter(function(b){return bids.indexOf(b.id)!==-1;});

var opened=rows.filter(function(r){return r.opened;}).length;
var notOpened=rows.filter(function(r){return !r.opened;}).length;
var late=rows.filter(function(r){return r.isLate;}).length;
var onTime=rows.filter(function(r){return r.opened&&!r.isLate;}).length;

var h='<div class="stats-row">';
h+='<div class="stat-card"><div class="stat-num" style="color:var(--primary)">'+opened+'</div><div class="stat-label">🏪 เปิดแล้ว</div></div>';
h+='<div class="stat-card '+(notOpened?'red':'')+'"><div class="stat-num" style="color:'+(notOpened?'var(--danger)':'var(--primary)')+'">'+notOpened+'</div><div class="stat-label">🚫 ยังไม่เปิด</div></div>';
h+='<div class="stat-card '+(late?'orange':'')+'"><div class="stat-num" style="color:'+(late?'var(--accent)':'var(--primary)')+'">'+late+'</div><div class="stat-label">⏰ เปิดสาย</div></div>';
h+='<div class="stat-card"><div class="stat-num" style="color:var(--primary)">'+onTime+'</div><div class="stat-label">✅ เปิดตรงเวลา</div></div>';
h+='</div>';

if(notOpened>0){
  h+='<div class="alert-bar danger"><span>🚨 มี '+notOpened+' สาขา×วัน ที่ยังไม่เปิดร้าน</span></div>';
}

// Daily status table
h+='<div class="tw"><div class="tw-head"><h3>📅 สถานะเปิดร้าน × สาขา</h3><span style="font-size:10px;color:var(--tl)">กำหนดเปิด 09:00</span></div><table><tr><th>วันที่</th>';
branches.forEach(function(b){h+='<th style="text-align:center">'+b.code+'</th>';});
h+='</tr>';
dates.forEach(function(d){
  h+='<tr><td style="font-weight:600">'+thD(d)+'</td>';
  branches.forEach(function(b){
    var o=rows.find(function(r){return r.bid===b.id&&r.date===d;});
    if(!o||!o.opened){
      h+='<td style="text-align:center"><span class="badge rejected">🚫 ไม่เปิด</span></td>';
    }else if(o.isLate){
      h+='<td style="text-align:center"><span class="badge pending">⏰ '+o.time+' (+'+o.lateMin+'น.)</span></td>';
    }else{
      h+='<td style="text-align:center"><span class="badge approved">✅ '+o.time+'</span></td>';
    }
  });
  h+='</tr>';
});
h+='</table></div>';

// Branch cards
h+='<div class="insp-grid">';
branches.forEach(function(b){
  var bRows=rows.filter(function(r){return r.bid===b.id;});
  var bOpened=bRows.filter(function(r){return r.opened;}).length;
  var bLate=bRows.filter(function(r){return r.isLate;}).length;
  var bOnTime=bRows.filter(function(r){return r.opened&&!r.isLate;}).length;
  var pct=bRows.length?Math.round(bOnTime/bRows.length*100):0;
  h+='<div class="insp-card '+(bLate>0?'issues':'')+'">';
  h+='<div class="insp-card-head"><div><span style="font-weight:700;font-size:13px">'+b.code+'</span> <span style="font-size:11px;color:var(--tl)">'+b.name+'</span></div><div style="font-weight:700;font-size:15px;color:'+(pct===100?'var(--primary)':'var(--accent)')+'">'+pct+'%</div></div>';
  h+='<div class="insp-card-body">';
  h+='<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>เปิด '+bOpened+'/'+bRows.length+'</span><span>ตรงเวลา '+bOnTime+'</span><span style="color:'+(bLate?'var(--accent)':'var(--tl)')+'">สาย '+bLate+'</span></div>';
  h+='<div style="background:#E0E0E0;border-radius:4px;height:6px;overflow:hidden"><div style="background:'+(pct===100?'var(--primary)':'var(--accent)')+';height:100%;width:'+pct+'%;border-radius:4px"></div></div>';
  h+='</div></div>';
});
h+='</div>';

h+='<div class="info-box" style="margin-top:12px">💡 พนักงานส่ง "เปิดร้าน" ผ่าน LIFF แยกตัว — แค่ถ่ายรูปหน้าร้าน 1-2 รูป ส่งเข้ากลุ่ม LINE ทันที<br>การตรวจความเรียบร้อย (เงินทอน/ไฟ/กล้อง/สินค้า) จะทำแยกภายหลังได้</div>';

el.innerHTML=h;
}

function renderInspSummary(el){
var bids=curBranch==='all'?visBranches().map(function(b){return b.id;}):[curBranch];
var dates=dRange(selDate,selDateTo);
var rows=INSPECTIONS.filter(function(i){return bids.indexOf(i.bid)!==-1&&dates.indexOf(i.date)!==-1;});
var pass=rows.filter(function(r){return r.status==='pass';}).length;
var issues=rows.filter(function(r){return r.status==='issues';}).length;
var reviewed=rows.filter(function(r){return r.reviewedBy;}).length;
var total=rows.length;
var branches=BRANCHES.filter(function(b){return bids.indexOf(b.id)!==-1;});

var missing=0;
dates.forEach(function(d){branches.forEach(function(b){if(!rows.find(function(r){return r.bid===b.id&&r.date===d;}))missing++;});});

var h='<div class="stats-row">';
h+='<div class="stat-card"><div class="stat-num" style="color:var(--primary)">'+pass+'</div><div class="stat-label">✅ ผ่านทั้งหมด</div></div>';
h+='<div class="stat-card '+(issues?'red':'')+'"><div class="stat-num" style="color:'+(issues?'var(--danger)':'var(--primary)')+'">'+issues+'</div><div class="stat-label">⚠️ มีปัญหา</div></div>';
h+='<div class="stat-card '+(missing?'orange':'')+'"><div class="stat-num" style="color:'+(missing?'var(--accent)':'var(--primary)')+'">'+missing+'</div><div class="stat-label">📭 ยังไม่ส่ง</div></div>';
h+='<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">'+reviewed+'/'+total+'</div><div class="stat-label">👁 ตรวจแล้ว</div></div>';
h+='</div>';

h+='<div class="tw"><div class="tw-head"><h3>📅 สถานะตรวจสาขา × วัน</h3></div><table><tr><th>วันที่</th>';
branches.forEach(function(b){h+='<th style="text-align:center">'+b.code+'</th>';});
h+='</tr>';
dates.forEach(function(d){
  h+='<tr><td style="font-weight:600">'+thD(d)+'</td>';
  branches.forEach(function(b){
    var insp=rows.find(function(r){return r.bid===b.id&&r.date===d;});
    if(!insp)h+='<td style="text-align:center"><span class="badge waiting">📭 ไม่ส่ง</span></td>';
    else if(insp.status==='pass')h+='<td style="text-align:center;cursor:pointer" onclick="showInspDetail(\''+insp.id+'\')"><span class="badge approved">✅ ผ่าน</span></td>';
    else h+='<td style="text-align:center;cursor:pointer" onclick="showInspDetail(\''+insp.id+'\')"><span class="badge rejected">⚠️ ปัญหา</span></td>';
  });
  h+='</tr>';
});
h+='</table></div>';

h+='<div class="insp-grid">';
branches.forEach(function(b){
  var bRows=rows.filter(function(r){return r.bid===b.id;});
  var bPass=bRows.filter(function(r){return r.status==='pass';}).length;
  var bIssues=bRows.filter(function(r){return r.status==='issues';}).length;
  var pct=bRows.length?Math.round(bPass/bRows.length*100):0;
  h+='<div class="insp-card '+(bIssues?'issues':'')+'">';
  h+='<div class="insp-card-head"><div><span style="font-weight:700;font-size:13px">'+b.code+'</span> <span style="font-size:11px;color:var(--tl)">'+b.name+'</span></div><div style="font-weight:700;font-size:15px;color:'+(pct===100?'var(--primary)':'var(--danger)')+'">'+pct+'%</div></div>';
  h+='<div class="insp-card-body">';
  h+='<div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>ผ่าน '+bPass+'/'+bRows.length+'</span><span style="color:'+(bIssues?'var(--danger)':'var(--tl)')+'">ปัญหา '+bIssues+'</span></div>';
  h+='<div style="background:#E0E0E0;border-radius:4px;height:6px;overflow:hidden"><div style="background:'+(pct===100?'var(--primary)':'var(--accent)')+';height:100%;width:'+pct+'%;border-radius:4px"></div></div>';
  h+='</div></div>';
});
h+='</div>';
el.innerHTML=h;
}

function renderInspDetail(el){
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const dates=dRange(selDate,selDateTo);
const rows=INSPECTIONS.filter(i=>bids.includes(i.bid)&&dates.includes(i.date));
const checkLabels={storeOpen:'🏪 ร้านเปิด + ไฟ',changeMoney:'💰 เงินทอนในลิ้นชัก',utilities:'💡 ไฟ / กล้อง / เนท',storePhotos:'📸 รูปหน้าร้าน',inventory:'📦 เช็คสินค้า vs ระบบ'};

let h=`<div class="tw"><div class="tw-head"><h3>📋 รายการตรวจร้าน</h3></div><table>
<tr><th>วันที่</th><th>สาขา</th><th>ส่งโดย</th><th>LINE ID</th><th>เวลา</th><th>🏪</th><th>💰</th><th>💡</th><th>📸</th><th>📦</th><th>ผล</th><th>ตรวจสอบ</th><th></th></tr>`;
rows.sort((a,b)=>a.date.localeCompare(b.date)).forEach(insp=>{
  const br=BRANCHES.find(x=>x.id===insp.bid);
  const e=EMPS.find(x=>x.id===insp.submittedBy);
  const checks=['storeOpen','changeMoney','utilities','storePhotos','inventory'];
  const stLabel=insp.status==='pass'?'<span class="badge approved">✅ ผ่าน</span>':'<span class="badge rejected">⚠️ ปัญหา</span>';
  h+=`<tr><td style="font-weight:600">${thD(insp.date)}</td><td style="font-weight:600">${br?.code}</td>`;
  h+=`<td>${e?`<span class="emp-dot" style="background:${e.c};width:16px;height:16px;font-size:7px">${e.name[0]}</span>${e.name}`:'-'}</td>`;
  h+=`<td style="font-size:10px;color:var(--tl)">${insp.lineUserId}</td>`;
  h+=`<td>${insp.submitTime}</td>`;
  checks.forEach(ck=>{
    const item=insp.items[ck];
    h+=`<td style="text-align:center">${item?.pass?'✅':'❌'}</td>`;
  });
  h+=`<td>${stLabel}</td>`;
  h+=`<td>${insp.reviewedBy?'<span class="verified-badge">✅ ตรวจแล้ว</span>':'<button class="action-btn approve" onclick="toast(\'✅ ตรวจแล้ว\')">ตรวจ</button>'}</td>`;
  h+=`<td><button class="action-btn view" onclick="showInspDetail('${insp.id}')">ดู</button></td>`;
  h+=`</tr>`;
});
h+=`</table></div>`;
el.innerHTML=h;
}

function showInspDetail(inspId){
const insp=INSPECTIONS.find(x=>x.id===inspId);if(!insp)return;
const br=BRANCHES.find(x=>x.id===insp.bid);
const e=EMPS.find(x=>x.id===insp.submittedBy);
const checkLabels={storeOpen:'🏪 ร้านเปิด + ไฟ',changeMoney:'💰 เงินทอนในลิ้นชัก',utilities:'💡 ไฟ / กล้อง / เนท',storePhotos:'📸 รูปหน้าร้าน (หลายมุม)',inventory:'📦 เช็คสินค้า vs ระบบ'};

let body=`<div style="padding:10px;background:#FAFAFA;border-radius:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
<div><b>${br?.code}</b> ${br?.name} · ${thD(insp.date)} · ${insp.submitTime}</div>
<div>${insp.status==='pass'?'<span class="badge approved">✅ ผ่าน</span>':'<span class="badge rejected">⚠️ มีปัญหา</span>'}</div>
</div>`;

body+=`<div style="padding:8px;background:#F5F5F5;border-radius:8px;margin-bottom:12px;font-size:11px">
<span style="color:var(--tl)">ส่งโดย:</span> ${e?`<span class="emp-dot" style="background:${e.c};width:16px;height:16px;font-size:7px">${e.name[0]}</span><b>${e.name}</b>`:'—'}
<span style="margin-left:10px;color:var(--tl)">LINE ID:</span> <code style="font-size:10px;background:#E3F2FD;padding:1px 4px;border-radius:3px">${insp.lineUserId}</code>
${insp.reviewedBy?`<span style="margin-left:10px"><span class="verified-badge">✅ ตรวจโดย ${insp.reviewedBy} · ${insp.reviewTime}</span></span>`:''}
</div>`;

Object.entries(insp.items).forEach(([key,item])=>{
  body+=`<div class="check-item">
  <div class="check-icon ${item.pass?'pass':'fail'}">${item.pass?'✓':'✗'}</div>
  <div style="flex:1">
  <div style="font-weight:600;font-size:12px">${checkLabels[key]||key}</div>`;

  if(key==='changeMoney'&&item.amount){
    body+=`<div style="font-size:11px;color:var(--tl)">จำนวน: ฿${item.amount.toLocaleString()}</div>`;
  }
  if(key==='utilities'){
    body+=`<div style="font-size:11px;display:flex;gap:8px;margin-top:2px">
    <span style="color:${item.light?'var(--primary)':'var(--danger)'}">${item.light?'✅':'❌'} ไฟ</span>
    <span style="color:${item.camera?'var(--primary)':'var(--danger)'}">${item.camera?'✅':'❌'} กล้อง</span>
    <span style="color:${item.internet?'var(--primary)':'var(--danger)'}">${item.internet?'✅':'❌'} เนท</span>
    </div>`;
    if(item.note)body+=`<div style="font-size:10px;color:var(--danger);margin-top:2px">💬 ${item.note}</div>`;
  }
  if(key==='inventory'&&item.mismatches&&item.mismatches.length){
    body+=`<div style="margin-top:4px">`;
    item.mismatches.forEach(mm=>{
      body+=`<div class="mismatch-row"><span>📦 ${mm.product}</span><span>หน้าร้าน: <b>${mm.storeQty}</b> | ระบบ: <b>${mm.sysQty}</b> <span style="color:var(--danger);font-weight:700">(ต่าง ${Math.abs(mm.storeQty-mm.sysQty)})</span></span></div>`;
    });
    body+=`</div>`;
  }
  if(item.photos&&item.photos.length){
    body+=`<div class="photo-thumbs">`;
    item.photos.forEach(p=>{body+=`<div class="photo-thumb" title="${p}">📷</div>`;});
    body+=`</div>`;
  }
  body+=`</div></div>`;
});

openModal(`🔍 ตรวจร้าน — ${br?.code} ${thD(insp.date)}`,body,`<button class="btn btn-ghost" onclick="closeModal()">ปิด</button>${!insp.reviewedBy?`<button class="btn btn-primary" onclick="toast('✅ ยืนยันตรวจแล้ว');closeModal()">✅ ยืนยันตรวจ</button>`:''}`);
}

function renderInspLog(el){
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const dates=dRange(selDate,selDateTo);
const logs=AUDIT_LOGS.filter(l=>l.tableName==='inspection'&&dates.some(d=>l.timestamp.startsWith(d))&&(curBranch==='all'||l.branchId===curBranch));
renderLogList(el,logs,'ตรวจร้าน');
}

// ================================
// AUDIT LOG (ระบบ log ทุก function)
// ================================
let logFilter='all';

function renderAuditLog(el){
const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];
const dates=dRange(selDate,selDateTo);
const logs=AUDIT_LOGS.filter(l=>dates.some(d=>l.timestamp.startsWith(d))&&(curBranch==='all'||bids.includes(l.branchId)));
const filtered=logFilter==='all'?logs:logs.filter(l=>l.tableName===logFilter);

const tableLabels={schedule:'ตารางงาน',leave:'การลา',sales:'ยอดขาย',deposit:'ฝากเงิน',employee:'พนักงาน',inspection:'ตรวจร้าน',bank_account:'บัญชี'};
const actionLabels={create:'สร้าง',update:'แก้ไข',approve:'อนุมัติ',reject:'ปฏิเสธ',verify:'ตรวจสอบ',delete:'ลบ'};

// Filter bar
let h=`<div class="log-filter-bar">`;
h+=`<button class="log-filter-btn ${logFilter==='all'?'active':''}" onclick="logFilter='all';render()">ทั้งหมด (${logs.length})</button>`;
const tables=[...new Set(logs.map(l=>l.tableName))];
tables.forEach(t=>{
  const cnt=logs.filter(l=>l.tableName===t).length;
  h+=`<button class="log-filter-btn ${logFilter===t?'active':''}" onclick="logFilter='${t}';render()">${tableLabels[t]||t} (${cnt})</button>`;
});
h+=`</div>`;

// Stats
const creates=filtered.filter(l=>l.action==='create').length;
const updates=filtered.filter(l=>l.action==='update').length;
const approves=filtered.filter(l=>l.action==='approve'||l.action==='verify').length;
h+=`<div class="stats-row">
<div class="stat-card"><div class="stat-num" style="color:var(--primary)">${filtered.length}</div><div class="stat-label">ทั้งหมด</div></div>
<div class="stat-card"><div class="stat-num" style="color:var(--info)">${creates}</div><div class="stat-label">สร้างใหม่</div></div>
<div class="stat-card orange"><div class="stat-num" style="color:var(--accent)">${updates}</div><div class="stat-label">แก้ไข</div></div>
<div class="stat-card purple"><div class="stat-num" style="color:var(--purple)">${approves}</div><div class="stat-label">อนุมัติ/ตรวจ</div></div>
</div>`;

renderLogList(el,filtered,'ระบบ',h);
}

function renderLogList(el,logs,scope,prefix){
const tableLabels={schedule:'ตารางงาน',leave:'การลา',sales:'ยอดขาย',deposit:'ฝากเงิน',employee:'พนักงาน',inspection:'ตรวจร้าน',bank_account:'บัญชี'};
const actionLabels={create:'สร้าง',update:'แก้ไข',approve:'อนุมัติ',reject:'ปฏิเสธ',verify:'ตรวจสอบ',delete:'ลบ'};

let h=prefix||'';
h+=`<div class="tw"><div class="tw-head"><h3>📋 ประวัติการแก้ไข${scope?' — '+scope:''}</h3><span style="font-size:11px;color:var(--tl)">${logs.length} รายการ</span></div>`;

if(!logs.length){
  h+=`<div style="padding:30px;text-align:center;color:var(--tl);font-size:13px">ไม่มี log ในช่วงเวลานี้</div>`;
}else{
  logs.forEach(l=>{
    const e=EMPS.find(x=>x.id===l.userId);
    const br=BRANCHES.find(x=>x.id===l.branchId);
    const ts=l.timestamp.replace('T',' ');
    const dateStr=thD(l.timestamp.split('T')[0]);
    const timeStr=l.timestamp.split('T')[1]||'';
    h+=`<div class="log-entry">
    <div class="log-time">${dateStr}<br>${timeStr}</div>
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span class="log-action ${l.action}">${actionLabels[l.action]||l.action}</span>
        <span class="log-table-tag">${tableLabels[l.tableName]||l.tableName}</span>
        ${br?`<span style="font-size:10px;color:var(--tl)">${br.code}</span>`:''}
        <span class="log-source ${l.source}">${l.source==='liff'?'📱 LIFF':'🖥 Dashboard'}</span>
      </div>
      <div style="margin-top:3px;font-size:11px">
        ${e?`<span class="emp-dot" style="background:${e.c};width:14px;height:14px;font-size:7px">${e.name[0]}</span><span style="font-weight:600">${e.name}</span>`:l.userId==='owner'?'<span style="font-weight:600">👑 Owner</span>':`<span style="color:var(--tl)">${l.userId}</span>`}
        <span style="color:var(--tl);margin-left:4px">แก้ ${l.field}</span>
      </div>
      ${l.oldValue!==null?`<div class="log-change"><span class="old">${l.oldValue}</span> → <span class="new">${l.newValue}</span></div>`:`<div class="log-change">ค่าใหม่: <span class="new">${l.newValue}</span></div>`}
    </div></div>`;
  });
}
h+=`</div>`;
el.innerHTML=h;
}

// ================================
// ALERTS (แจ้งเตือน)
// ================================
function renderAlerts(el){
const st=document.getElementById('subTabs');
st.innerHTML='<button class="sub-tab '+(alertFilter==='all'?'active':'')+'" onclick="alertFilter=\'all\';render()">ทั้งหมด</button><button class="sub-tab '+(alertFilter==='unack'?'active':'')+'" onclick="alertFilter=\'unack\';render()">ยังไม่รับทราบ</button><button class="sub-tab '+(alertFilter==='absent'?'active':'')+'" onclick="alertFilter=\'absent\';render()">ขาดงาน</button><button class="sub-tab '+(alertFilter==='late'?'active':'')+'" onclick="alertFilter=\'late\';render()">มาสาย</button><button class="sub-tab '+(alertFilter==='early'?'active':'')+'" onclick="alertFilter=\'early\';render()">กลับก่อน</button><button class="sub-tab '+(alertFilter==='nocheck'?'active':'')+'" onclick="alertFilter=\'nocheck\';render()">ไม่ Check-out</button>';

const bids=curBranch==='all'?visBranches().map(function(b){return b.id;}):[curBranch];
const dates=dRange(selDate,selDateTo);
let alerts=ATT_ALERTS.filter(function(a){return bids.indexOf(a.branch)!==-1&&dates.indexOf(a.date)!==-1;});

if(alertFilter==='unack')alerts=alerts.filter(function(a){return !a.ack;});
else if(alertFilter!=='all')alerts=alerts.filter(function(a){return a.type===alertFilter;});

const absent=alerts.filter(function(a){return a.type==='absent';}).length;
const late=alerts.filter(function(a){return a.type==='late';}).length;
const early=alerts.filter(function(a){return a.type==='early';}).length;
const nocheck=alerts.filter(function(a){return a.type==='nocheck';}).length;
const unack=alerts.filter(function(a){return !a.ack;}).length;

let h='<div class="stats-row">';
h+='<div class="stat-card red"><div class="stat-num" style="color:var(--danger)">'+absent+'</div><div class="stat-label">ขาดงาน</div></div>';
h+='<div class="stat-card orange"><div class="stat-num" style="color:var(--accent)">'+late+'</div><div class="stat-label">มาสาย >10 นาที</div></div>';
h+='<div class="stat-card"><div class="stat-num" style="color:#FFC107">'+early+'</div><div class="stat-label">กลับก่อน >10 นาที</div></div>';
h+='<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">'+nocheck+'</div><div class="stat-label">ไม่มี Check-out</div></div>';
h+='</div>';

if(unack>0){
h+='<div class="alert-bar danger"><span>🚨 มีแจ้งเตือน '+unack+' รายการ ที่ยังไม่ได้รับทราบ</span><button class="alert-action" onclick="ackAllAlerts()">รับทราบทั้งหมด</button></div>';
}

h+='<div class="alert-panel"><div class="alert-panel-head"><h3>🚨 รายการแจ้งเตือน</h3><span style="font-size:11px;color:var(--tl)">'+alerts.length+' รายการ</span></div>';

if(!alerts.length){
h+='<div style="padding:30px;text-align:center;color:var(--tl);font-size:13px">ไม่มีแจ้งเตือนในช่วงเวลานี้</div>';
}else{
alerts.forEach(function(a){
  var emp=EMPS.find(function(e){return e.id===a.empId;});
  var br=BRANCHES.find(function(b){return b.id===a.branch;});
  var typeLabels={absent:'ขาดงาน',late:'มาสาย',early:'กลับก่อน',nocheck:'ไม่ Check-out'};
  var typeIcons={absent:'🚫',late:'⏰',early:'🏃',nocheck:'❓'};
  h+='<div class="alert-item" style="'+(a.ack?'opacity:.6':'')+'">';
  h+='<div class="alert-icon-wrap '+a.type+'">'+typeIcons[a.type]+'</div>';
  h+='<div class="alert-content">';
  h+='<div class="alert-title">'+a.title+'</div>';
  h+='<div class="alert-detail">'+a.detail+'</div>';
  h+='<div style="margin-top:3px;display:flex;gap:4px;align-items:center">';
  if(emp)h+='<span class="emp-dot" style="background:'+emp.c+';width:14px;height:14px;font-size:7px">'+emp.name[0]+'</span>';
  if(br)h+='<span style="font-size:10px;color:var(--tl)">'+br.code+'</span>';
  h+='<span class="badge '+(a.severity==='critical'?'rejected':'pending')+'" style="font-size:9px">'+typeLabels[a.type]+'</span>';
  if(a.ack)h+='<span style="font-size:9px;color:var(--primary)">✓ รับทราบแล้ว</span>';
  h+='</div></div>';
  h+='<div class="alert-meta"><div class="alert-time">'+thD(a.date)+'<br>'+a.time+'</div>';
  h+='<div class="alert-actions">';
  if(!a.ack)h+='<button class="a-btn ack-btn" onclick="ackAlert(\''+a.id+'\')">✓</button>';
  h+='<button class="a-btn warn-btn" onclick="issueWarningFromAlert(\''+a.id+'\')">📄</button>';
  h+='</div></div>';
  h+='</div>';
});
}
h+='</div>';

// LINE DM info
h+='<div class="info-box" style="margin-top:12px;border-color:#81C784;background:var(--pb);color:var(--primary)">💬 Alert จะส่ง LINE DM หา Owner + Regional Manager อัตโนมัติ เมื่อระบบตรวจพบ (Cron ตรวจทุก 15 นาที)</div>';

el.innerHTML=h;
}

function ackAlert(id){
var a=ATT_ALERTS.find(function(x){return x.id===id;});
if(a){a.ack=true;toast('รับทราบแจ้งเตือนแล้ว');render();}
}
function ackAllAlerts(){
var bids=curBranch==='all'?visBranches().map(function(b){return b.id;}):[curBranch];
ATT_ALERTS.forEach(function(a){if(bids.indexOf(a.branch)!==-1)a.ack=true;});
toast('รับทราบทั้งหมดแล้ว');render();
}
function issueWarningFromAlert(alertId){
curTab='warning';warnSub='create';
var a=ATT_ALERTS.find(function(x){return x.id===alertId;});
if(a)warnSelEmp=a.empId;
buildSidebar();render();
}

// ================================
// WARNING LETTER (หนังสือเตือน)
// ================================
function renderWarning(el){
const st=document.getElementById('subTabs');
st.innerHTML='<button class="sub-tab '+(warnSub==='issued'?'active':'')+'" onclick="warnSub=\'issued\';render()">📄 หนังสือเตือนที่ออก</button><button class="sub-tab '+(warnSub==='templates'?'active':'')+'" onclick="warnSub=\'templates\';render()">📋 เทมเพลต</button><button class="sub-tab '+(warnSub==='create'?'active':'')+'" onclick="warnSub=\'create\';render()">➕ ออกหนังสือเตือนใหม่</button>';

if(warnSub==='issued')renderWarnIssued(el);
else if(warnSub==='templates')renderWarnTemplates(el);
else renderWarnCreate(el);
}

function renderWarnIssued(el){
const bids=curBranch==='all'?visBranches().map(function(b){return b.id;}):[curBranch];
const dates=dRange(selDate,selDateTo);
const letters=WARNING_LETTERS.filter(function(w){return bids.indexOf(w.branch)!==-1&&dates.indexOf(w.date)!==-1;});

const levelLabels={verbal:'ตักเตือนด้วยวาจา',written:'หนังสือเตือน',final:'เลิกจ้าง'};

// Stats
const verbal=letters.filter(function(w){return w.level==='verbal';}).length;
const written=letters.filter(function(w){return w.level==='written';}).length;
const final_c=letters.filter(function(w){return w.level==='final';}).length;
const unsigned=letters.filter(function(w){return !w.signedByEmp;}).length;

let h='<div class="stats-row">';
h+='<div class="stat-card"><div class="stat-num" style="color:var(--primary)">'+letters.length+'</div><div class="stat-label">ทั้งหมด</div></div>';
h+='<div class="stat-card orange"><div class="stat-num" style="color:var(--accent)">'+verbal+'</div><div class="stat-label">ตักเตือนวาจา</div></div>';
h+='<div class="stat-card red"><div class="stat-num" style="color:var(--danger)">'+written+'</div><div class="stat-label">หนังสือเตือน</div></div>';
h+='<div class="stat-card blue"><div class="stat-num" style="color:var(--info)">'+unsigned+'</div><div class="stat-label">รอเซ็น</div></div>';
h+='</div>';

if(!letters.length){
h+='<div class="empty-state"><div class="icon">📄</div><h3>ยังไม่มีหนังสือเตือน</h3></div>';
}else{
h+='<div class="wl-grid">';
letters.forEach(function(w){
  var emp=EMPS.find(function(e){return e.id===w.empId;});
  var br=BRANCHES.find(function(b){return b.id===w.branch;});
  h+='<div class="wl-card '+w.level+'" onclick="showWarningDetail(\''+w.id+'\')">';
  h+='<div class="wl-card-head"><div>';
  if(emp)h+='<span class="emp-dot" style="background:'+emp.c+'">'+emp.name[0]+'</span>';
  h+='<span style="font-size:13px;font-weight:600">'+(emp?emp.name:w.empId)+'</span>';
  h+='</div><span class="wl-level '+w.level+'">'+levelLabels[w.level]+'</span></div>';
  h+='<div class="wl-card-body">';
  h+='<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--tl)">สาเหตุ</span><span>'+w.reason+'</span></div>';
  h+='<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--tl)">วันที่</span><span>'+thD(w.date)+'</span></div>';
  h+='<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--tl)">สาขา</span><span>'+(br?br.code:'')+'</span></div>';
  h+='<div style="display:flex;justify-content:space-between"><span style="color:var(--tl)">สถานะ</span><span>';
  if(w.signedByEmp)h+='<span class="badge approved">เซ็นแล้ว</span>';
  else if(w.status==='issued')h+='<span class="badge pending">รอเซ็น</span>';
  else h+='<span class="badge draft">แบบร่าง</span>';
  h+='</span></div>';
  h+='</div></div>';
});
h+='</div>';
}
el.innerHTML=h;
}

function renderWarnTemplates(el){
let h='<h3 style="font-size:15px;margin-bottom:12px">📋 เทมเพลตหนังสือเตือน</h3>';
h+='<div class="info-box">💡 เทมเพลตสามารถแก้ไขได้ ตัวแปร {ชื่อพนักงาน} {สาขา} {วันที่เกิดเหตุ} {รายละเอียดความผิด} {วันที่ออก} จะถูกแทนที่อัตโนมัติ</div>';

WL_TEMPLATES.forEach(function(t){
  var levelLabels={verbal:'ตักเตือนด้วยวาจา',written:'หนังสือเตือน',final:'เลิกจ้าง'};
  h+='<div class="wl-template-card '+(warnSelTpl===t.id?'selected':'')+'" onclick="warnSelTpl=\''+(warnSelTpl===t.id?'null':t.id)+'\';render()">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
  h+='<span style="font-weight:600;font-size:14px">'+t.name+'</span>';
  h+='<span class="wl-level '+t.level+'">'+levelLabels[t.level]+'</span>';
  h+='</div>';
  h+='<div style="font-size:12px;color:var(--tl);margin-bottom:8px">'+t.desc+'</div>';
  if(warnSelTpl===t.id){
    h+='<div class="wl-preview"><h4>'+t.name+'</h4>';
    h+='<pre style="white-space:pre-wrap;font-family:inherit;font-size:12px">'+t.body+'</pre>';
    h+='<div class="sig"><div class="sig-box">ผู้ออกหนังสือ<br>(นายจ้าง)</div><div class="sig-box">ผู้รับหนังสือ<br>(ลูกจ้าง)</div><div class="sig-box">พยาน</div></div></div>';
  }
  h+='</div>';
});
el.innerHTML=h;
}

function renderWarnCreate(el){
let h='<h3 style="font-size:15px;margin-bottom:12px">➕ ออกหนังสือเตือนใหม่</h3>';

// Step 1: Select employee
h+='<div class="step-card" style="background:var(--card);border-radius:var(--rad);box-shadow:var(--shadow);margin-bottom:14px;overflow:hidden">';
h+='<div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600">1. เลือกพนักงาน</div>';
h+='<div style="padding:12px 16px">';
const emps=visEmps();
emps.forEach(function(e){
  var br=BRANCHES.find(function(b){return b.id===e.branch;});
  var existingWarn=WARNING_LETTERS.filter(function(w){return w.empId===e.id;}).length;
  h+='<div style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;cursor:pointer;margin-bottom:4px;'+(warnSelEmp===e.id?'background:var(--pb);border:1.5px solid var(--pl)':'border:1.5px solid transparent')+'" onclick="warnSelEmp=\''+e.id+'\';render()">';
  h+='<span class="emp-dot" style="background:'+e.c+'">'+e.name[0]+'</span>';
  h+='<span style="font-size:13px;font-weight:500">'+e.name+'</span>';
  h+='<span style="font-size:10px;color:var(--tl)">'+e.code+' | '+(br?br.code:'')+'</span>';
  if(existingWarn>0)h+='<span class="badge pending" style="margin-left:auto;font-size:9px">เตือนแล้ว '+existingWarn+' ครั้ง</span>';
  h+='</div>';
});
h+='</div></div>';

// Step 2: Select template
h+='<div class="step-card" style="background:var(--card);border-radius:var(--rad);box-shadow:var(--shadow);margin-bottom:14px;overflow:hidden;'+(warnSelEmp?'':'opacity:.5;pointer-events:none')+'">';
h+='<div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600">2. เลือกเทมเพลต</div>';
h+='<div style="padding:12px 16px">';
var levelLabels={verbal:'ตักเตือนด้วยวาจา',written:'หนังสือเตือน',final:'เลิกจ้าง'};
WL_TEMPLATES.forEach(function(t){
  h+='<div style="display:flex;align-items:center;gap:8px;padding:10px;border-radius:8px;cursor:pointer;margin-bottom:4px;'+(warnSelTpl===t.id?'background:var(--pb);border:1.5px solid var(--pl)':'border:1.5px solid var(--border)')+'" onclick="warnSelTpl=\''+t.id+'\';render()">';
  h+='<span class="wl-level '+t.level+'">'+levelLabels[t.level]+'</span>';
  h+='<div><div style="font-size:13px;font-weight:500">'+t.name+'</div><div style="font-size:10px;color:var(--tl)">'+t.desc+'</div></div>';
  h+='</div>';
});
h+='</div></div>';

// Step 3: Preview
if(warnSelEmp&&warnSelTpl){
  var emp=EMPS.find(function(e){return e.id===warnSelEmp;});
  var br=BRANCHES.find(function(b){return b.id===(emp?emp.branch:'');});
  var tpl=WL_TEMPLATES.find(function(t){return t.id===warnSelTpl;});
  if(emp&&tpl){
    var body=tpl.body.replace(/\{ชื่อพนักงาน\}/g,emp.name+' ('+emp.code+')')
      .replace(/\{สาขา\}/g,(br?br.name:''))
      .replace(/\{วันที่ออก\}/g,'22 พ.ค. 2569')
      .replace(/\{วันที่เกิดเหตุ\}/g,'______')
      .replace(/\{รายละเอียดความผิด\}/g,'______');

    h+='<div class="step-card" style="background:var(--card);border-radius:var(--rad);box-shadow:var(--shadow);margin-bottom:14px;overflow:hidden">';
    h+='<div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600">3. ตัวอย่างหนังสือ</div>';
    h+='<div style="padding:16px">';
    h+='<div class="wl-preview"><h4>'+tpl.name+'</h4>';
    h+='<pre style="white-space:pre-wrap;font-family:inherit;font-size:12px">'+body+'</pre>';
    h+='<div class="sig"><div class="sig-box">ผู้ออกหนังสือ<br>(นายจ้าง)</div><div class="sig-box">ผู้รับหนังสือ<br>('+emp.name+')</div><div class="sig-box">พยาน</div></div></div>';

    h+='<div style="display:flex;gap:8px;margin-top:14px">';
    h+='<button class="btn btn-primary" onclick="createWarningLetter()" style="flex:1">📄 ออกหนังสือเตือน</button>';
    h+='<button class="btn btn-ghost" onclick="toast(\'ยังไม่ได้เชื่อมต่อ Export PDF\')" style="flex:0.5">📥 PDF</button>';
    h+='<button class="btn btn-ghost" onclick="toast(\'ยังไม่ได้เชื่อมต่อ LIFF\')" style="flex:0.5">📱 LIFF</button>';
    h+='</div>';

    h+='</div></div>';
  }
}

el.innerHTML=h;
}

async function createWarningLetter(){
if(!warnSelEmp||!warnSelTpl)return;
var tpl=WL_TEMPLATES.find(function(t){return t.id===warnSelTpl;});
var emp=EMPS.find(function(e){return e.id===warnSelEmp;});
if(!tpl||!emp)return;
try{
const payload={employeeId:warnSelEmp,templateId:warnSelTpl,level:tpl.level,issueDate:selDate||fmtD(new Date()),reason:'(กรอกภายหลัง)',branchId:emp.branch,issuedBy:user?user.username:'owner',status:'draft'};
const res=await fetch(`${API_URL}/warning-letters`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
const result=await res.json().catch(()=>({}));
if(!res.ok)throw new Error(result.message||'Create warning letter failed');
var w=result.data;
WARNING_LETTERS.push({id:String(w.id),empId:w.employee_id,templateId:w.template_id,level:w.level,date:w.issue_date,reason:w.reason,alertId:null,branch:w.branch_id,issuedBy:w.issued_by,status:w.status||'draft',signedByEmp:Boolean(w.is_signed_by_emp),signDate:(w.signed_at||'').split('T')[0]||null});
toast('ออกหนังสือเตือนสำเร็จ — '+emp.name);
warnSub='issued';warnSelEmp=null;warnSelTpl=null;render();
}catch(err){
console.error(err);
toast(err.message||'ออกหนังสือเตือนไม่สำเร็จ');
}
}

function showWarningDetail(wlId){
var w=WARNING_LETTERS.find(function(x){return x.id===wlId;});
if(!w)return;
var emp=EMPS.find(function(e){return e.id===w.empId;});
var br=BRANCHES.find(function(b){return b.id===w.branch;});
var tpl=WL_TEMPLATES.find(function(t){return t.id===w.templateId;});
var levelLabels={verbal:'ตักเตือนด้วยวาจา',written:'หนังสือเตือน',final:'เลิกจ้าง'};

var body='';
if(tpl){
  body=tpl.body.replace(/\{ชื่อพนักงาน\}/g,(emp?emp.name+' ('+emp.code+')':''))
    .replace(/\{สาขา\}/g,(br?br.name:''))
    .replace(/\{วันที่ออก\}/g,thD(w.date))
    .replace(/\{วันที่เกิดเหตุ\}/g,thD(w.date))
    .replace(/\{รายละเอียดความผิด\}/g,w.reason);
}

var h='<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">';
h+='<div>';
if(emp)h+='<span class="emp-dot" style="background:'+emp.c+'">'+emp.name[0]+'</span>';
h+='<span style="font-weight:600">'+(emp?emp.name:'')+'</span> <span style="color:var(--tl);font-size:11px">'+(emp?emp.code:'')+'</span>';
h+='</div>';
h+='<span class="wl-level '+w.level+'">'+levelLabels[w.level]+'</span>';
h+='</div>';

h+='<div style="font-size:12px;margin-bottom:10px">';
h+='<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:var(--tl)">สาเหตุ</span><span>'+w.reason+'</span></div>';
h+='<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:var(--tl)">สาขา</span><span>'+(br?br.code:'')+'</span></div>';
h+='<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:var(--tl)">ออกโดย</span><span>'+w.issuedBy+'</span></div>';
h+='<div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:var(--tl)">เซ็น</span><span>'+(w.signedByEmp?'✅ เซ็นแล้ว '+thD(w.signDate):'❌ ยังไม่เซ็น')+'</span></div>';
h+='</div>';

if(body){
  h+='<div class="wl-preview"><h4>'+(tpl?tpl.name:'')+'</h4>';
  h+='<pre style="white-space:pre-wrap;font-family:inherit;font-size:12px">'+body+'</pre>';
  h+='<div class="sig"><div class="sig-box">ผู้ออกหนังสือ<br>(นายจ้าง)</div><div class="sig-box">ผู้รับหนังสือ<br>('+(emp?emp.name:'')+')</div><div class="sig-box">พยาน</div></div></div>';
}

var foot='<button class="btn btn-ghost" onclick="toast(\'ยังไม่ได้เชื่อมต่อ Export PDF\')">📥 PDF</button>';
foot+='<button class="btn btn-ghost" onclick="toast(\'ยังไม่ได้เชื่อมต่อ LIFF\')">📱 ส่งให้เซ็น</button>';
foot+='<button class="btn btn-primary" onclick="closeModal()">ปิด</button>';
openModal('📄 หนังสือเตือน — '+(emp?emp.name:''),h,foot);
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
LINE_GROUPS.forEach(g=>{const brNames=g.branches.map(bid=>BRANCHES.find(x=>x.id===bid)?.code).join(', ');
const members=g.members.map(eid=>EMPS.find(x=>x.id===eid)?.name).join(', ');
h+=`<div class="g-card"><div class="g-card-head">💬 ${g.name}</div><div class="g-card-body">
<div class="g-row"><span style="color:var(--tl)">🏢 สาขา</span><span>${brNames}</span></div>
<div class="g-row"><span style="color:var(--tl)">👥 สมาชิก</span><span>${members||'ผู้จัดการ'}</span></div>
</div></div>`;});
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
function openModal(t,b,f){document.getElementById('mTitle').textContent=t;document.getElementById('mBody').innerHTML=b;document.getElementById('mFoot').innerHTML=f||'';document.getElementById('overlay').classList.add('open');}
function closeModal(){document.getElementById('overlay').classList.remove('open');}

