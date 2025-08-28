/**
 * ملف packages.js - نظام إدارة الباقات
 * يتعامل مع إضافة، تعديل، حذف، وعرض الباقات
 * يدعم ثلاثة أنواع من الأسعار: قطاعي، جملة، موزع
 * يتكامل مع نظام المخزون والمبيعات
 * 
 * المشاكل المحتملة:
 * - متغير today غير معرف
 * - لا يوجد تحقق من تكرار أسماء الباقات
 * - لا يمنع حذف الباقات المستخدمة في المخزون أو المبيعات
 * - العرض الافتراضي للجداول الكبيرة يعتمد على window.$dom غير الموجود
 * - معالجة الأخطاء ضعيفة
 */

// إدارة الباقات

/**
 * عرض جدول الباقات
 * يستخدم العرض الافتراضي للجداول الكبيرة (أكثر من 50 عنصر)
 * يستخدم الطريقة الآمنة لعرض البيانات إذا كانت متاحة
 * يعرض اسم الباقة مع أنواع الأسعار الثلاثة (قطاعي، جملة، موزع)
 * يضيف أزرار التحكم (تعديل، حذف) لكل باقة
 * مشكلة: window.$dom غير موجود في التطبيق
 */
function renderPackagesTable() {
  const table = document.getElementById('packagesTable');
  if (!table) return; 
  
  // استخدام التحسينات إذا كانت متاحة
  if (window.$dom && window.$dom.table && data.packages.length > 50) {
    window.$dom.table(data.packages, {
      containerId: 'packagesTable',
      headers: ['اسم الباقة', 'سعر القطاعي', 'سعر الجملة', 'سعر الموزع', 'التاريخ', 'إجراءات'],
      rowRenderer: (pkg) => {
        return window.$safe ? window.$safe.row([
          pkg.name,
          {text: pkg.retailPrice ? formatNumber(pkg.retailPrice) : '-', className: 'currency'},
          {text: pkg.wholesalePrice ? formatNumber(pkg.wholesalePrice) : '-', className: 'currency'},
          {text: pkg.distributorPrice ? formatNumber(pkg.distributorPrice) : '-', className: 'currency'},
          pkg.createdAt
        ], [
          {
            className: 'btn btn-sm btn-warning edit-package',
            icon: 'fas fa-edit',
            dataId: pkg.id,
            onClick: () => editPackage(pkg.id)
          },
          {
            className: 'btn btn-sm btn-danger delete-package',
            icon: 'fas fa-trash',
            dataId: pkg.id,
            onClick: () => deletePackage(pkg.id)
          }
        ]) : null;
      },
      enableVirtualScroll: true
    });
    return;
  }
  
  // إفراغ الجدول بأمان
  if (window.$safe && window.$safe.clear) {
    window.$safe.clear(table);
  } else {
    table.innerHTML = '';
  }
  
  data.packages.forEach(pkg => {
    if (window.$safe && window.$safe.row) {
      // استخدام الطريقة الآمنة
      const row = window.$safe.row([
        pkg.name,
        {text: pkg.retailPrice ? formatNumber(pkg.retailPrice) : '-', className: 'currency'},
        {text: pkg.wholesalePrice ? formatNumber(pkg.wholesalePrice) : '-', className: 'currency'},
        {text: pkg.distributorPrice ? formatNumber(pkg.distributorPrice) : '-', className: 'currency'},
        pkg.createdAt
      ], [
        {
          className: 'btn btn-sm btn-warning edit-package',
          icon: 'fas fa-edit',
          dataId: pkg.id,
          onClick: () => editPackage(pkg.id)
        },
        {
          className: 'btn btn-sm btn-danger delete-package',
          icon: 'fas fa-trash',
          dataId: pkg.id,
          onClick: () => deletePackage(pkg.id)
        }
      ]);
      table.appendChild(row);
    } else {
      // الطريقة التقليدية مع التعقيم
      const row = document.createElement('tr');
      const cells = [
        pkg.name,
        pkg.retailPrice ? formatNumber(pkg.retailPrice) : '-',
        pkg.wholesalePrice ? formatNumber(pkg.wholesalePrice) : '-',
        pkg.distributorPrice ? formatNumber(pkg.distributorPrice) : '-',
        pkg.createdAt
      ];
      
      cells.forEach((content, index) => {
        const td = document.createElement('td');
        td.textContent = content;
        if (index >= 1 && index <= 3) td.className = 'currency';
        row.appendChild(td);
      });
      
      // خلية الأزرار
      const actionTd = document.createElement('td');
      actionTd.className = 'action-buttons';
      
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-sm btn-warning edit-package';
      editBtn.dataset.id = pkg.id;
      editBtn.innerHTML = '<i class="fas fa-edit"></i>';
      editBtn.addEventListener('click', () => editPackage(pkg.id));
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-sm btn-danger delete-package';
      deleteBtn.dataset.id = pkg.id;
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
      deleteBtn.addEventListener('click', () => deletePackage(pkg.id));
      
      actionTd.appendChild(editBtn);
      actionTd.appendChild(deleteBtn);
      row.appendChild(actionTd);
      table.appendChild(row);
    }
  });
}

/**
 * فتح نموذج إضافة باقة جديدة
 * يعيد تعيين جميع حقول النموذج إلى قيمها الافتراضية
 * يضبط التاريخ على اليوم الحالي
 */
function addPackage() {
  document.getElementById('packageModalTitle').textContent = 'إضافة باقة جديدة';
  document.getElementById('packageId').value = '';
  document.getElementById('packageName').value = '';
  document.getElementById('retailPrice').value = '';
  document.getElementById('wholesalePrice').value = '';
  document.getElementById('distributorPrice').value = '';
  document.getElementById('packageDate').value = getTodayDate();
  const modal = new bootstrap.Modal(document.getElementById('packageModal')); modal.show();
}

/**
 * فتح نموذج تعديل باقة موجودة
 * يملأ النموذج بالبيانات الحالية للباقة
 * ينسق الأسعار بالفواصل للعرض
 * @param {string} id - معرف الباقة المراد تعديلها
 */
function editPackage(id) {
  const pkg = data.packages.find(p => p.id === id); if (!pkg) return;
  document.getElementById('packageModalTitle').textContent = 'تعديل الباقة';
  document.getElementById('packageId').value = pkg.id;
  document.getElementById('packageName').value = pkg.name;
  document.getElementById('retailPrice').value = pkg.retailPrice ? formatNumber(pkg.retailPrice) : '';
  document.getElementById('wholesalePrice').value = pkg.wholesalePrice ? formatNumber(pkg.wholesalePrice) : '';
  document.getElementById('distributorPrice').value = pkg.distributorPrice ? formatNumber(pkg.distributorPrice) : '';
  document.getElementById('packageDate').value = pkg.createdAt || getTodayDate();
  const modal = new bootstrap.Modal(document.getElementById('packageModal')); modal.show();
}

/**
 * حذف باقة من النظام
 * يطلب تأكيد من المستخدم قبل الحذف
 * ينقل الباقة المحذوفة إلى سلة المحذوفات
 * يحدث جدول الباقات ولوحة المعلومات
 * @param {string} id - معرف الباقة المراد حذفها
 */
function deletePackage(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الباقة؟')) return;
  const pkg = data.packages.find(p => p.id === id);
  data.packages = data.packages.filter(p => p.id !== id);
  saveData();
  (async()=>{ try{ if (pkg && typeof addToTrash==='function') await addToTrash('packages', pkg); }catch{}; refreshCurrentView(); })();
  showNotification('تم حذف الباقة بنجاح', 'success');
}

/**
 * حفظ بيانات الباقة (إضافة جديدة أو تحديث موجودة)
 * يتحقق من صحة البيانات المدخلة (الاسم مطلوب)
 * يحول الأسعار من النص المنسق إلى أرقام
 * ينشئ معرف فريد للباقات الجديدة
 * يحدث جدول الباقات ولوحة المعلومات
 */
function savePackage() {
  const id = document.getElementById('packageId').value;
  const name = document.getElementById('packageName').value;
  const retailPrice = parseFormattedNumber(document.getElementById('retailPrice').value) || null;
  const wholesalePrice = parseFormattedNumber(document.getElementById('wholesalePrice').value) || null;
  const distributorPrice = parseFormattedNumber(document.getElementById('distributorPrice').value) || null;
  const date = document.getElementById('packageDate').value ? formatDateEn(document.getElementById('packageDate').value) : getTodayDate();
  if (!name) { showNotification('يرجى إدخال اسم الباقة', 'error'); return; }
  if (id) {
    const pkg = data.packages.find(p => p.id === id);
    if (pkg) {
      pkg.name = name; pkg.retailPrice = retailPrice; pkg.wholesalePrice = wholesalePrice; pkg.distributorPrice = distributorPrice; pkg.createdAt = date;
    }
    showNotification('تم تحديث الباقة بنجاح', 'success');
  } else {
    const newId = 'pkg_' + Date.now();
    data.packages.push({ id: newId, name, retailPrice, wholesalePrice, distributorPrice, createdAt: date });
    showNotification('تم إضافة الباقة بنجاح', 'success');
  }
  saveData();
  refreshCurrentView(); // تحديث جميع العروض المرئية
  const modal = bootstrap.Modal.getInstance(document.getElementById('packageModal')); modal.hide();
}