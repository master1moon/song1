/**
 * ملف reports-detailed.js - أرشيف كود التقارير المفصلة
 * يحفظ التنفيذ السابق لمنطق التقارير المفصلة
 * تم نقل هذا الكود من reports.js لتقليل حجم الملف
 * يشمل: حالة التقارير، التحكم بحجم الصفحة، البحث والترتيب
 * 
 * المشاكل المحتملة:
 * - هذا ملف أرشيف وليس مستخدماً حالياً
 * - الكود معلق بالكامل ولا يتم تنفيذه
 * - قد يحتوي على أخطاء لم يتم اكتشافها
 * - يحتاج لتحديث إذا تم إعادة تفعيله
 * - بعض الدوال مكررة في ملفات أخرى
 */

// Archived detailed reports logic (payments, expenses, sales, debts)
// This file preserves the previous implementation so it can be restored later.
// Include: reportState, wirePageSizeControl, applyReportSearchSortPaginate,
// wireReportControls, renderDetailedReport, renderAllDetailedReports,
// exportDetailedReport, lazy rendering helpers, throttle, observers, etc.

/*
[BEGIN ARCHIVE]

// State for detailed reports
const reportState = {
  payments: { search: '', sortKey: 'date', sortDir: 'desc', page: 1, pageSize: 10 },
  expenses: { search: '', sortKey: 'date', sortDir: 'desc', page: 1, pageSize: 10 },
  sales: { search: '', sortKey: 'date', sortDir: 'desc', page: 1, pageSize: 10 },
  debts: { search: '', sortKey: 'remaining', sortDir: 'desc', page: 1, pageSize: 10 }
};

function wirePageSizeControl(entity){
  const sel = document.getElementById(`${entity}ReportPageSize`);
  if (sel && !sel.dataset._wired) {
    sel.addEventListener('change', ()=>{ const v = parseInt(sel.value,10)||10; reportState[entity].pageSize = v; reportState[entity].page = 1; renderDetailedReport(entity); });
    sel.dataset._wired = '1';
  }
}

function applyReportSearchSortPaginate(entity, rows) {
  const st = reportState[entity];
  const q = (st.search || '').toLowerCase();
  let arr = rows;
  if (q) arr = arr.filter(r => Object.values(r).some(v => String(v||'').toLowerCase().includes(q)));
  arr.sort((a,b)=>{ const key = st.sortKey; const dir = st.sortDir==='asc'?1:-1; const va=a[key]; const vb=b[key]; if (typeof va==='number' && typeof vb==='number') return (va-vb)*dir; return String(va||'').localeCompare(String(vb||''))*dir; });
  const total = arr.length; const pages = Math.max(1, Math.ceil(total / st.pageSize)); if (st.page > pages) st.page = pages;
  const start = (st.page - 1) * st.pageSize; const end = start + st.pageSize;
  return { pageItems: arr.slice(start, end), total, pages };
}

function wireReportControls(entity, total, pages) {
  const paginationEl = document.getElementById(`${entity}ReportPagination`);
  const paginationTopEl = document.getElementById(`${entity}ReportPaginationTop`);
  [paginationEl, paginationTopEl].forEach(pgEl => { if (pgEl) { pgEl.innerHTML = ''; for (let i=1; i<=pages; i++) { const btn = document.createElement('button'); btn.className = `btn btn-sm ${i===reportState[entity].page?'btn-primary':'btn-outline-primary'}`; btn.textContent = i; btn.onclick = ()=>{ reportState[entity].page = i; renderDetailedReport(entity); }; pgEl.appendChild(btn); } } });
  wirePageSizeControl(entity);
  const searchEl = document.getElementById(`${entity}ReportSearch`);
  if (searchEl && !searchEl.dataset._wired) { const onSearch = throttle(()=>{ reportState[entity].search = searchEl.value; reportState[entity].page = 1; renderDetailedReport(entity); }, 200); searchEl.addEventListener('input', onSearch); searchEl.dataset._wired = '1'; }
  document.querySelectorAll(`th[role="button"][data-entity="${entity}"]`).forEach(th => { if (th.dataset._wired) return; th.dataset._wired = '1'; th.addEventListener('click', ()=>{ const key = th.getAttribute('data-sort'); if (reportState[entity].sortKey === key) reportState[entity].sortDir = (reportState[entity].sortDir==='asc'?'desc':'asc'); else { reportState[entity].sortKey = key; reportState[entity].sortDir = 'asc'; } renderDetailedReport(entity); }); });
}

function renderDetailedReport(entity) { /* implementation moved from reports.js */ }
function renderAllDetailedReports(){ renderDetailedReport('payments'); renderDetailedReport('expenses'); renderDetailedReport('sales'); renderDetailedReport('debts'); }

function exportDetailedReport(entity, format){ /* implementation moved from reports.js */ }

const renderedEntities = new Set();
function renderReportsAccordingToSelection(){ /* moved */ }
function setupReportsLazyObserver(){ /* moved */ }
function throttle(fn, delay){ let tid=null, last=0; return function(){ const now=Date.now(); const args=arguments; const ctx=this; const run=()=>{ last=Date.now(); tid=null; fn.apply(ctx,args); }; if (!last || (now-last)>=delay){ run(); } else { clearTimeout(tid); tid=setTimeout(run, delay-(now-last)); } }; }

[END ARCHIVE]
*/