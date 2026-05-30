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
localStorage.setItem('cruzyAdminSession',JSON.stringify({user,timestamp:Date.now()}));
const loaded=await loadConsoleData();
if(!loaded)throw new Error('Load DB failed');
showAppShell();
}catch(err){
console.error(err);
errEl.textContent=err.message||'Username หรือ Password ไม่ถูกต้อง';
errEl.style.display='block';
}
}
function logout(){user=null;localStorage.removeItem('cruzyAdminSession');document.body.classList.remove('auth-pending');document.getElementById('loginOverlay').classList.remove('hidden');document.getElementById('mainNav').style.display='none';document.getElementById('app').style.display='none';}

function showAppShell(){
document.body.classList.remove('auth-pending');
document.getElementById('loginOverlay').classList.add('hidden');
document.getElementById('mainNav').style.display='flex';
document.getElementById('app').style.display='flex';
document.getElementById('navRole').textContent=user.label||user.role;
document.getElementById('navUser').textContent=`${user.label||user.role} ${user.name}`;
buildSidebar();
render();
}

async function bootFromStoredSession(){
const raw=localStorage.getItem('cruzyAdminSession');
if(!raw){document.body.classList.remove('auth-pending');return;}
try{
const session=JSON.parse(raw);
if(!session.user)throw new Error('missing user');
user=session.user;
const loaded=await loadConsoleData();
if(!loaded)throw new Error('Load DB failed');
showAppShell();
}catch(err){
console.error('Stored session invalid:',err);
localStorage.removeItem('cruzyAdminSession');
document.body.classList.remove('auth-pending');
}
}

document.addEventListener('DOMContentLoaded',bootFromStoredSession);

function visBranches(){if(!user)return[];if(user.scope==='all')return BRANCHES;if(REGIONS[user.scope])return BRANCHES.filter(b=>b.region===user.scope);return BRANCHES.filter(b=>b.id===user.scope);}
function visEmps(){const bids=curBranch==='all'?visBranches().map(b=>b.id):[curBranch];return EMPS.filter(e=>bids.includes(e.branch)||(EMP_BRANCHES[e.id]||[]).some(bid=>bids.includes(bid)));}
function branchEmps(bid){return EMPS.filter(e=>e.branch===bid||(EMP_BRANCHES[e.id]||[]).includes(bid));}

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

