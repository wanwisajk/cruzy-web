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

async function confirmSale(saleId){
const s=SALES.find(x=>x.id===saleId);if(!s)return;
try{
const res=await fetch(`${API_URL}/sales/${saleId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'confirmed',confirmedBy:s.submittedBy})});
const result=await res.json().catch(()=>({}));
if(!res.ok)throw new Error(result.message||'ยืนยันยอดขายไม่สำเร็จ');
s.status='confirmed';s.confirmedBy=s.submittedBy;s.confirmTime='ตอนนี้';
toast('✅ ยืนยันยอดขาย ฿'+nf(s.total));render();
}catch(err){toast(err.message||'ยืนยันยอดขายไม่สำเร็จ');}
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

async function toggleBankAcc(idx){
const acc=BANK_ACCOUNTS[idx];
if(!acc)return;
const next=!acc.active;
try{
const res=await fetch(`${API_URL}/bank-accounts/${acc.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({isActive:next})});
const result=await res.json().catch(()=>({}));
if(!res.ok)throw new Error(result.message||'อัปเดตบัญชีไม่สำเร็จ');
acc.active=next;
toast(acc.active?'✅ เปิดใช้งานบัญชี':'🔒 ปิดใช้งานบัญชี');
render();
}catch(err){toast(err.message||'อัปเดตบัญชีไม่สำเร็จ');}
}

function addBankAccount(){
const body=`
<div style="font-size:12px">
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">ธนาคาร</label><select id="bankNameInput" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px"><option value="กสิกรไทย|KBANK|#138F2D">กสิกรไทย (KBANK)</option><option value="กรุงเทพ|BBL|#1E5AA8">กรุงเทพ (BBL)</option><option value="ไทยพาณิชย์|SCB|#4B2383">ไทยพาณิชย์ (SCB)</option><option value="กรุงไทย|KTB|#13A8E0">กรุงไทย (KTB)</option><option value="กรุงศรี|BAY|#F4C542">กรุงศรี (BAY)</option><option value="ทหารไทยธนชาต|TTB|#F36F21">ทหารไทยธนชาต (TTB)</option></select></div>
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">เลขบัญชี</label><input id="bankAccNoInput" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px" placeholder="xxx-x-xxxxx-x"></div>
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">ชื่อบัญชี</label><input id="bankAccNameInput" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px" value="บจก. ครูซี่"></div>
<div style="margin-bottom:10px"><label style="font-size:11px;color:var(--tl);display:block;margin-bottom:3px">ประเภท</label><select id="bankAccTypeInput" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:13px"><option>ออมทรัพย์</option><option>กระแสรายวัน</option></select></div>
</div>`;
openModal('➕ เพิ่มบัญชีธนาคาร',body,`<button class="btn btn-ghost" onclick="closeModal()">ยกเลิก</button><button class="btn btn-primary" onclick="saveBankAccount()">บันทึก</button>`);
}

async function saveBankAccount(){
const bankParts=document.getElementById('bankNameInput').value.split('|');
const accountNo=document.getElementById('bankAccNoInput').value.trim();
const accountName=document.getElementById('bankAccNameInput').value.trim();
const accountType=document.getElementById('bankAccTypeInput').value;
if(!accountNo||!accountName){toast('กรุณากรอกเลขบัญชีและชื่อบัญชี');return;}
try{
const res=await fetch(`${API_URL}/bank-accounts`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
bankName:bankParts[0],bankShort:bankParts[1],colorCode:bankParts[2],accountNo,accountName,accountType,isActive:true
})});
const result=await res.json().catch(()=>({}));
if(!res.ok)throw new Error(result.message||'เพิ่มบัญชีไม่สำเร็จ');
const b=result.data;
BANK_ACCOUNTS.push({id:b.id,bank:b.bank_name,bankShort:b.bank_short,color:b.color_code||bankParts[2],accNo:b.account_no,accName:b.account_name,type:b.account_type||accountType,active:b.is_active!==false});
toast('✅ เพิ่มบัญชีสำเร็จ');
closeModal();
render();
}catch(err){toast(err.message||'เพิ่มบัญชีไม่สำเร็จ');}
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
