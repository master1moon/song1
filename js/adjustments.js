/**
 * إدارة عمليات تعديل الرصيد (خصم/إضافة)
 * 
 * الوظائف الرئيسية:
 * - إضافة خصومات أو تعديلات على أرصدة المحلات
 * - تتبع سبب كل تعديل
 * - عرض معاينة للتأثير على الرصيد
 * - حفظ التعديلات كنوع خاص من العمليات
 * 
 * التحديات المحتملة:
 * - التعامل مع التعديلات في التقارير
 * - ضمان عدم التأثير على حسابات الأرباح
 * - التمييز بين التعديلات والعمليات العادية
 */

/**
 * عرض نموذج تعديل الرصيد
 * @param {string} storeId - معرف المحل
 */
function showAdjustmentModal(storeId) {
  if (!storeId) {
    showNotification('معرف المحل غير صحيح', 'error');
    return;
  }
  
  const store = data.stores.find(s => s.id === storeId);
  if (!store) {
    showNotification('المحل غير موجود', 'error');
    return;
  }
  
  // تنظيف النموذج
  document.getElementById('adjustmentId').value = '';
  document.getElementById('adjustmentStoreId').value = storeId;
  document.getElementById('adjustmentAmount').value = '';
  document.getElementById('adjustmentReason').value = '';
  document.getElementById('adjustmentDate').value = getTodayDate();
  document.getElementById('typeDiscount').checked = true;
  
  // تحديث معاينة الرصيد
  updateAdjustmentPreview(storeId);
  
  // إظهار النموذج
  const modal = new bootstrap.Modal(document.getElementById('adjustmentModal'));
  modal.show();
}

/**
 * تحديث معاينة تأثير التعديل على الرصيد
 * @param {string} storeId - معرف المحل
 */
function updateAdjustmentPreview(storeId) {
  if (!storeId || !data) return;
  
  const store = data.stores.find(s => s.id === storeId);
  if (!store) return;
  
  // حساب الرصيد الحالي
  const sales = data.sales.filter(s => s.storeId === storeId);
  const payments = data.payments.filter(p => p.storeId === storeId);
  const adjustments = data.adjustments ? data.adjustments.filter(a => a.storeId === storeId) : [];
  
  const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalPayments = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const totalAdjustments = adjustments.reduce((sum, adj) => {
    return sum + (adj.type === 'discount' ? adj.amount : -adj.amount);
  }, 0);
  
  const currentBalance = totalSales - totalPayments - totalAdjustments;
  
  // جلب قيم النموذج
  const amount = parseFloat(document.getElementById('adjustmentAmount').value.replace(/,/g, '')) || 0;
  const isDiscount = document.getElementById('typeDiscount').checked;
  
  // حساب الرصيد الجديد
  let newBalance;
  if (isDiscount) {
    newBalance = currentBalance - amount; // الخصم يقلل المديونية
  } else {
    newBalance = currentBalance + amount; // الإضافة تزيد المديونية
  }
  
  // تحديث المعاينة
  document.getElementById('previewCurrentBalance').textContent = formatNumber(Math.abs(currentBalance));
  document.getElementById('previewCurrentStatus').textContent = currentBalance >= 0 ? '(دائن)' : '(مدين)';
  document.getElementById('previewCurrentStatus').className = currentBalance >= 0 ? 'text-success' : 'text-danger';
  
  document.getElementById('previewOperationType').textContent = isDiscount ? 'خصم' : 'إضافة';
  document.getElementById('previewOperationAmount').textContent = (isDiscount ? '-' : '+') + formatNumber(amount);
  document.getElementById('previewOperationAmount').className = isDiscount ? 'text-success' : 'text-danger';
  
  document.getElementById('previewNewBalance').textContent = formatNumber(Math.abs(newBalance));
  document.getElementById('previewNewStatus').textContent = newBalance >= 0 ? '(دائن)' : '(مدين)';
  document.getElementById('previewNewStatus').className = newBalance >= 0 ? 'text-success' : 'text-danger';
  
  // إظهار المعاينة
  document.getElementById('adjustmentPreview').style.display = amount > 0 ? 'block' : 'none';
}

/**
 * حفظ تعديل الرصيد
 */
function saveAdjustment() {
  const storeId = document.getElementById('adjustmentStoreId').value;
  const amount = parseFloat(document.getElementById('adjustmentAmount').value.replace(/,/g, '')) || 0;
  const reason = document.getElementById('adjustmentReason').value.trim();
  const date = document.getElementById('adjustmentDate').value || getTodayDate();
  const type = document.getElementById('typeDiscount').checked ? 'discount' : 'addition';
  
  // التحقق من صحة البيانات
  if (!storeId) {
    showNotification('معرف المحل غير صحيح', 'error');
    return;
  }
  
  if (amount <= 0) {
    showNotification('يرجى إدخال مبلغ صحيح', 'error');
    return;
  }
  
  if (!reason) {
    showNotification('يرجى إدخال سبب التعديل', 'error');
    return;
  }
  
  // إنشاء مصفوفة التعديلات إذا لم تكن موجودة
  if (!data.adjustments) {
    data.adjustments = [];
  }
  
  // إضافة التعديل الجديد
  const newAdjustment = {
    id: 'adj_' + Date.now(),
    storeId: storeId,
    type: type,
    amount: amount,
    reason: reason,
    date: formatDateEn(date),
    createdAt: new Date().toISOString()
  };
  
  data.adjustments.push(newAdjustment);
  
  // حفظ البيانات
  saveData();
  
  // تحديث العرض
  if (typeof refreshCurrentView === 'function') {
    refreshCurrentView();
  }
  
  // إظهار رسالة نجاح
  const typeText = type === 'discount' ? 'خصم' : 'إضافة';
  showNotification(`تم ${typeText} ${formatNumber(amount)} ريال بنجاح`, 'success');
  
  // إغلاق النموذج
  const modal = bootstrap.Modal.getInstance(document.getElementById('adjustmentModal'));
  modal.hide();
  
  // تحديث تفاصيل المحل
  if (typeof showStoreDetails === 'function') {
    showStoreDetails(storeId);
  }
}

/**
 * حذف تعديل رصيد
 * @param {string} adjustmentId - معرف التعديل
 */
function deleteAdjustment(adjustmentId) {
  if (!confirm('هل أنت متأكد من حذف هذا التعديل؟')) return;
  
  if (!data.adjustments) return;
  
  const adjustment = data.adjustments.find(a => a.id === adjustmentId);
  if (!adjustment) return;
  
  // حذف التعديل
  data.adjustments = data.adjustments.filter(a => a.id !== adjustmentId);
  
  // نقل إلى سلة المحذوفات
  if (typeof addToTrash === 'function') {
    addToTrash('adjustments', adjustment);
  }
  
  // حفظ البيانات
  saveData();
  
  // تحديث العرض
  if (typeof refreshCurrentView === 'function') {
    refreshCurrentView();
  }
  
  // تحديث تفاصيل المحل
  if (adjustment.storeId && typeof showStoreDetails === 'function') {
    showStoreDetails(adjustment.storeId);
  }
  
  showNotification('تم حذف التعديل بنجاح', 'success');
}

// تصدير الدوال للاستخدام العام
window.showAdjustmentModal = showAdjustmentModal;
window.updateAdjustmentPreview = updateAdjustmentPreview;
window.saveAdjustment = saveAdjustment;
window.deleteAdjustment = deleteAdjustment;