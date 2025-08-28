/**
 * ملف expenses.js - نظام إدارة المصروفات
 * يتعامل مع إضافة، تعديل، حذف، وعرض المصروفات
 * يدعم البحث، الترتيب، التقسيم إلى صفحات، والعمليات الجماعية
 * 
 * المشاكل المحتملة:
 * - التواريخ قد لا تُحفظ بشكل صحيح (يستخدم متغير today غير معرّف)
 * - دالة cleanupModalBackdrops غير موجودة لكن يتم استدعاؤها
 * - معالجة الأخطاء في العمليات الجماعية ضعيفة
 * - لا يوجد تحقق من صحة المبالغ المدخلة
 * - حذف المصروفات لا يمكن التراجع عنه بسهولة
 */

// إدارة المصروفات

/**
 * فتح نموذج إضافة مصروف جديد
 * يعيد تعيين جميع حقول النموذج إلى قيمها الافتراضية
 * يضبط التاريخ على اليوم الحالي
 * مشكلة: متغير today قد لا يكون معرفاً
 */
function addExpense() {
  document.getElementById('expenseModalTitle').textContent = 'إضافة مصروف جديد';
  document.getElementById('expenseId').value = '';
  document.getElementById('expenseType').value = '';
  const chipsWrap = document.getElementById('expenseTypeChips'); if (chipsWrap) chipsWrap.innerHTML = '';
  const customInp = document.getElementById('expenseTypeCustom'); if (customInp) customInp.value = '';
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseNotes').value = '';
  document.getElementById('expenseDate').value = formatDateEn(getTodayDate());
  document.getElementById('addLater').checked = false;
  const modal = new bootstrap.Modal(document.getElementById('expenseModal')); modal.show();
}

/**
 * فتح نموذج تعديل مصروف موجود
 * يملأ النموذج بالبيانات الحالية للمصروف
 * @param {string} id - معرف المصروف المراد تعديله
 */
function editExpense(id) {
  const expense = data.expenses.find(e => e.id === id); if (!expense) return;
  document.getElementById('expenseModalTitle').textContent = 'تعديل المصروف';
  document.getElementById('expenseId').value = expense.id;
  document.getElementById('expenseType').value = expense.type;
  const customInp = document.getElementById('expenseTypeCustom'); if (customInp) customInp.value = '';
  document.getElementById('expenseAmount').value = formatNumber(expense.amount);
  document.getElementById('expenseNotes').value = expense.notes || '';
  document.getElementById('expenseDate').value = formatDateEn(expense.date || getTodayDate());
  document.getElementById('addLater').checked = expense.addLater || false;
  const modal = new bootstrap.Modal(document.getElementById('expenseModal')); modal.show();
}

/**
 * حذف مصروف من السجلات
 * يطلب تأكيد من المستخدم قبل الحذف
 * ينقل المصروف المحذوف إلى سلة المحذوفات
 * يحدث جميع الجداول والتقارير المتعلقة
 * @param {string} id - معرف المصروف المراد حذفه
 */
function deleteExpense(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
  const removed = data.expenses.find(e => e.id === id);
  data.expenses = data.expenses.filter(e => e.id !== id);
  saveData();
  (async()=>{ try{ if (removed && typeof addToTrash==='function') await addToTrash('expenses', removed); }catch{}; refreshCurrentView(); updateProfitReport(); })();
  showNotification('تم حذف المصروف بنجاح', 'success');
}

/**
 * حفظ بيانات المصروف (إضافة جديد أو تحديث موجود)
 * يتحقق من صحة البيانات المدخلة
 * يحفظ نوع المصروف في قائمة الأنواع المحفوظة
 * يحدث جميع الجداول والتقارير ذات الصلة
 */
function saveExpense() {
  const id = document.getElementById('expenseId').value;
  const type = document.getElementById('expenseType').value;
  const amount = parseFormattedNumber(document.getElementById('expenseAmount').value) || 0;
  const notes = document.getElementById('expenseNotes').value;
  const date = document.getElementById('expenseDate').value ? formatDateEn(document.getElementById('expenseDate').value) : getTodayDate();
  const addLater = document.getElementById('addLater').checked;
  if (!type) { showNotification('يرجى إدخال نوع المصروف', 'error'); return; }
  if (id) {
    const expense = data.expenses.find(e => e.id === id);
    if (expense) { expense.type = type; expense.amount = amount; expense.notes = notes; expense.date = date; expense.addLater = addLater; }
    showNotification('تم تحديث المصروف بنجاح', 'success');
  } else {
    const newId = 'exp_' + Date.now();
    data.expenses.push({ id: newId, type, amount, notes, date, addLater });
    showNotification('تم إضافة المصروف بنجاح', 'success');
  }
  try {
    const saved = JSON.parse(localStorage.getItem('expenseTypes') || '[]');
    if (type && !saved.includes(type)) { saved.push(type); localStorage.setItem('expenseTypes', JSON.stringify(saved)); }
  } catch (_) {}
  saveData();
  refreshCurrentView(); // تحديث جميع العروض المرئية
  updateProfitReport(); // خاص بتقرير الأرباح
  if (typeof generatePartnerReports === 'function') generatePartnerReports();
  const modal = bootstrap.Modal.getInstance(document.getElementById('expenseModal')); 
  modal.hide();
  if (typeof cleanupModalBackdrops === 'function') setTimeout(cleanupModalBackdrops, 300);
}

/**
 * حالة جدول المصروفات
 * يحتفظ بحالة البحث، الترتيب، ورقم الصفحة الحالية
 */
const expensesState = {
  search: '',
  sortKey: 'date',
  sortDir: 'desc', // 'asc' | 'desc'
  page: 1,
  pageSize: 10,
};
/**
 * مجموعة المصروفات المحددة للعمليات الجماعية
 */
const expensesSelection = new Set();

/**
 * تطبيق البحث والترتيب والتقسيم إلى صفحات
 * يفلتر العناصر بناءً على البحث
 * يرتب العناصر حسب المفتاح والاتجاه المحدد
 * يقسم النتائج إلى صفحات
 * @param {Array} items - قائمة العناصر للمعالجة
 * @returns {Object} كائن يحتوي على عناصر الصفحة، الإجمالي، وعدد الصفحات
 */
function applySearchSortPaginate(items){
  const q = (expensesState.search || '').toLowerCase();
  let arr = items.filter(e => {
    if (!q) return true;
    const hay = [e.type||'', e.notes||'', e.date||'', String(e.amount||'')].join(' ').toLowerCase();
    return hay.includes(q);
  });
  const { sortKey, sortDir } = expensesState;
  arr.sort((a,b)=>{
    const A = a[sortKey]; const B = b[sortKey];
    if (sortKey === 'amount') { return (Number(A||0) - Number(B||0)) * (sortDir==='asc'?1:-1); }
    return String(A||'').localeCompare(String(B||'')) * (sortDir==='asc'?1:-1);
  });
  const total = arr.length; const pages = Math.max(1, Math.ceil(total / expensesState.pageSize));
  if (expensesState.page > pages) expensesState.page = pages;
  const start = (expensesState.page - 1) * expensesState.pageSize;
  const pageItems = arr.slice(start, start + expensesState.pageSize);
  return { pageItems, total, pages };
}

/**
 * عرض عناصر التحكم في جدول المصروفات
 * يعرض معلومات الصفحة وأزرار التنقل
 * يعرض عدد العناصر المحددة وأزرار العمليات الجماعية
 * @param {number} total - إجمالي عدد العناصر
 * @param {number} pages - عدد الصفحات
 */
function renderExpensesControls(total, pages){
  let footer = document.getElementById('expensesFooter');
  if (!footer) {
    const container = document.querySelector('#expenses .section-content');
    footer = document.createElement('div');
    footer.id = 'expensesFooter';
    footer.className = 'd-flex flex-wrap align-items-center justify-content-between mt-2 gap-2';
    container && container.appendChild(footer);
  }
  footer.innerHTML = '';
  const left = document.createElement('div'); left.className='d-flex align-items-center gap-2';
  const right = document.createElement('div'); right.className='d-flex align-items-center gap-2';
  // search box
  const search = document.createElement('input'); search.type='search'; search.placeholder='بحث في المصروفات'; search.className='form-control'; search.style.maxWidth='260px'; search.value = expensesState.search;
  search.addEventListener('input', ()=>{ expensesState.search = search.value.trim(); expensesState.page=1; renderExpensesTable(); });
  left.appendChild(search);
  // bulk actions
  const bulkSel = document.createElement('select'); bulkSel.className='form-select'; bulkSel.style.maxWidth='220px';
  bulkSel.innerHTML = `
    <option value="">إجراء جماعي...</option>
    <option value="delete">حذف</option>
    <option value="mark_paid">تعيين كمدفوع</option>
    <option value="mark_later">تعيين كلاحقًا</option>
    <option value="change_type">تغيير النوع</option>`;
  const bulkTypeInp = document.createElement('input'); bulkTypeInp.type='text'; bulkTypeInp.placeholder='نوع جديد'; bulkTypeInp.className='form-control'; bulkTypeInp.style.maxWidth='180px'; bulkTypeInp.style.display='none';
  bulkSel.addEventListener('change', ()=>{ bulkTypeInp.style.display = bulkSel.value==='change_type' ? 'block' : 'none'; });
  const bulkBtn = document.createElement('button'); bulkBtn.className='btn btn-outline-danger'; bulkBtn.textContent='تطبيق';
  function applyBulk(){
    if (expensesSelection.size === 0) { showNotification('لم يتم تحديد سجلات', 'error'); return; }
    const ids = Array.from(expensesSelection);
    const act = bulkSel.value;
    if (!act) { showNotification('اختر إجراءً جماعيًا', 'error'); return; }
    if (act === 'delete') {
      if (!confirm('حذف السجلات المحددة؟')) return;
      data.expenses = data.expenses.filter(e => !expensesSelection.has(e.id));
      expensesSelection.clear();
    } else if (act === 'mark_paid' || act === 'mark_later') {
      const v = (act === 'mark_later');
      data.expenses.forEach(e => { if (expensesSelection.has(e.id)) e.addLater = v; });
    } else if (act === 'change_type') {
      const newType = (bulkTypeInp.value || '').trim();
      if (!newType) { showNotification('اكتب النوع الجديد', 'error'); return; }
      data.expenses.forEach(e => { if (expensesSelection.has(e.id)) e.type = newType; });
      try {
        const saved = JSON.parse(localStorage.getItem('expenseTypes') || '[]');
        if (newType && !saved.includes(newType)) { saved.push(newType); localStorage.setItem('expenseTypes', JSON.stringify(saved)); }
      } catch(_){}
    }
    saveData(); refreshCurrentView(); updateProfitReport(); showNotification('تم تطبيق الإجراء الجماعي', 'success');
  }
  bulkBtn.addEventListener('click', applyBulk);
  left.appendChild(bulkSel); left.appendChild(bulkTypeInp); left.appendChild(bulkBtn);
  // pager
  const pager = document.createElement('div'); pager.className='d-flex align-items-center gap-2';
  const info = document.createElement('span'); info.className='text-muted'; info.textContent = `إجمالي: ${total} | صفحة ${expensesState.page}/${pages}`;
  const prev = document.createElement('button'); prev.className='btn btn-sm btn-outline-secondary'; prev.textContent='السابق'; prev.disabled = expensesState.page<=1; prev.onclick=()=>{ expensesState.page--; renderExpensesTable(); };
  const next = document.createElement('button'); next.className='btn btn-sm btn-outline-secondary'; next.textContent='التالي'; next.disabled = expensesState.page>=pages; next.onclick=()=>{ expensesState.page++; renderExpensesTable(); };
  pager.appendChild(prev); pager.appendChild(next); pager.appendChild(info);
  right.appendChild(pager);
  footer.appendChild(left); footer.appendChild(right);
}

function startInlineEditExpense(tr, expense){
  tr.innerHTML = '';
  const tdSelect = document.createElement('td');
  tdSelect.innerHTML = `<input type="checkbox" class="exp-row-select" data-id="${expense.id}">`;
  const tdDate = document.createElement('td'); const dateInp = document.createElement('input'); dateInp.type='date'; dateInp.className='form-control form-control-sm'; dateInp.value = formatDateEn(expense.date); tdDate.appendChild(dateInp);
  const tdType = document.createElement('td'); const typeInp = document.createElement('input'); typeInp.type='text'; typeInp.className='form-control form-control-sm'; typeInp.value = expense.type; tdType.appendChild(typeInp);
  const tdAmount = document.createElement('td'); const amountInp = document.createElement('input'); amountInp.type='text'; amountInp.className='form-control form-control-sm formatted-input'; amountInp.value = formatNumber(expense.amount); tdAmount.appendChild(amountInp);
  const tdNotes = document.createElement('td'); const notesInp = document.createElement('input'); notesInp.type='text'; notesInp.className='form-control form-control-sm'; notesInp.value = expense.notes || ''; tdNotes.appendChild(notesInp);
  const tdStatus = document.createElement('td'); const statusInp = document.createElement('input'); statusInp.type='checkbox'; statusInp.className='form-check-input'; statusInp.checked = !!expense.addLater; tdStatus.appendChild(statusInp);
  const tdActions = document.createElement('td');
  const saveBtn = document.createElement('button'); saveBtn.className='btn btn-sm btn-primary me-1'; saveBtn.innerHTML='<i class="fas fa-check"></i>';
  const cancelBtn = document.createElement('button'); cancelBtn.className='btn btn-sm btn-secondary'; cancelBtn.innerHTML='<i class="fas fa-times"></i>';
  tdActions.appendChild(saveBtn); tdActions.appendChild(cancelBtn);
  tr.appendChild(tdSelect); tr.appendChild(tdDate); tr.appendChild(tdType); tr.appendChild(tdAmount); tr.appendChild(tdNotes); tr.appendChild(tdStatus); tr.appendChild(tdActions);
  // formatting
  if (typeof setupFormattedInputs === 'function') setupFormattedInputs();
  saveBtn.addEventListener('click', ()=>{
    const newDate = formatDateEn(dateInp.value || expense.date);
    const newType = (typeInp.value||'').trim(); if (!newType){ showNotification('نوع المصروف مطلوب', 'error'); return; }
    const newAmount = parseFormattedNumber(amountInp.value)||0;
    const newNotes = notesInp.value||'';
    const newAddLater = !!statusInp.checked;
    const target = data.expenses.find(e => e.id === expense.id);
    if (target){ target.date=newDate; target.type=newType; target.amount=newAmount; target.notes=newNotes; target.addLater=newAddLater; }
    saveData(); renderExpensesTable(); updateDashboard(); updateProfitReport(); showNotification('تم الحفظ', 'success');
  });
  cancelBtn.addEventListener('click', ()=>{ renderExpensesTable(); });
}

function getFilteredExpensesForExport(){
  const periodSel = document.getElementById('expensesPeriod');
  const period = periodSel ? periodSel.value : 'from_start';
  let from = '0000-01-01'; let to = moment().format('YYYY-MM-DD');
  if (period === 'day') from = moment().startOf('day').format('YYYY-MM-DD');
  else if (period === 'week') from = moment().startOf('week').format('YYYY-MM-DD');
  else if (period === 'month') from = moment().subtract(1, 'month').add(1, 'day').format('YYYY-MM-DD');
  else if (period === 'this_month') from = moment().startOf('month').format('YYYY-MM-DD');
  else if (period === 'custom') {
    const fromInp = document.getElementById('expensesFrom'); const toInp = document.getElementById('expensesTo');
    if (fromInp && fromInp.value) from = fromInp.value; if (toInp && toInp.value) to = toInp.value;
  }
  let filtered = (data.expenses||[]).filter(exp => { const d = (exp.date || '').slice(0, 10); return d >= from && d <= to; });
  // apply search term if exists
  const q = (expensesState.search || '').toLowerCase();
  if (q) {
    filtered = filtered.filter(e => ([e.type||'', e.notes||'', e.date||'', String(e.amount||'')].join(' ').toLowerCase().includes(q)));
  }
  return filtered;
}
// expose for other modules
window.__getFilteredExpensesForExport = getFilteredExpensesForExport;

// تصدير الدوال للنطاق العام
if (typeof window !== 'undefined') {
  window.addExpense = addExpense;
  window.saveExpense = saveExpense;
  window.editExpense = editExpense;
  window.deleteExpense = deleteExpense;
}

function renderExpensesTable() {
  try {
    const table = document.getElementById('expensesTable'); if (!table) return;
    const periodSel = document.getElementById('expensesPeriod');
    const period = periodSel ? periodSel.value : 'from_start';
    let from = '0000-01-01'; let to = moment().format('YYYY-MM-DD');
    if (period === 'day') from = moment().startOf('day').format('YYYY-MM-DD');
    else if (period === 'week') from = moment().startOf('week').format('YYYY-MM-DD');
    else if (period === 'month') from = moment().subtract(1, 'month').add(1, 'day').format('YYYY-MM-DD');
    else if (period === 'this_month') from = moment().startOf('month').format('YYYY-MM-DD');
    else if (period === 'prev_month') { from = moment().subtract(1,'month').startOf('month').format('YYYY-MM-DD'); to = moment().subtract(1,'month').endOf('month').format('YYYY-MM-DD'); }
    else if (period === 'custom') {
      const fromInp = document.getElementById('expensesFrom'); const toInp = document.getElementById('expensesTo');
      if (fromInp && fromInp.value) from = fromInp.value; if (toInp && toInp.value) to = toInp.value;
    }
    let filtered = data.expenses.filter(exp => { const d = (exp.date || '').slice(0, 10); return d >= from && d <= to; });
    const { pageItems, total, pages } = applySearchSortPaginate(filtered);
    const totalExpenses = filtered.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const totalExpensesEl = document.getElementById('totalExpenses'); if (totalExpensesEl) totalExpensesEl.textContent = formatNumber(totalExpenses);
    const titleSpan = document.getElementById('currentMonth');
    if (titleSpan) {
      let label = '';
      if (period === 'from_start') label = `من البداية إلى ${to}`;
      else if (period === 'day') label = `اليوم (${to})`;
      else if (period === 'week') label = `خلال أسبوع حتى ${to}`;
      else if (period === 'month') label = `آخر 30 يوم حتى ${to}`;
      else if (period === 'this_month') label = `هذا الشهر (${moment().format('YYYY-MM')})`;
      else if (period === 'prev_month') label = `الشهر السابق (${moment().subtract(1,'month').format('YYYY-MM')})`;
      else if (period === 'custom') label = `${from||''} إلى ${to||''}`;
      setTextSafe(titleSpan, label);
    }
    const tableRoot = table.closest('table'); if (!tableRoot) { table.innerHTML = ''; return; }
    const oldThead = tableRoot.querySelector('thead'); if (oldThead) oldThead.remove();
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
      <th><input type="checkbox" id="expensesSelectAll"></th>
      <th role="button" data-sort="date">التاريخ ${expensesState.sortKey==='date' ? (expensesState.sortDir==='asc'?'▲':'▼') : ''}</th>
      <th role="button" data-sort="type">نوع المصروف ${expensesState.sortKey==='type' ? (expensesState.sortDir==='asc'?'▲':'▼') : ''}</th>
      <th role="button" data-sort="amount">المبلغ ${expensesState.sortKey==='amount' ? (expensesState.sortDir==='asc'?'▲':'▼') : ''}</th>
      <th>ملاحظات</th>
      <th>الحالة</th>
      <th>الإجراءات</th>
    </tr>`;
    tableRoot.insertBefore(thead, table);
    table.innerHTML = '';
    pageItems.forEach(expense => {
      const row = document.createElement('tr'); row.dataset.id = expense.id;
      const selected = expensesSelection.has(expense.id);
      row.innerHTML = `
        <td><input type="checkbox" class="exp-row-select" data-id="${expense.id}" ${selected?'checked':''}></td>
        <td class="cell-edit" data-key="date">${expense.date}</td>
        <td class="cell-edit" data-key="type">${expense.type}</td>
        <td class="cell-edit" data-key="amount"><span class="currency">${formatNumber(expense.amount)}</span></td>
        <td class="cell-edit" data-key="notes">${expense.notes || ''}</td>
        <td class="cell-edit" data-key="addLater">${expense.addLater ? '<span class="badge bg-warning">لاحقًا</span>' : '<span class="badge bg-success">مدفوع</span>'}</td>
        <td class="action-buttons">
          <button class="btn btn-sm btn-warning edit-expense" data-id="${expense.id}"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger delete-expense" data-id="${expense.id}"><i class="fas fa-trash"></i></button>
        </td>`;
      row.querySelectorAll('.cell-edit').forEach(cell => { cell.addEventListener('dblclick', ()=> startInlineEditExpense(row, expense)); });
      table.appendChild(row);
    });
    const selAll = document.getElementById('expensesSelectAll');
    if (selAll) selAll.addEventListener('change', ()=>{
      table.querySelectorAll('.exp-row-select').forEach(cb => { cb.checked = selAll.checked; const id = cb.getAttribute('data-id'); if (selAll.checked) expensesSelection.add(id); else expensesSelection.delete(id); });
    });
    table.querySelectorAll('.exp-row-select').forEach(cb => { cb.addEventListener('change', ()=>{ const id = cb.getAttribute('data-id'); if (cb.checked) expensesSelection.add(id); else expensesSelection.delete(id); }); });
    thead.querySelectorAll('th[role="button"]').forEach(th => {
      th.onclick = ()=>{
        const key = th.getAttribute('data-sort');
        if (expensesState.sortKey === key) { expensesState.sortDir = (expensesState.sortDir==='asc'?'desc':'asc'); }
        else { expensesState.sortKey = key; expensesState.sortDir = 'asc'; }
        renderExpensesTable();
      };
    });
    table.querySelectorAll('.edit-expense').forEach(btn => { btn.addEventListener('click', () => editExpense(btn.dataset.id)); });
    table.querySelectorAll('.delete-expense').forEach(btn => { btn.addEventListener('click', () => deleteExpense(btn.dataset.id)); });
    renderExpensesControls(total, pages);
  } catch(_) { /* avoid breaking entire app on error */ }
}

// إدارة chips لأنواع المصروفات
(function () {
  const defaultExpenseTypes = ['كهرباء', 'انترنت ADSL', 'انترنت فايبر', 'انترنت ستار لينك', 'صيانة', 'سويتش', 'كيبل كهرباء', 'كيبل انترنت رئيسي', 'كيبل انترنت منزلي', 'مواصلات', 'عامل', 'ايجار سطوح'];
  function loadSavedExpenseTypes() { try { return JSON.parse(localStorage.getItem('expenseTypes') || '[]'); } catch { return []; } }
  function saveExpenseTypes(types) { localStorage.setItem('expenseTypes', JSON.stringify(Array.from(new Set(types)))); }
  function getAllExpenseTypes() { return Array.from(new Set([...(loadSavedExpenseTypes()), ...defaultExpenseTypes])); }
  function renderExpenseTypeChips(selected) {
    const wrap = document.getElementById('expenseTypeChips'); if (!wrap) return; wrap.innerHTML = '';
    getAllExpenseTypes().forEach(t => {
      const chip = document.createElement('span'); chip.className = 'expense-type-chip' + (selected === t ? ' active' : ''); chip.textContent = t;
      chip.addEventListener('click', () => { document.querySelectorAll('#expenseTypeChips .expense-type-chip').forEach(c => c.classList.remove('active')); chip.classList.add('active'); const hidden = document.getElementById('expenseType'); if (hidden) hidden.value = t; });
      wrap.appendChild(chip);
    });
  }
  function selectExpenseType(value) { const hidden = document.getElementById('expenseType'); if (hidden) hidden.value = value || ''; renderExpenseTypeChips(value || ''); }
  const addCustomBtn = document.getElementById('addCustomExpenseType');
  if (addCustomBtn) addCustomBtn.addEventListener('click', () => { const inp = document.getElementById('expenseTypeCustom'); const val = (inp?.value || '').trim(); if (!val) return; const types = getAllExpenseTypes(); if (!types.includes(val)) saveExpenseTypes([...(loadSavedExpenseTypes()), val]); selectExpenseType(val); if (inp) inp.value = ''; });
  const expenseModalEl = document.getElementById('expenseModal'); if (expenseModalEl) expenseModalEl.addEventListener('show.bs.modal', () => { const currentVal = document.getElementById('expenseType')?.value || ''; renderExpenseTypeChips(currentVal); });
})();