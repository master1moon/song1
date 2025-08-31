/**
 * ملف payments.js - نظام إدارة التسديدات/المدفوعات
 * يتعامل مع إضافة، تعديل، وحذف المدفوعات من المحلات
 * يتكامل مع نظام المحلات لحساب الأرصدة
 * يحدث جميع التقارير المالية عند كل عملية
 * 
 * المشاكل المحتملة:
 * - متغير today غير معرف
 * - دالة cleanupModalBackdrops غير موجودة
 * - لا يتحقق من أن المبلغ لا يتجاوز المديونية
 * - لا يسجل طريقة الدفع (نقدي، تحويل، شيك، إلخ)
 * - لا يوجد إيصالات أو أرقام مرجعية للمدفوعات
 */

// إدارة التسديدات

/**
 * فتح نموذج إضافة تسديد جديد
 * يعيد تعيين جميع حقول النموذج إلى قيمها الافتراضية
 * يضبط التاريخ على اليوم الحالي
 * مشكلة: متغير today قد لا يكون معرفاً
 * @param {string} storeId - معرف المحل الذي سيتم إضافة التسديد له
 */
function addPayment(storeId) {
  document.getElementById('paymentModalTitle').textContent = 'إضافة تسديد';
  document.getElementById('paymentId').value = '';
  document.getElementById('paymentStoreId').value = storeId;
  document.getElementById('paymentAmount').value = '';
  document.getElementById('paymentNotes').value = '';
  document.getElementById('paymentDate').value = getTodayDate();
  const modal = new bootstrap.Modal(document.getElementById('paymentModal')); modal.show();
}

/**
 * حفظ بيانات التسديد (إضافة جديد أو تحديث موجود)
 * يتحقق من صحة البيانات المدخلة (المبلغ يجب أن يكون موجباً)
 * يحدث تفاصيل المحل وجميع التقارير ذات الصلة
 * يعرض إشعار بنجاح العملية
 */
function savePayment() {
  const id = document.getElementById('paymentId').value;
  const storeId = document.getElementById('paymentStoreId').value;
  const amount = parseFormattedNumber(document.getElementById('paymentAmount').value);
  const notes = document.getElementById('paymentNotes').value;
  const date = document.getElementById('paymentDate').value ? formatDateEn(document.getElementById('paymentDate').value) : getTodayDate();
  if (!storeId || isNaN(amount) || amount <= 0) { showNotification('يرجى ملء جميع الحقول المطلوبة', 'error'); return; }
  if (id) {
    const payment = data.payments.find(p => p.id === id);
    if (payment) { payment.amount = amount; payment.notes = notes; payment.date = date; }
    showNotification('تم تحديث التسديد بنجاح', 'success');
  } else {
    const newId = 'payment_' + Date.now();
    data.payments.push({ id: newId, storeId, amount, notes, date });
    showNotification('تم إضافة التسديد بنجاح', 'success');
  }
  saveData();
  refreshCurrentView(); // تحديث جميع العروض المرئية
  showStoreDetails(storeId); // تحديث تفاصيل المحل
  updateProfitReport(); // خاص بتقرير الأرباح
  generateDebtReport(); // خاص بتقرير الديون
  if (typeof generatePartnerReports === 'function') generatePartnerReports();
  const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal')); 
  modal.hide();
  if (typeof cleanupModalBackdrops === 'function') setTimeout(cleanupModalBackdrops, 300);
}

/**
 * فتح نموذج تعديل تسديد موجود
 * يملأ النموذج بالبيانات الحالية للتسديد
 * ينسق المبلغ بالفواصل للعرض
 * @param {string} id - معرف التسديد المراد تعديله
 */
function editPayment(id) {
  const payment = data.payments.find(p => p.id === id); if (!payment) return;
  document.getElementById('paymentModalTitle').textContent = 'تعديل التسديد';
  document.getElementById('paymentId').value = payment.id;
  document.getElementById('paymentStoreId').value = payment.storeId;
  document.getElementById('paymentAmount').value = formatNumber(payment.amount);
  document.getElementById('paymentNotes').value = payment.notes || '';
  document.getElementById('paymentDate').value = payment.date;
  const modal = new bootstrap.Modal(document.getElementById('paymentModal')); modal.show();
}

/**
 * حذف تسديد من السجلات
 * يطلب تأكيد من المستخدم قبل الحذف
 * ينقل التسديد المحذوف إلى سلة المحذوفات
 * يحدث تفاصيل المحل وجميع التقارير ذات الصلة
 * @param {string} id - معرف التسديد المراد حذفه
 */
function deletePayment(id) {
  const payment = data.payments.find(p => p.id === id); if (!payment) return;
  if (!confirm('هل أنت متأكد من حذف هذا التسديد؟')) return;
  data.payments = data.payments.filter(p => p.id !== id);
  saveData();
  (async()=>{ try{ if (typeof addToTrash==='function') await addToTrash('payments', payment); }catch{}; refreshCurrentView(); showStoreDetails(payment.storeId); updateProfitReport(); generateDebtReport(); })();
  showNotification('تم حذف التسديد بنجاح', 'success');
}

// تصدير الدوال للنطاق العام
if (typeof window !== 'undefined') {
  window.addPayment = addPayment;
  window.savePayment = savePayment;
  window.editPayment = editPayment;
  window.deletePayment = deletePayment;
}