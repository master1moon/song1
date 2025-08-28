/**
 * ملف stores.js - نظام إدارة المحلات
 * يتعامل مع إضافة، تعديل، حذف، وعرض المحلات
 * يدعم البحث، الفلترة، والترتيب
 * يحسب أرصدة المحلات بناءً على المبيعات والمدفوعات
 * 
 * المشاكل المحتملة:
 * - حساب الرصيد يتم في كل عرض مما قد يبطئ الأداء
 * - لا يوجد تخزين مؤقت (cache) للأرصدة المحسوبة
 * - معالجة الأخطاء ضعيفة في بعض الدوال
 * - لا يوجد تحقق من تكرار أسماء المحلات
 * - حذف المحل لا يحذف البيانات المرتبطة به
 */

// إدارة المحلات

// حالة البحث والفلترة
const storesState = {
  searchQuery: '',
  priceFilter: 'all',
  sortBy: 'name'
};

/**
 * عرض قائمة المحلات في الشريط الجانبي مع تطبيق البحث والفلترة
 * يقوم بإنشاء عناصر القائمة لكل محل مع عرض اسمه ونوع السعر والرصيد
 * يضيف مستمع للنقر على كل محل لعرض تفاصيله
 * مشكلة: حساب الرصيد يتم لكل محل في كل عرض
 */
function renderStoresList() {
  const list = document.getElementById('storesList'); 
  if (!list) return;
  
  // تطبيق البحث والفلترة
  let filteredStores = [...data.stores];
  
  // البحث
  if (storesState.searchQuery) {
    const query = storesState.searchQuery.toLowerCase();
    filteredStores = filteredStores.filter(store => 
      store.name.toLowerCase().includes(query) ||
      (store.phone && store.phone.includes(query))
    );
  }
  
  // فلتر نوع السعر
  if (storesState.priceFilter !== 'all') {
    filteredStores = filteredStores.filter(store => store.priceType === storesState.priceFilter);
  }
  
  // حساب الرصيد لكل محل
  filteredStores = filteredStores.map(store => {
    const sales = data.sales.filter(s => s.storeId === store.id);
    const payments = data.payments.filter(p => p.storeId === store.id);
    const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalPayments = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const balance = totalSales - totalPayments;
    return { ...store, balance };
  });
  
  // الترتيب
  switch (storesState.sortBy) {
    case 'name':
      filteredStores.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'date':
      filteredStores.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      break;
    case 'balance':
      filteredStores.sort((a, b) => b.balance - a.balance);
      break;
  }
  
  list.innerHTML = '';
  
  if (filteredStores.length === 0) {
    list.innerHTML = '<div class="text-center p-3 text-muted">لا توجد محلات مطابقة للبحث</div>';
    return;
  }
  
  filteredStores.forEach(store => {
    const item = document.createElement('a'); 
    item.href = '#'; 
    item.className = 'list-group-item list-group-item-action'; 
    item.dataset.id = store.id;
    
    const balanceClass = store.balance >= 0 ? 'text-success' : 'text-danger';
    const phoneInfo = store.phone ? `<i class="fas fa-phone fa-xs"></i> ${store.phone}` : '';
    
    item.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h6 class="mb-1">${store.name}</h6>
          <small class="text-muted">نوع السعر: ${getPriceTypeName(store.priceType)}</small>
          ${phoneInfo ? `<br><small class="text-muted">${phoneInfo}</small>` : ''}
        </div>
        <div class="text-end">
          <small class="${balanceClass} fw-bold">${formatNumber(Math.abs(store.balance))} ريال</small>
          <br><small class="text-muted">${store.balance >= 0 ? 'دائن' : 'مدين'}</small>
        </div>
      </div>`;
    
    item.addEventListener('click', (e) => {
      e.preventDefault();
      showStoreDetails(store.id);
    });
    
    list.appendChild(item);
  });
}

// تهيئة معالجات البحث والفلترة
function initStoresFilters() {
  const searchInput = document.getElementById('storeSearchInput');
  const priceFilter = document.getElementById('storePriceFilter');
  const sortBy = document.getElementById('storeSortBy');
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      storesState.searchQuery = e.target.value;
      renderStoresList();
    });
  }
  
  if (priceFilter) {
    priceFilter.addEventListener('change', (e) => {
      storesState.priceFilter = e.target.value;
      renderStoresList();
    });
  }
  
  if (sortBy) {
    sortBy.addEventListener('change', (e) => {
      storesState.sortBy = e.target.value;
      renderStoresList();
    });
  }
}

// استدعاء التهيئة عند تحميل الصفحة
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initStoresFilters);
}

/**
 * اختيار جهة اتصال من الجهاز
 * يستخدم Contact Picker API المتاحة في المتصفحات الحديثة
 */
async function selectContactPhone() {
  // التحقق من دعم المتصفح لـ Contact Picker API
  if (!('contacts' in navigator && 'ContactsManager' in window)) {
    // محاولة استخدام Web Share API كبديل
    if (navigator.share) {
      showNotification('يمكنك نسخ رقم الهاتف من جهات الاتصال ولصقه هنا', 'info');
      // فتح حقل الإدخال للصق
      document.getElementById('storePhone').focus();
      document.getElementById('storePhone').select();
    } else {
      showNotification('متصفحك لا يدعم الوصول المباشر لجهات الاتصال. يرجى إدخال الرقم يدوياً.', 'info');
    }
    return;
  }
  
  try {
    // طلب الإذن واختيار جهة اتصال
    const props = ['name', 'tel'];
    const opts = { multiple: false };
    
    const contacts = await navigator.contacts.select(props, opts);
    
    if (contacts.length > 0) {
      const contact = contacts[0];
      
      // الحصول على رقم الهاتف
      if (contact.tel && contact.tel.length > 0) {
        let phoneNumber = contact.tel[0];
        
        // تنظيف رقم الهاتف من الرموز والمسافات
        phoneNumber = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
        
        // إذا كان الرقم يبدأ بـ 967 (رمز اليمن)، نحوله للصيغة المحلية
        if (phoneNumber.startsWith('967')) {
          phoneNumber = phoneNumber.substring(3);
          // إضافة الصفر في البداية إذا لم يكن موجوداً
          if (!phoneNumber.startsWith('0')) {
            phoneNumber = '0' + phoneNumber;
          }
        }
        
        // التحقق من أن الرقم يمني صحيح (يبدأ بـ 73, 77, 71, 70, 78, 79)
        const yemeniPrefixes = ['73', '77', '71', '70', '78', '79'];
        const prefix = phoneNumber.substring(0, 2);
        
        if (!yemeniPrefixes.includes(prefix)) {
          // إذا كان الرقم بدون صفر في البداية، نضيفه
          if (yemeniPrefixes.includes(phoneNumber.substring(0, 2))) {
            phoneNumber = '0' + phoneNumber;
          }
        }
        
        // وضع الرقم في الحقل
        document.getElementById('storePhone').value = phoneNumber;
        
        // عرض اسم جهة الاتصال إذا كان متاحاً
        if (contact.name && contact.name.length > 0) {
          showNotification(`تم اختيار رقم: ${contact.name[0]}`, 'success');
        } else {
          showNotification('تم اختيار رقم الهاتف بنجاح', 'success');
        }
      } else {
        showNotification('جهة الاتصال المختارة لا تحتوي على رقم هاتف', 'warning');
      }
    }
  } catch (error) {
    console.error('خطأ في اختيار جهة الاتصال:', error);
    
    // معالجة الأخطاء المختلفة
    if (error.name === 'SecurityError') {
      showNotification('يجب استخدام HTTPS للوصول لجهات الاتصال', 'error');
    } else if (error.name === 'NotAllowedError') {
      showNotification('تم رفض الوصول لجهات الاتصال', 'error');
    } else {
      showNotification('حدث خطأ في اختيار جهة الاتصال', 'error');
    }
  }
}

// ربط زر اختيار جهة الاتصال
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    const selectContactBtn = document.getElementById('selectContactBtn');
    if (selectContactBtn) {
      selectContactBtn.addEventListener('click', selectContactPhone);
    }
  });
}

/**
 * عرض تفاصيل محل محدد
 * يعرض الرصيد الحالي، نوع السعر، جدول المبيعات والمدفوعات
 * يحسب إجمالي المبيعات والمدفوعات والرصيد المتبقي
 * يضيف أزرار التحكم (إضافة بيع، تسديد دفعة، تعديل، حذف)
 * @param {string} storeId - معرف المحل
 */
function showStoreDetails(storeId) {
  const store = data.stores.find(s => s.id === storeId); 
  if (!store) return;
  
  // تحديث العنوان
  const headerEl = document.getElementById('storeHeader');
  headerEl.innerHTML = `
    <div class="d-flex justify-content-between align-items-center">
      <span>تفاصيل المحل: ${store.name}</span>
      <div>
        <button class="btn btn-sm btn-warning edit-store" data-id="${storeId}" title="تعديل">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-store" data-id="${storeId}" title="حذف">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>`;
  
  const details = document.getElementById('storeDetails');
  const sales = data.sales.filter(s => s.storeId === storeId);
  const payments = data.payments.filter(p => p.storeId === storeId);
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balance = totalSales - totalPayments;
  
  // عرض معلومات الهاتف إذا كانت موجودة مع خيارات التواصل
  const phoneInfo = store.phone ? 
    `<div class="col-md-4">
      <div class="info-card">
        <i class="fas fa-phone-alt text-info mb-2"></i>
        <h6>رقم الهاتف</h6>
        <p class="mb-0 h5">${store.phone}</p>
        <div class="btn-group btn-group-sm mt-2 w-100" role="group">
          <button class="btn btn-outline-primary" onclick="makePhoneCall('${store.phone}')" title="اتصال">
            <i class="fas fa-phone"></i>
          </button>
          <button class="btn btn-outline-success" onclick="sendBalanceSMS('${store.phone}', ${balance}, '${store.name}')" title="رسالة الرصيد">
            <i class="fas fa-sms"></i>
          </button>
          <button class="btn btn-outline-info" onclick="shareReport('${storeId}')" title="مشاركة التقرير">
            <i class="fas fa-share-alt"></i>
          </button>
          <button class="btn btn-outline-success" onclick="shareViaWhatsApp('${storeId}')" title="مشاركة واتساب">
            <i class="fab fa-whatsapp"></i>
          </button>
        </div>
      </div>
    </div>` : '';
  
  details.innerHTML = `
    <!-- معلومات المحل الأساسية -->
    <div class="row mb-4">
      <div class="col-md-4">
        <div class="info-card ${balance >= 0 ? 'border-success' : 'border-danger'}">
          <i class="fas fa-wallet ${balance >= 0 ? 'text-success' : 'text-danger'} mb-2"></i>
          <h6>الرصيد الحالي</h6>
          <p class="h4 mb-0 ${balance >= 0 ? 'text-success' : 'text-danger'} currency">${formatNumber(Math.abs(balance))}</p>
          <small class="text-muted">${balance >= 0 ? 'دائن' : 'مدين'}</small>
        </div>
      </div>
      <div class="col-md-4">
        <div class="info-card">
          <i class="fas fa-tag text-primary mb-2"></i>
          <h6>نوع السعر</h6>
          <p class="h5 mb-0">${getPriceTypeName(store.priceType)}</p>
        </div>
      </div>
      ${phoneInfo}
    </div>
    
    <!-- أزرار الإجراءات السريعة -->
    <div class="d-flex gap-2 mb-4">
      <button class="btn btn-success" id="addSaleBtn" data-store="${storeId}">
        <i class="fas fa-cart-plus me-2"></i>إضافة بيع
      </button>
      <button class="btn btn-info" id="addPaymentBtn" data-store="${storeId}">
        <i class="fas fa-money-bill-wave me-2"></i>تسديد دفعة
      </button>
    </div>
    <h5>عمليات البيع</h5>
    <div class="table-responsive mb-4">
      <table class="data-table"><thead><tr><th>التاريخ</th><th>السبب/الباقة</th><th>الكمية/المبلغ</th><th>الإجمالي</th><th>الإجراءات</th></tr></thead><tbody id="storeSalesTable"></tbody></table>
    </div>
    <h5>عمليات التسديد</h5>
    <div class="table-responsive">
      <table class="data-table"><thead><tr><th>التاريخ</th><th>المبلغ</th><th>ملاحظات</th><th>الإجراءات</th></tr></thead><tbody id="storePaymentsTable"></tbody></table>
    </div>
    <div class="card mb-3"><div class="card-body"><div class="row g-2 align-items-end">
      <div class="col-md-4"><label class="form-label">من تاريخ</label><input type="date" id="storeFromDate" class="form-control"></div>
      <div class="col-md-4"><label class="form-label">إلى تاريخ</label><input type="date" id="storeToDate" class="form-control"></div>
      <div class="col-md-4"><button class="btn btn-primary w-100" id="storeApplyFilterBtn">تطبيق الفترة للتصدير</button></div>
    </div></div></div>
    <div class="export-options mt-2">
      <button type="button" class="btn btn-outline-success export-btn" data-type="store" data-store="${storeId}" data-format="excel"><i class="fas fa-file-excel me-2"></i>تصدير Excel</button>
      <button type="button" class="btn btn-outline-secondary export-btn" data-type="store" data-store="${storeId}" data-format="txt"><i class="fas fa-file-alt me-2"></i>تصدير TXT</button>
      <button type="button" class="btn btn-outline-dark export-btn" data-type="store" data-store="${storeId}" data-format="json"><i class="fas fa-file-code me-2"></i>تصدير JSON</button>
      <button type="button" class="btn btn-outline-danger export-btn" data-type="store" data-store="${storeId}" data-format="pdf"><i class="fas fa-file-pdf me-2"></i>تصدير PDF</button>
      <button type="button" class="btn btn-outline-primary export-btn" data-type="store" data-store="${storeId}" data-format="printpage"><i class="fas fa-file-alt me-2"></i>فتح صفحة التقرير</button>
    </div>`;
  const salesTable = document.getElementById('storeSalesTable'); salesTable.innerHTML = '';
  sales.forEach(sale => {
    const pkg = sale.packageId ? data.packages.find(p => p.id === sale.packageId) : null;
    const isCustom = sale.packageId === 'custom';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${sale.date}</td>
      <td>${sale.reason || (pkg ? pkg.name : 'غير معروف')}</td>
      <td>${isCustom ? ('<span class="currency">' + formatNumber(sale.amount) + '</span>') : sale.quantity}</td>
      <td class="currency">${formatNumber(sale.total)}</td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-warning edit-sale" data-id="${sale.id}"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger delete-sale" data-id="${sale.id}"><i class="fas fa-trash"></i></button>
      </td>`;
    salesTable.appendChild(row);
  });
  const paymentsTable = document.getElementById('storePaymentsTable'); paymentsTable.innerHTML = '';
  payments.forEach(payment => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${payment.date}</td>
      <td class="currency">${formatNumber(payment.amount)}</td>
      <td>${payment.notes || ''}</td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-warning edit-payment" data-id="${payment.id}"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger delete-payment" data-id="${payment.id}"><i class="fas fa-trash"></i></button>
      </td>`;
    paymentsTable.appendChild(row);
  });
  document.getElementById('addSaleBtn').addEventListener('click', () => addSale(storeId));
  document.getElementById('addPaymentBtn').addEventListener('click', () => addPayment(storeId));
  
  // معالجات أزرار التعديل والحذف في العنوان
  headerEl.querySelector('.edit-store').addEventListener('click', () => editStore(storeId));
  headerEl.querySelector('.delete-store').addEventListener('click', () => deleteStore(storeId));
  
  document.querySelectorAll('.edit-sale').forEach(btn => { btn.addEventListener('click', () => editSale(btn.dataset.id)); });
  document.querySelectorAll('.delete-sale').forEach(btn => { btn.addEventListener('click', () => deleteSale(btn.dataset.id)); });
  document.querySelectorAll('.edit-payment').forEach(btn => { btn.addEventListener('click', () => editPayment(btn.dataset.id)); });
  document.querySelectorAll('.delete-payment').forEach(btn => { btn.addEventListener('click', () => deletePayment(btn.dataset.id)); });
}

/**
 * فتح نموذج إضافة محل جديد
 * يعيد تعيين جميع حقول النموذج إلى قيمها الافتراضية
 * يضبط التاريخ على اليوم الحالي
 */
function addStore() {
  document.getElementById('storeModalTitle').textContent = 'إضافة محل جديد';
  document.getElementById('storeId').value = '';
  document.getElementById('storeName').value = '';
  document.getElementById('storePriceType').value = 'retail';
  document.getElementById('storePhone').value = '';
  document.getElementById('storeDate').value = today;
  const modal = new bootstrap.Modal(document.getElementById('storeModal')); modal.show();
}

/**
 * فتح نموذج تعديل محل موجود
 * يملأ النموذج بالبيانات الحالية للمحل
 * @param {string} id - معرف المحل المراد تعديله
 */
function editStore(id) {
  const store = data.stores.find(s => s.id === id); if (!store) return;
  document.getElementById('storeModalTitle').textContent = 'تعديل المحل';
  document.getElementById('storeId').value = store.id;
  document.getElementById('storeName').value = store.name;
  document.getElementById('storePriceType').value = store.priceType;
  document.getElementById('storePhone').value = store.phone || '';
  document.getElementById('storeDate').value = store.createdAt || today;
  const modal = new bootstrap.Modal(document.getElementById('storeModal')); modal.show();
}

/**
 * حذف محل من القائمة
 * يطلب تأكيد من المستخدم قبل الحذف
 * ينقل المحل المحذوف إلى سلة المحذوفات إذا كانت متاحة
 * يحدث جميع الجداول والتقارير المتعلقة
 * @param {string} id - معرف المحل المراد حذفه
 */
function deleteStore(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المحل؟')) return;
  const store = data.stores.find(s => s.id === id);
  data.stores = data.stores.filter(s => s.id !== id);
  saveData();
  (async()=>{ try{ if (store && typeof addToTrash==='function') await addToTrash('stores', store); }catch{}; renderStoresList(); updateDashboard(); updateProfitReport(); })();
  showNotification('تم حذف المحل بنجاح', 'success');
}

/**
 * حفظ بيانات المحل (إضافة جديد أو تحديث موجود)
 * يتحقق من صحة البيانات المدخلة
 * يقوم بإنشاء معرف فريد للمحلات الجديدة
 * يحدث جميع الجداول والتقارير ذات الصلة
 * يعرض إشعار بنجاح العملية
 */
function saveStore() {
  const id = document.getElementById('storeId').value;
  const name = document.getElementById('storeName').value;
  const priceType = document.getElementById('storePriceType').value;
  const phone = document.getElementById('storePhone').value.trim();
  const date = document.getElementById('storeDate').value ? formatDateEn(document.getElementById('storeDate').value) : today;
  
  if (!name) { 
    showNotification('يرجى إدخال اسم المحل', 'error'); 
    return; 
  }
  
  // التحقق من صحة رقم الهاتف اليمني إذا تم إدخاله
  if (phone) {
    // الأرقام اليمنية تبدأ بـ 73, 77, 71, 70, 78, 79 وتكون 9 أرقام (أو 10 مع الصفر)
    const yemeniPhoneRegex = /^(0)?(73|77|71|70|78|79)\d{7}$/;
    if (!yemeniPhoneRegex.test(phone)) {
      showNotification('يرجى إدخال رقم هاتف يمني صحيح (مثال: 0771234567)', 'error');
      return;
    }
  }
  
  if (id) {
    const store = data.stores.find(s => s.id === id);
    if (store) { 
      store.name = name; 
      store.priceType = priceType; 
      store.phone = phone;
      store.createdAt = date; 
    }
    showNotification('تم تحديث المحل بنجاح', 'success');
  } else {
    const newId = 'store_' + Date.now();
    data.stores.push({ 
      id: newId, 
      name, 
      priceType, 
      phone,
      createdAt: date 
    });
    showNotification('تم إضافة المحل بنجاح', 'success');
  }
  saveData();
  renderStoresList();
  updateDashboard();
  updateReportStores();
  generateDebtReport();
  const modal = bootstrap.Modal.getInstance(document.getElementById('storeModal')); 
  modal.hide();
  if (typeof cleanupModalBackdrops === 'function') setTimeout(cleanupModalBackdrops, 300);
}

// تم نقل دالة exportStoreData إلى reports.js لتجنب التكرار

/**
 * نظام الاختصارات السريعة لانتقاء المحل
 * يوفر واجهة سريعة لاختيار محل قبل إضافة بيع أو دفعة
 * يحتوي على أزرار سريعة للانتقال إلى الأقسام المختلفة
 * يدير النافذة المنبثقة لاختيار المحل
 */
// اختصارات سريعة لانتقاء المحل قبل البيع/التسديد
(function () {
  let nextAction = null; // 'sale' | 'payment'
  const selectStoreModalEl = document.getElementById('selectStoreModal');
  const selectStoreModal = selectStoreModalEl ? new bootstrap.Modal(selectStoreModalEl) : null;
  function openSelectStore(actionType) {
    if (!selectStoreModal) return;
    nextAction = actionType;
    const sel = document.getElementById('selectStoreSelect'); sel.innerHTML = '';
    if (data.stores.length === 0) { const opt = document.createElement('option'); opt.value = ''; opt.textContent = 'لا توجد محلات، أضف محلًا أولاً'; sel.appendChild(opt); }
    else { data.stores.forEach(s => { const opt = document.createElement('option'); opt.value = s.id; opt.textContent = s.name; sel.appendChild(opt); }); }
    selectStoreModal.show();
  }
  const confirmBtn = document.getElementById('confirmSelectStoreBtn');
  if (confirmBtn) confirmBtn.addEventListener('click', () => {
    const sel = document.getElementById('selectStoreSelect'); const storeId = sel.value;
    if (!storeId) { showNotification('يرجى اختيار محل', 'error'); return; }
    selectStoreModal.hide();
    if (nextAction === 'sale') addSale(storeId); else if (nextAction === 'payment') addPayment(storeId);
    nextAction = null;
  });
  const qa = { sale: document.getElementById('qaAddSale'), payment: document.getElementById('qaAddPayment'), inventory: document.getElementById('qaAddInventory'), expense: document.getElementById('qaAddExpense'), store: document.getElementById('qaAddStore'), pkg: document.getElementById('qaAddPackage') };
  if (qa.sale) qa.sale.addEventListener('click', () => openSelectStore('sale'));
  if (qa.payment) qa.payment.addEventListener('click', () => openSelectStore('payment'));
  if (qa.inventory) qa.inventory.addEventListener('click', () => {
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="inventory"]').classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById('inventory').style.display = 'block';
    document.querySelector('.page-title').textContent = 'كمية الكروت';
    addInventory();
  });
  if (qa.expense) qa.expense.addEventListener('click', () => {
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="expenses"]').classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById('expenses').style.display = 'block';
    document.querySelector('.page-title').textContent = 'المصروفات';
    addExpense();
  });
  if (qa.store) qa.store.addEventListener('click', () => {
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="stores"]').classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById('stores').style.display = 'block';
    document.querySelector('.page-title').textContent = 'البقالات والمحلات';
    addStore();
  });
  if (qa.pkg) qa.pkg.addEventListener('click', () => {
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="packages"]').classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById('packages').style.display = 'block';
    document.querySelector('.page-title').textContent = 'الباقات والأسعار';
    addPackage();
  });
})();