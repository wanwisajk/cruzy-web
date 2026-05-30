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
