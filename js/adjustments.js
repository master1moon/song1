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
    if (typeof showNotification === 'function') {
      showNotification('معرف المحل غير صحيح', 'error');
    } else {
      alert('معرف المحل غير صحيح');
    }
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
  document.getElementById('adjustmentDate').value = typeof getTodayDate === 'function' ? getTodayDate() : new Date().toISOString().split('T')[0];
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
  const amountValue = parseFloat(document.getElementById('adjustmentAmount').value.replace(/,/g, '')) || 0;
  const isDiscount = document.getElementById('typeDiscount').checked;
  const calcType = document.getElementById('adjustmentCalcType').value;
  
  // حساب المبلغ الفعلي
  let actualAmount = amountValue;
  if (calcType === 'percentage' && amountValue > 0) {
    actualAmount = Math.abs(currentBalance) * (amountValue / 100);
  }
  
  // حساب الرصيد الجديد
  let newBalance;
  if (isDiscount) {
    newBalance = currentBalance - actualAmount; // الخصم يقلل المديونية
  } else {
    newBalance = currentBalance + actualAmount; // الإضافة تزيد المديونية
  }
  
  // تحديث المعاينة
  document.getElementById('previewCurrentBalance').textContent = typeof formatNumber === 'function' ? formatNumber(Math.abs(currentBalance)) : Math.abs(currentBalance).toFixed(2);
  document.getElementById('previewCurrentStatus').textContent = currentBalance >= 0 ? '(دائن)' : '(مدين)';
  document.getElementById('previewCurrentStatus').className = currentBalance >= 0 ? 'text-success' : 'text-danger';
  
  document.getElementById('previewOperationType').textContent = isDiscount ? 'خصم' : 'إضافة';
  let operationText = (isDiscount ? '-' : '+') + (typeof formatNumber === 'function' ? formatNumber(actualAmount) : actualAmount.toFixed(2));
  if (calcType === 'percentage') {
    operationText += ` (${amountValue}%)`;
  }
  document.getElementById('previewOperationAmount').textContent = operationText;
  document.getElementById('previewOperationAmount').className = isDiscount ? 'text-success' : 'text-danger';
  
  document.getElementById('previewNewBalance').textContent = typeof formatNumber === 'function' ? formatNumber(Math.abs(newBalance)) : Math.abs(newBalance).toFixed(2);
  document.getElementById('previewNewStatus').textContent = newBalance >= 0 ? '(دائن)' : '(مدين)';
  document.getElementById('previewNewStatus').className = newBalance >= 0 ? 'text-success' : 'text-danger';
  
  // إظهار المعاينة
  document.getElementById('adjustmentPreview').style.display = amountValue > 0 ? 'block' : 'none';
}

/**
 * حفظ تعديل الرصيد
 */
function saveAdjustment() {
  try {
    console.log('بداية دالة saveAdjustment');
    
    const storeId = document.getElementById('adjustmentStoreId').value;
    const amountValue = parseFloat(document.getElementById('adjustmentAmount').value.replace(/,/g, '')) || 0;
    const reason = document.getElementById('adjustmentReason').value.trim();
    const date = document.getElementById('adjustmentDate').value || (typeof getTodayDate === 'function' ? getTodayDate() : new Date().toISOString().split('T')[0]);
    const type = document.getElementById('typeDiscount').checked ? 'discount' : 'addition';
    const calcType = document.getElementById('adjustmentCalcType').value; // fixed أو percentage
    
    console.log('البيانات المدخلة:', { storeId, amountValue, reason, date, type, calcType });
  
  // التحقق من صحة البيانات
  if (!storeId) {
    if (typeof showNotification === 'function') {
      showNotification('معرف المحل غير صحيح', 'error');
    } else {
      alert('معرف المحل غير صحيح');
    }
    return;
  }
  
  if (amountValue <= 0) {
    if (typeof showNotification === 'function') {
      showNotification('يرجى إدخال قيمة صحيحة', 'error');
    } else {
      alert('يرجى إدخال قيمة صحيحة');
    }
    return;
  }
  
  // حساب المبلغ الفعلي بناءً على النوع
  let actualAmount = amountValue;
  if (calcType === 'percentage') {
    // حساب الرصيد الحالي للمحل
    const store = data.stores.find(s => s.id === storeId);
    if (!store) {
      if (typeof showNotification === 'function') {
        showNotification('المحل غير موجود', 'error');
      } else {
        alert('المحل غير موجود');
      }
      return;
    }
    
    const sales = data.sales.filter(s => s.storeId === storeId);
    const payments = data.payments.filter(p => p.storeId === storeId);
    const adjustments = data.adjustments ? data.adjustments.filter(a => a.storeId === storeId) : [];
    
    const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalPayments = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const totalAdjustments = adjustments.reduce((sum, adj) => {
      return sum + (adj.type === 'discount' ? adj.amount : -adj.amount);
    }, 0);
    
    const currentBalance = totalSales - totalPayments - totalAdjustments;
    
    // حساب المبلغ من النسبة المئوية
    actualAmount = Math.abs(currentBalance) * (amountValue / 100);
  }
  
  if (!reason) {
    if (typeof showNotification === 'function') {
      showNotification('يرجى إدخال سبب التعديل', 'error');
    } else {
      alert('يرجى إدخال سبب التعديل');
    }
    return;
  }
  
  // إنشاء مصفوفة التعديلات إذا لم تكن موجودة
  if (!data.adjustments) {
    data.adjustments = [];
    console.log('تم إنشاء مصفوفة التعديلات');
  }
  
  // إضافة التعديل الجديد
  const newAdjustment = {
    id: 'adj_' + Date.now(),
    storeId: storeId,
    type: type,
    amount: actualAmount,
    calcType: calcType,
    calcValue: amountValue, // القيمة الأصلية (مبلغ أو نسبة)
    reason: reason,
    date: typeof formatDateEn === 'function' ? formatDateEn(date) : date,
    createdAt: new Date().toISOString()
  };
  
  console.log('التعديل الجديد:', newAdjustment);
  
  data.adjustments.push(newAdjustment);
  
  console.log('التعديلات بعد الإضافة:', data.adjustments);
  
  // حفظ البيانات
  console.log('حفظ البيانات...');
  saveData();
  console.log('تم حفظ البيانات');
  
  // تحديث العرض
  if (typeof refreshCurrentView === 'function') {
    refreshCurrentView();
  }
  
  // إظهار رسالة نجاح
  const typeText = type === 'discount' ? 'خصم' : 'إضافة';
  let valueText;
  if (typeof formatNumber === 'function') {
    valueText = calcType === 'percentage' ? `${amountValue}% (${formatNumber(actualAmount)} ريال)` : `${formatNumber(actualAmount)} ريال`;
  } else {
    valueText = calcType === 'percentage' ? `${amountValue}% (${actualAmount} ريال)` : `${actualAmount} ريال`;
  }
  
  if (typeof showNotification === 'function') {
    showNotification(`تم ${typeText} ${valueText} بنجاح`, 'success');
  } else {
    alert(`تم ${typeText} ${valueText} بنجاح`);
  }
  
  // إغلاق النموذج
  const modal = bootstrap.Modal.getInstance(document.getElementById('adjustmentModal'));
  modal.hide();
  
  // تحديث تفاصيل المحل
  if (typeof showStoreDetails === 'function') {
    showStoreDetails(storeId);
  }
  
  } catch (error) {
    console.error('خطأ في حفظ التعديل:', error);
    alert('حدث خطأ في حفظ التعديل: ' + error.message);
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
  
  if (typeof showNotification === 'function') {
    showNotification('تم حذف التعديل بنجاح', 'success');
  } else {
    alert('تم حذف التعديل بنجاح');
  }
}

// تصدير الدوال للاستخدام العام
window.showAdjustmentModal = showAdjustmentModal;
window.updateAdjustmentPreview = updateAdjustmentPreview;
window.saveAdjustment = saveAdjustment;
window.deleteAdjustment = deleteAdjustment;