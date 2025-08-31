/**
 * ملف expensesTypes.js - نظام إدارة أنواع المصروفات
 * يدير قائمة أنواع المصروفات المحفوظة في localStorage
 * يوفر واجهة لإضافة، تعديل، وحذف أنواع المصروفات
 * يستخدم في نموذج إضافة المصروف لتوفير خيارات سريعة
 * 
 * المشاكل المحتملة:
 * - لا يوجد تحقق من تكرار الأنواع عند التعديل
 * - عدم معالجة الأخطاء بشكل صحيح (catch فارغ)
 * - واجهة المستخدم بسيطة جداً
 * - لا يوجد تأكيد قبل حذف نوع
 * - التعديلات تتم مباشرة دون زر حفظ
 */

// Expense Types Manager: CRUD with localStorage persistence
(function(){
  function loadSavedExpenseTypes(){ try { return JSON.parse(localStorage.getItem('expenseTypes')||'[]'); } catch { return []; } }
  function saveExpenseTypes(types){ localStorage.setItem('expenseTypes', JSON.stringify(Array.from(new Set(types)))); }

  function renderTypes(){
    const tbody = document.getElementById('expenseTypesTable'); if (!tbody) return;
    const types = loadSavedExpenseTypes();
    tbody.innerHTML = '';
    types.forEach((t, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input type="text" class="form-control form-control-sm etype-input" data-idx="${idx}" value="${t}"></td>
                      <td class="text-end">
                        <button class="btn btn-sm btn-danger etype-del" data-idx="${idx}"><i class="fas fa-trash"></i></button>
                      </td>`;
      tbody.appendChild(tr);
    });
    // wire inputs for rename
    tbody.querySelectorAll('.etype-input').forEach(inp => {
      inp.addEventListener('change', ()=>{
        const i = Number(inp.getAttribute('data-idx'));
        const val = (inp.value||'').trim();
        const types = loadSavedExpenseTypes();
        if (!val) { renderTypes(); return; }
        types[i] = val; saveExpenseTypes(types); renderTypes();
      });
    });
    // wire delete
    tbody.querySelectorAll('.etype-del').forEach(btn => {
      btn.addEventListener('click', ()=>{
        const i = Number(btn.getAttribute('data-idx'));
        const types = loadSavedExpenseTypes();
        types.splice(i,1); saveExpenseTypes(types); renderTypes();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    const manageBtn = document.getElementById('manageExpenseTypesBtn');
    const addBtn = document.getElementById('addExpenseTypeBtn');
    const newInp = document.getElementById('newExpenseTypeInput');

    if (manageBtn) manageBtn.addEventListener('click', ()=>{
      const modal = new bootstrap.Modal(document.getElementById('expenseTypesModal'));
      renderTypes(); modal.show();
    });

    if (addBtn) addBtn.addEventListener('click', ()=>{
      const val = (newInp.value||'').trim(); if (!val) return;
      const types = loadSavedExpenseTypes(); if (!types.includes(val)) types.push(val);
      saveExpenseTypes(types); newInp.value=''; renderTypes();
    });
  });
})();