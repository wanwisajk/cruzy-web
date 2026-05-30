const API_URL = '/api';

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
const res=await fetch(`${API_URL}/console/data`);
if(!res.ok)throw new Error('Failed to fetch admin console data');
const data=await res.json();
hydrateConsoleData(data);
return true;
}catch(err){
console.error('Load DB data failed:',err);
toast('ดึงข้อมูล DB ไม่สำเร็จ');
return false;
}
}

function hydrateConsoleData(data){
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

const applyConsoleData = hydrateConsoleData;

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
