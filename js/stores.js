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
  if (!store) {
    showNotification('المحل غير موجود', 'error');
    return;
  }
  
  // تحديث العنوان
  const headerEl = document.getElementById('storeHeader');
  if (!headerEl) {
    console.error('عنصر storeHeader غير موجود');
    return;
  }
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
          <button class="btn btn-outline-success" onclick="shareViaWhatsApp('${storeId}')" title="مشاركة التقرير">
            <i class="fas fa-share-alt"></i>
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
    
    <!-- شريط الفلترة المتقدم -->
    <div class="advanced-filter-section mb-4">
      <div class="card">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-6">
              <div class="filter-selector-wrapper">
                <button class="filter-selector-btn btn btn-outline-primary w-100" data-store-id="${storeId}">
                  <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center gap-2">
                      <i class="fas fa-sync-alt filter-icon"></i>
                      <div class="text-start">
                        <div class="filter-title">الدورة المالية الحالية</div>
                        <small class="filter-subtitle text-muted">من آخر تصفير حتى الآن</small>
                      </div>
                    </div>
                    <i class="fas fa-chevron-down"></i>
                  </div>
                </button>
                
                <!-- قائمة الفلترة المنسدلة -->
                <div class="filter-dropdown" id="filterDropdown_${storeId}" style="display: none;">
                  <!-- الدورات المالية -->
                  <div class="filter-group-title">الدورات المالية</div>
                  <div class="filter-option active" onclick="applyFilter('${storeId}', 'cycle', 'current_cycle')">
                    <i class="fas fa-sync-alt text-primary"></i>
                    <div class="filter-option-text">
                      <div>الدورة المالية الحالية</div>
                      <small class="text-muted">من آخر تصفير حتى الآن</small>
                    </div>
                    <span class="badge bg-danger">افتراضي</span>
                  </div>
                  <div class="filter-option" onclick="applyFilter('${storeId}', 'cycle', 'previous_cycle')">
                    <i class="fas fa-history text-info"></i>
                    <div class="filter-option-text">
                      <div>الدورة السابقة</div>
                      <small class="text-muted">الدورة المالية المكتملة السابقة</small>
                    </div>
                  </div>
                  <div class="filter-option" onclick="applyFilter('${storeId}', 'time', 'all_time')">
                    <i class="fas fa-infinity text-secondary"></i>
                    <div class="filter-option-text">
                      <div>من البداية</div>
                      <small class="text-muted">كل العمليات المسجلة</small>
                    </div>
                  </div>
                  
                  <!-- الفترات الزمنية -->
                  <div class="filter-group-title">فترات زمنية سريعة</div>
                  <div class="filter-option" onclick="applyFilter('${storeId}', 'time', 'today')">
                    <i class="fas fa-calendar-day text-warning"></i>
                    <div class="filter-option-text">
                                    <div>اليوم</div>
              <small class="text-muted">${typeof moment !== 'undefined' ? moment().format('DD/MM/YYYY') : new Date().toLocaleDateString('ar')}</small>
                    </div>
                  </div>
                  <div class="filter-option" onclick="applyFilter('${storeId}', 'time', 'last_7_days')">
                    <i class="fas fa-calendar-week text-warning"></i>
                    <div class="filter-option-text">
                      <div>آخر 7 أيام</div>
                      <small class="text-muted">آخر أسبوع</small>
                    </div>
                  </div>
                  <div class="filter-option" onclick="applyFilter('${storeId}', 'time', 'last_30_days')">
                    <i class="fas fa-calendar-alt text-warning"></i>
                    <div class="filter-option-text">
                      <div>آخر 30 يوم</div>
                      <small class="text-muted">آخر شهر</small>
                    </div>
                  </div>
                  <div class="filter-option" onclick="applyFilter('${storeId}', 'time', 'this_month')">
                    <i class="fas fa-calendar-check text-warning"></i>
                    <div class="filter-option-text">
                      <div>هذا الشهر</div>
                      <small class="text-muted">الشهر الحالي</small>
                    </div>
                  </div>
                  <div class="filter-option" onclick="applyFilter('${storeId}', 'time', 'last_month')">
                    <i class="fas fa-calendar-minus text-warning"></i>
                    <div class="filter-option-text">
                      <div>الشهر السابق</div>
                      <small class="text-muted">الشهر الماضي</small>
                    </div>
                  </div>
                  
                  <!-- مخصص -->
                  <div class="filter-group-title">مخصص</div>
                  <div class="filter-option" onclick="showCustomDateFilter('${storeId}')">
                    <i class="fas fa-calendar-plus text-success"></i>
                    <div class="filter-option-text">
                      <div>تحديد فترة مخصصة</div>
                      <small class="text-muted">اختر تاريخ البداية والنهاية</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="col-md-6">
              <div class="d-flex gap-2 justify-content-end">
                <button class="btn btn-sm btn-outline-secondary filter-type-btn active" id="filterAll_${storeId}" onclick="toggleFilterType('${storeId}', 'all')">
                  <i class="fas fa-list"></i> الكل
                </button>
                <button class="btn btn-sm btn-outline-danger filter-type-btn" id="filterSales_${storeId}" onclick="toggleFilterType('${storeId}', 'sales')">
                  <i class="fas fa-shopping-cart"></i> مبيعات فقط
                </button>
                <button class="btn btn-sm btn-outline-success filter-type-btn" id="filterPayments_${storeId}" onclick="toggleFilterType('${storeId}', 'payments')">
                  <i class="fas fa-money-bill"></i> تسديدات فقط
                </button>
              </div>
            </div>
          </div>
          
          <!-- حقول التاريخ المخصص (مخفية افتراضياً) -->
          <div class="custom-date-section mt-3" id="customDateSection_${storeId}" style="display: none;">
            <div class="row g-2">
              <div class="col-md-5">
                <input type="date" class="form-control" id="customStartDate_${storeId}" placeholder="من تاريخ">
              </div>
              <div class="col-md-5">
                <input type="date" class="form-control" id="customEndDate_${storeId}" placeholder="إلى تاريخ">
              </div>
              <div class="col-md-2">
                <button class="btn btn-primary w-100" onclick="applyCustomDateFilter('${storeId}')">
                  <i class="fas fa-check"></i> تطبيق
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- ملخص الفترة المحددة -->
    <div class="filter-summary mb-3" id="filterSummary_${storeId}">
      <!-- سيتم ملؤه بواسطة JavaScript -->
    </div>
    
    <!-- نوع العرض -->
    <div class="view-type-selector mb-3">
      <div class="btn-group" role="group">
        <button type="button" class="btn btn-sm btn-outline-primary active" id="tableView_${storeId}" onclick="switchView('${storeId}', 'table')">
          <i class="fas fa-table"></i> عرض جدولي
        </button>
        <button type="button" class="btn btn-sm btn-outline-primary" id="timelineView_${storeId}" onclick="switchView('${storeId}', 'timeline')">
          <i class="fas fa-file-invoice"></i> كشف حساب
        </button>
      </div>
    </div>
    
    <!-- العرض الجدولي -->
    <div id="tableViewContent_${storeId}">
      <h5>عمليات البيع</h5>
      <div class="table-responsive mb-4">
        <table class="data-table"><thead><tr><th>التاريخ</th><th>السبب/الباقة</th><th>عدد الكروت/المبلغ</th><th>الإجمالي</th><th>الإجراءات</th></tr></thead><tbody id="storeSalesTable"></tbody></table>
      </div>
      <h5>عمليات التسديد</h5>
      <div class="table-responsive">
        <table class="data-table"><thead><tr><th>التاريخ</th><th>المبلغ</th><th>ملاحظات</th><th>الإجراءات</th></tr></thead><tbody id="storePaymentsTable"></tbody></table>
      </div>
    </div>
    
    <!-- العرض الزمني -->
    <div id="timelineViewContent_${storeId}" style="display: none;">
      <div class="timeline-container" id="timelineContainer_${storeId}">
        <!-- سيتم ملؤه بواسطة JavaScript -->
      </div>
    </div>
    <!-- تم إزالة فلترة التواريخ المخصصة مؤقتاً - سيتم استبدالها بنظام الفلترة المتقدم -->
    <div class="export-options mt-2">
      <button type="button" class="btn btn-outline-success export-btn" data-type="store" data-store="${storeId}" data-format="excel"><i class="fas fa-file-excel me-2"></i>تصدير Excel</button>
      <button type="button" class="btn btn-outline-secondary export-btn" data-type="store" data-store="${storeId}" data-format="txt"><i class="fas fa-file-alt me-2"></i>تصدير TXT</button>
      <button type="button" class="btn btn-outline-dark export-btn" data-type="store" data-store="${storeId}" data-format="json"><i class="fas fa-file-code me-2"></i>تصدير JSON</button>
      <!-- زر تصدير PDF مخفي حالياً - يمكن تفعيله لاحقاً عند تطوير ميزة تصدير PDF الحقيقية
      <button type="button" class="btn btn-outline-danger export-btn" data-type="store" data-store="${storeId}" data-format="pdf"><i class="fas fa-file-pdf me-2"></i>تصدير PDF</button>
      -->
      <button type="button" class="btn btn-outline-primary export-btn" data-type="store" data-store="${storeId}" data-format="printpage"><i class="fas fa-file-alt me-2"></i>فتح صفحة التقرير</button>
      <button type="button" class="btn btn-outline-info export-btn" data-type="store" data-store="${storeId}" data-format="statement"><i class="fas fa-file-invoice me-2"></i>كشف حساب متحرك</button>
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
  
  // عرض قسم تفاصيل المحل
  // القسم موجود بالفعل، لا حاجة لإخفاء أو إظهار أي شيء
  
  // تطبيق الفلترة الافتراضية عند فتح المحل
  setTimeout(() => {
    // إضافة event listener مباشرة للزر
    const filterBtn = document.querySelector(`#storeDetails .filter-selector-btn`);
    if (filterBtn) {
      console.log('Adding click event to filter button');
      filterBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Filter button clicked directly');
        toggleFilterDropdown(storeId);
      });
    } else {
      console.error('Filter button not found');
    }
    
    if (window.storeFilter) {
      updateStoreDetailsWithFilter(storeId);
    }
  }, 100);
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
  document.getElementById('storeDate').value = getTodayDate();
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
  document.getElementById('storeDate').value = store.createdAt || getTodayDate();
  const modal = new bootstrap.Modal(document.getElementById('storeModal')); modal.show();
}

/**
 * حذف محل من القائمة مع جميع البيانات المرتبطة
 * يطلب تأكيد من المستخدم قبل الحذف
 * يعرض عدد العمليات المرتبطة قبل الحذف
 * ينقل المحل وجميع بياناته المرتبطة إلى سلة المحذوفات
 * يحدث جميع الجداول والتقارير المتعلقة
 * @param {string} id - معرف المحل المراد حذفه
 */
function deleteStore(id) {
  const store = data.stores.find(s => s.id === id);
  if (!store) return;
  
  // حساب البيانات المرتبطة
  const relatedSales = data.sales.filter(s => s.storeId === id);
  const relatedPayments = data.payments.filter(p => p.storeId === id);
  
  // عرض تأكيد مفصل
  let confirmMessage = `هل أنت متأكد من حذف محل "${store.name}"؟`;
  
  if (relatedSales.length > 0 || relatedPayments.length > 0) {
    confirmMessage += `\n\nسيتم أيضاً حذف:`;
    if (relatedSales.length > 0) {
      confirmMessage += `\n- ${relatedSales.length} عملية بيع`;
    }
    if (relatedPayments.length > 0) {
      confirmMessage += `\n- ${relatedPayments.length} عملية دفع`;
    }
    confirmMessage += `\n\nيمكن استرجاع جميع البيانات من سلة المحذوفات`;
  }
  
  if (!confirm(confirmMessage)) return;
  
  // حذف المحل
  data.stores = data.stores.filter(s => s.id !== id);
  
  // حذف البيانات المرتبطة
  data.sales = data.sales.filter(s => s.storeId !== id);
  data.payments = data.payments.filter(p => p.storeId !== id);
  
  // حفظ التغييرات
  saveData();
  
  // نقل كل شيء إلى سلة المحذوفات
  (async() => {
    try {
      if (typeof addToTrash === 'function') {
        // نقل المحل
        await addToTrash('stores', store);
        
        // نقل المبيعات المرتبطة
        for (const sale of relatedSales) {
          await addToTrash('sales', sale);
        }
        
        // نقل المدفوعات المرتبطة
        for (const payment of relatedPayments) {
          await addToTrash('payments', payment);
        }
      }
    } catch(e) {
      console.error('خطأ في نقل البيانات إلى سلة المحذوفات:', e);
      // إظهار تحذير للمستخدم دون إيقاف العملية
      showNotification('تحذير: قد لا تكون النسخة الاحتياطية كاملة في سلة المحذوفات', 'warning');
    }
    
    // تحديث العروض
    refreshCurrentView();
    updateProfitReport();
  })();
  
  showNotification('تم حذف المحل وجميع البيانات المرتبطة بنجاح', 'success');
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
  const date = document.getElementById('storeDate').value ? formatDateEn(document.getElementById('storeDate').value) : getTodayDate();
  
  if (!name) { 
    showNotification('يرجى إدخال اسم المحل', 'error'); 
    return; 
  }
  
  // التحقق من عدم تكرار اسم المحل
  const duplicateStore = data.stores.find(s => 
    s.name.trim().toLowerCase() === name.trim().toLowerCase() && 
    s.id !== id // استثناء المحل الحالي عند التعديل
  );
  
  if (duplicateStore) {
    showNotification('يوجد محل آخر بنفس الاسم، يرجى اختيار اسم مختلف', 'error');
    document.getElementById('storeName').focus();
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
  refreshCurrentView(); // تحديث جميع العروض المرئية
  updateReportStores(); // خاص بالتقارير
  generateDebtReport(); // خاص بتقرير الديون
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

/**
 * دوال الفلترة المتقدمة للمحلات
 */

// تبديل قائمة الفلترة
function toggleFilterDropdown(storeId) {
  console.log('toggleFilterDropdown called with storeId:', storeId);
  try {
    const dropdown = document.getElementById(`filterDropdown_${storeId}`);
    console.log('Dropdown element:', dropdown);
    
    if (!dropdown) {
      console.error('القائمة المنسدلة غير موجودة:', `filterDropdown_${storeId}`);
      // محاولة البحث عن العنصر بطريقة أخرى
      const allDropdowns = document.querySelectorAll('.filter-dropdown');
      console.log('All filter dropdowns found:', allDropdowns.length);
      return;
    }
    
    const currentDisplay = dropdown.style.display;
    console.log('Current display:', currentDisplay);
    
    const isOpen = currentDisplay !== 'none' && currentDisplay !== '';
    console.log('Is open:', isOpen);
    
    // إغلاق جميع القوائم
    document.querySelectorAll('.filter-dropdown').forEach(d => d.style.display = 'none');
    
    // فتح/إغلاق القائمة الحالية
    dropdown.style.display = isOpen ? 'none' : 'block';
    console.log('New display:', dropdown.style.display);
    
    // تحديث حالة الزر
    const btn = dropdown.previousElementSibling;
    if (btn) {
      btn.classList.toggle('active', !isOpen);
    }
  } catch (error) {
    console.error('خطأ في toggleFilterDropdown:', error);
    console.error('Stack:', error.stack);
  }
}

// إغلاق القوائم عند النقر خارجها
document.addEventListener('click', function(e) {
  if (!e.target.closest('.filter-selector-wrapper')) {
    document.querySelectorAll('.filter-dropdown').forEach(d => d.style.display = 'none');
    document.querySelectorAll('.filter-selector-btn').forEach(b => b.classList.remove('active'));
  }
});

// تطبيق فلترة
function applyFilter(storeId, type, filterId) {
  // إنشاء كائن الفلترة
  let filter = {
    type: type,
    id: filterId,
    data: {
      includeTypes: getActiveFilterTypes(storeId)
    }
  };
  
  // معالجة حسب نوع الفلترة
  switch(type) {
    case 'cycle':
      if (filterId === 'current_cycle') {
        filter.data.cycleNumber = 'current';
        filter.description = 'الدورة المالية الحالية';
        filter.subtitle = 'من آخر تصفير حتى الآن';
      } else if (filterId === 'previous_cycle') {
        filter.data.cycleNumber = 1;
        filter.description = 'الدورة السابقة';
        filter.subtitle = 'الدورة المالية المكتملة السابقة';
      }
      break;
      
    case 'time':
      const quickFilters = {
        'all_time': { desc: 'من البداية', sub: 'كل العمليات المسجلة' },
        'today': { desc: 'اليوم', sub: new Date().toLocaleDateString('ar') },
        'last_7_days': { desc: 'آخر 7 أيام', sub: 'آخر أسبوع' },
        'last_30_days': { desc: 'آخر 30 يوم', sub: 'آخر شهر' },
        'this_month': { desc: 'هذا الشهر', sub: 'الشهر الحالي' },
        'last_month': { desc: 'الشهر السابق', sub: 'الشهر الماضي' }
      };
      
      if (quickFilters[filterId]) {
        filter.description = quickFilters[filterId].desc;
        filter.subtitle = quickFilters[filterId].sub;
      }
      break;
  }
  
  // حفظ الفلترة
  if (window.storeFilter) {
    window.storeFilter.setActiveStoreFilter(storeId, filter);
  }
  
  // إغلاق القائمة
  document.getElementById(`filterDropdown_${storeId}`).style.display = 'none';
  
  // إخفاء التاريخ المخصص إذا كان مفتوحاً
  const customDateSection = document.getElementById(`customDateSection_${storeId}`);
  if (customDateSection) {
    customDateSection.style.display = 'none';
  }
  
  // تحديث الزر
  updateFilterButton(storeId, filter);
  
  // تحديث العرض
  updateStoreDetailsWithFilter(storeId);
}

// عرض التاريخ المخصص
function showCustomDateFilter(storeId) {
  document.getElementById(`filterDropdown_${storeId}`).style.display = 'none';
  document.getElementById(`customDateSection_${storeId}`).style.display = 'block';
}

// تطبيق التاريخ المخصص
function applyCustomDateFilter(storeId) {
  const startDate = document.getElementById(`customStartDate_${storeId}`).value;
  const endDate = document.getElementById(`customEndDate_${storeId}`).value;
  
  if (!startDate || !endDate) {
    showNotification('يرجى تحديد تاريخ البداية والنهاية', 'error');
    return;
  }
  
  const filter = {
    type: 'custom',
    id: 'custom_range',
    data: {
      startDate: startDate,
      endDate: endDate,
      includeTypes: getActiveFilterTypes(storeId)
    },
    description: 'فترة مخصصة',
    subtitle: `${new Date(startDate).toLocaleDateString('ar')} - ${new Date(endDate).toLocaleDateString('ar')}`
  };
  
  // حفظ الفلترة
  if (window.storeFilter) {
    window.storeFilter.setActiveStoreFilter(storeId, filter);
  }
  
  // إخفاء حقول التاريخ
  document.getElementById(`customDateSection_${storeId}`).style.display = 'none';
  
  // تحديث الزر
  updateFilterButton(storeId, filter);
  
  // تحديث العرض
  updateStoreDetailsWithFilter(storeId);
}

// تبديل نوع الفلترة (مبيعات/تسديدات)
function toggleFilterType(storeId, type) {
  // تحديث الأزرار
  document.querySelectorAll(`#filterAll_${storeId}, #filterSales_${storeId}, #filterPayments_${storeId}`)
    .forEach(btn => btn.classList.remove('active'));
  
  if (type === 'all') {
    document.getElementById(`filterAll_${storeId}`).classList.add('active');
  } else if (type === 'sales') {
    document.getElementById(`filterSales_${storeId}`).classList.add('active');
  } else if (type === 'payments') {
    document.getElementById(`filterPayments_${storeId}`).classList.add('active');
  }
  
  // تحديث الفلترة الحالية مع النوع الجديد
  if (window.storeFilter) {
    const currentFilter = window.storeFilter.getActiveStoreFilter(storeId);
    if (currentFilter) {
      // تحديث أنواع العمليات المضمنة
      if (type === 'all') {
        currentFilter.data.includeTypes = ['sales', 'payments'];
      } else if (type === 'sales') {
        currentFilter.data.includeTypes = ['sales'];
      } else if (type === 'payments') {
        currentFilter.data.includeTypes = ['payments'];
      }
      window.storeFilter.setActiveStoreFilter(storeId, currentFilter);
    }
  }
  
  // تحديث العرض
  updateStoreDetailsWithFilter(storeId);
}

// الحصول على أنواع الفلترة النشطة
function getActiveFilterTypes(storeId) {
  const types = [];
  
  if (document.getElementById(`filterAll_${storeId}`).classList.contains('active')) {
    types.push('sales', 'payments');
  } else {
    if (document.getElementById(`filterSales_${storeId}`).classList.contains('active')) {
      types.push('sales');
    }
    if (document.getElementById(`filterPayments_${storeId}`).classList.contains('active')) {
      types.push('payments');
    }
  }
  
  return types;
}

// تحديث زر الفلترة
function updateFilterButton(storeId, filter) {
  const btn = document.querySelector(`#filterDropdown_${storeId}`).previousElementSibling;
  const titleEl = btn.querySelector('.filter-title');
  const subtitleEl = btn.querySelector('.filter-subtitle');
  const iconEl = btn.querySelector('.filter-icon');
  
  // تحديث النص
  titleEl.textContent = filter.description;
  subtitleEl.textContent = filter.subtitle;
  
  // تحديث الأيقونة
  iconEl.className = 'filter-icon fas ';
  if (filter.type === 'cycle') {
    iconEl.className += 'fa-sync-alt';
  } else if (filter.type === 'time') {
    iconEl.className += 'fa-calendar';
  } else if (filter.type === 'custom') {
    iconEl.className += 'fa-calendar-plus';
  }
  
  // تحديث الخيار النشط في القائمة
  document.querySelectorAll(`#filterDropdown_${storeId} .filter-option`).forEach(opt => {
    opt.classList.remove('active');
  });
}

// تحديث عرض تفاصيل المحل مع الفلترة
function updateStoreDetailsWithFilter(storeId) {
  try {
    if (!window.storeFilter) {
      console.error('محرك الفلترة غير متوفر');
      return;
    }
    
    // الحصول على البيانات المفلترة
    const filteredData = window.storeFilter.applyStoreFilter(storeId);
    const filter = filteredData.filter;
    
    // تحديث ملخص الفلترة
    updateFilterSummary(storeId, filteredData);
    
    // تطبيق الترتيب الذكي
    const allTransactions = [
      ...filteredData.sales.map(s => ({ ...s, type: 'sale', amount: -s.total })),
      ...filteredData.payments.map(p => ({ ...p, type: 'payment', amount: p.amount }))
    ];
    
    // حساب الرصيد السابق
    const previousBalance = calculatePreviousBalance(storeId, filter);
    
    // ترتيب العمليات
    const orderedTransactions = window.storeFilter.applySmartOrdering(allTransactions, previousBalance);
    
    // تحديث الجداول
    updateSalesTable(storeId, orderedTransactions.filter(t => t.type === 'sale'));
    updatePaymentsTable(storeId, orderedTransactions.filter(t => t.type === 'payment'));
    
    // تحديث العرض الزمني إذا كان نشطاً
    const timelineView = document.getElementById(`timelineViewContent_${storeId}`);
    if (timelineView && timelineView.style.display !== 'none') {
      updateTimelineView(storeId);
    }
  } catch (error) {
    console.error('خطأ في updateStoreDetailsWithFilter:', error);
    console.error('تفاصيل الخطأ:', error.stack);
  }
}

// تحديث ملخص الفلترة
function updateFilterSummary(storeId, filteredData) {
  const summaryEl = document.getElementById(`filterSummary_${storeId}`);
  
  // حساب الإحصائيات
  const totalSales = filteredData.sales.reduce((sum, s) => sum + s.total, 0);
  const totalPayments = filteredData.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalSales - totalPayments;
  const transactionCount = filteredData.sales.length + filteredData.payments.length;
  
  // عرض الملخص
  summaryEl.innerHTML = `
    <div class="filter-summary-title">
      <i class="fas fa-chart-line me-2"></i>
      ${filteredData.filter.description}
      <small class="ms-2 opacity-75">${filteredData.filter.subtitle}</small>
    </div>
    <div class="filter-summary-stats">
      <div class="filter-summary-stat">
        <div class="value">${formatNumber(totalSales)}</div>
        <div class="label">إجمالي المبيعات</div>
      </div>
      <div class="filter-summary-stat">
        <div class="value">${formatNumber(totalPayments)}</div>
        <div class="label">إجمالي التسديدات</div>
      </div>
      <div class="filter-summary-stat">
        <div class="value">${formatNumber(Math.abs(balance))}</div>
        <div class="label">الرصيد ${balance >= 0 ? 'الدائن' : 'المدين'}</div>
      </div>
      <div class="filter-summary-stat">
        <div class="value">${transactionCount}</div>
        <div class="label">عدد العمليات</div>
      </div>
    </div>
  `;
  
  summaryEl.classList.add('show');
}

// حساب الرصيد السابق للفترة
function calculatePreviousBalance(storeId, filter) {
  // TODO: حساب الرصيد قبل بداية الفترة المحددة
  return 0;
}

// تحديث جدول المبيعات
function updateSalesTable(storeId, sales) {
  const tbody = document.getElementById('storeSalesTable');
  tbody.innerHTML = '';
  
  sales.forEach(sale => {
    // الحصول على اسم الباقة
    let packageName = 'غير محدد';
    if (sale.packageId === 'custom') {
      packageName = sale.reason || 'مبلغ مخصص';
    } else if (sale.packageId && data.packages) {
      const pkg = data.packages.find(p => p.id === sale.packageId);
      packageName = pkg ? pkg.name : 'باقة محذوفة';
    }
    
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${formatDateEn(sale.date)}</td>
      <td>${packageName}</td>
      <td>${sale.quantity > 0 ? sale.quantity : formatNumber(sale.amount)}</td>
      <td class="currency">${formatNumber(sale.total)}</td>
      <td>
        <button class="btn btn-sm btn-warning" onclick="editSale('${sale.id}')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteSale('${sale.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
  });
}

// تحديث جدول التسديدات
function updatePaymentsTable(storeId, payments) {
  const tbody = document.getElementById('storePaymentsTable');
  tbody.innerHTML = '';
  
  payments.forEach(payment => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${formatDateEn(payment.date)}</td>
      <td class="currency">${formatNumber(payment.amount)}</td>
      <td>${payment.notes || '-'}</td>
      <td>
        <button class="btn btn-sm btn-warning" onclick="editPayment('${payment.id}')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deletePayment('${payment.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
  });
}

// تبديل نوع العرض (جدولي/زمني)
function switchView(storeId, viewType) {
  const tableView = document.getElementById(`tableViewContent_${storeId}`);
  const timelineView = document.getElementById(`timelineViewContent_${storeId}`);
  const tableBtn = document.getElementById(`tableView_${storeId}`);
  const timelineBtn = document.getElementById(`timelineView_${storeId}`);
  
  if (viewType === 'timeline') {
    tableView.style.display = 'none';
    timelineView.style.display = 'block';
    tableBtn.classList.remove('active');
    timelineBtn.classList.add('active');
    
    // تحديث العرض الزمني
    updateTimelineView(storeId);
  } else {
    tableView.style.display = 'block';
    timelineView.style.display = 'none';
    tableBtn.classList.add('active');
    timelineBtn.classList.remove('active');
  }
}

// تحديث العرض الزمني (كشف حساب متحرك)
function updateTimelineView(storeId) {
  const container = document.getElementById(`timelineContainer_${storeId}`);
  
  if (!window.storeFilter) {
    container.innerHTML = '<p class="text-center text-muted">محرك الفلترة غير متوفر</p>';
    return;
  }
  
  // الحصول على البيانات المفلترة
  const filteredData = window.storeFilter.applyStoreFilter(storeId);
  const store = data.stores.find(s => s.id === storeId);
  
  // دمج وترتيب العمليات
  const allTransactions = [
    ...filteredData.sales.map(s => ({ 
      ...s, 
      type: 'sale',
      displayAmount: s.total,
      impact: -s.total 
    })),
    ...filteredData.payments.map(p => ({ 
      ...p, 
      type: 'payment',
      displayAmount: p.amount,
      impact: p.amount 
    }))
  ];
  
  // حساب الرصيد السابق
  const previousBalance = calculatePreviousBalance(storeId, filteredData.filter);
  
  // ترتيب ذكي
  const orderedTransactions = window.storeFilter.applySmartOrdering(allTransactions, previousBalance);
  
  // بناء كشف الحساب المتحرك
  let html = `
    <div class="account-statement-container">
      <div class="table-responsive">
        <table class="table table-bordered table-striped account-statement-table">
          <thead class="table-dark">
            <tr>
              <th width="5%">#</th>
              <th width="12%">التاريخ</th>
              <th width="30%">البيان</th>
              <th width="13%">مدين</th>
              <th width="13%">دائن</th>
              <th width="14%">الرصيد</th>
              <th width="13%">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  let runningBalance = previousBalance;
  let rowNumber = 1;
  let currentDate = '';
  let dateSequence = 1;
  
  // إضافة الرصيد الافتتاحي إذا كان هناك رصيد سابق
  if (previousBalance !== 0) {
    html += `
      <tr class="opening-balance-row">
        <td class="text-center">${rowNumber++}</td>
        <td>-</td>
        <td><strong>رصيد سابق</strong></td>
        <td class="text-center">-</td>
        <td class="text-center">-</td>
        <td class="text-center ${previousBalance >= 0 ? 'text-success' : 'text-danger'}">
          <strong>${formatNumber(Math.abs(previousBalance))}</strong>
          <small class="d-block">${previousBalance >= 0 ? 'دائن' : 'مدين'}</small>
        </td>
        <td>-</td>
      </tr>
    `;
  }
  
  // معالجة العمليات
  orderedTransactions.forEach((transaction, index) => {
    const transDate = formatDateEn(transaction.date);
    
    // إضافة رأس التاريخ إذا تغير
    if (transDate !== currentDate) {
      currentDate = transDate;
      dateSequence = 1;
      html += `
        <tr class="date-header-row">
          <td colspan="7" class="text-center table-secondary">
            <strong>${transDate}</strong>
          </td>
        </tr>
      `;
    }
    
    // حساب الرصيد الجديد
    runningBalance += transaction.impact;
    
    const isSale = transaction.type === 'sale';
    const rowClass = isSale ? 'sale-row' : 'payment-row';
    
    // بناء البيان
    let description = '';
    if (isSale) {
      description = transaction.reason || getPackageDisplayName(transaction.packageId);
      if (transaction.quantity > 0) {
        description += ` <span class="badge bg-secondary">${transaction.quantity} كرت</span>`;
      }
    } else {
      description = 'تسديد نقدي';
      if (transaction.notes) {
        description += ` - ${transaction.notes}`;
      }
    }
    
    html += `
      <tr class="${rowClass}">
        <td class="text-center">${rowNumber++}</td>
        <td>
          ${transDate}
          <small class="text-muted d-block">(${dateSequence++})</small>
        </td>
        <td>
          ${isSale ? '<i class="fas fa-shopping-cart text-danger me-2"></i>' : '<i class="fas fa-money-bill-wave text-success me-2"></i>'}
          ${description}
        </td>
        <td class="text-center text-danger">
          ${isSale ? formatNumber(transaction.displayAmount) : '-'}
        </td>
        <td class="text-center text-success">
          ${!isSale ? formatNumber(transaction.displayAmount) : '-'}
        </td>
        <td class="text-center ${runningBalance >= 0 ? 'text-success' : 'text-danger'}">
          <strong>${formatNumber(Math.abs(runningBalance))}</strong>
          <small class="d-block">${runningBalance >= 0 ? 'دائن' : 'مدين'}</small>
        </td>
        <td class="text-center">
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-warning" onclick="edit${isSale ? 'Sale' : 'Payment'}('${transaction.id}')" title="تعديل">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger" onclick="delete${isSale ? 'Sale' : 'Payment'}('${transaction.id}')" title="حذف">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  
  // إضافة صف الإجمالي النهائي
  if (orderedTransactions.length > 0) {
    const totalSales = orderedTransactions.filter(t => t.type === 'sale').reduce((sum, t) => sum + t.displayAmount, 0);
    const totalPayments = orderedTransactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.displayAmount, 0);
    
    html += `
      <tr class="table-dark total-row">
        <td colspan="3" class="text-end"><strong>الإجمالي</strong></td>
        <td class="text-center text-danger"><strong>${formatNumber(totalSales)}</strong></td>
        <td class="text-center text-success"><strong>${formatNumber(totalPayments)}</strong></td>
        <td class="text-center ${runningBalance >= 0 ? 'text-success' : 'text-danger'}">
          <strong>${formatNumber(Math.abs(runningBalance))}</strong>
          <small class="d-block">${runningBalance >= 0 ? 'دائن' : 'مدين'}</small>
        </td>
        <td>-</td>
      </tr>
    `;
  }
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  // إضافة رسالة إذا لم توجد عمليات
  if (orderedTransactions.length === 0) {
    html = `
      <div class="text-center py-5">
        <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
        <p class="text-muted">لا توجد عمليات في الفترة المحددة</p>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// الحصول على اسم الباقة للعرض
function getPackageDisplayName(packageId) {
  if (!packageId) return 'غير محدد';
  if (packageId === 'custom') return 'مبلغ مخصص';
  
  const pkg = data.packages?.find(p => p.id === packageId);
  return pkg ? pkg.name : 'باقة محذوفة';
}

// استخراج الوقت من التاريخ
function formatTime(dateStr) {
  // يمكن إضافة منطق لاستخراج الوقت إذا كان متوفراً
  return '';
}

// تصدير الدوال إلى النطاق العام للاستخدام من HTML
window.toggleFilterDropdown = toggleFilterDropdown;
window.applyFilter = applyFilter;
window.showCustomDateFilter = showCustomDateFilter;
window.applyCustomDateFilter = applyCustomDateFilter;
window.toggleFilterType = toggleFilterType;
window.switchView = switchView;