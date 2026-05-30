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

async function ackAlert(id){
var a=ATT_ALERTS.find(function(x){return x.id===id;});
if(!a)return;
try{
const res=await fetch(`${API_URL}/attendance-alerts/${id}/ack`,{method:'PATCH'});
const result=await res.json().catch(()=>({}));
if(!res.ok)throw new Error(result.message||'รับทราบแจ้งเตือนไม่สำเร็จ');
a.ack=true;toast('รับทราบแจ้งเตือนแล้ว');render();
}catch(err){toast(err.message||'รับทราบแจ้งเตือนไม่สำเร็จ');}
}
async function ackAllAlerts(){
var bids=curBranch==='all'?visBranches().map(function(b){return b.id;}):[curBranch];
try{
await Promise.all(ATT_ALERTS.filter(function(a){return bids.indexOf(a.branch)!==-1&&!a.ack;}).map(function(a){return fetch(`${API_URL}/attendance-alerts/${a.id}/ack`,{method:'PATCH'});}));
ATT_ALERTS.forEach(function(a){if(bids.indexOf(a.branch)!==-1)a.ack=true;});
toast('รับทราบทั้งหมดแล้ว');render();
}catch(err){toast('รับทราบทั้งหมดไม่สำเร็จ');}
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
