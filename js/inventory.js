/**
 * ملف inventory.js - نظام إدارة المخزون
 * يتعامل مع إضافة، تعديل، حذف، وعرض المخزون
 * يدعم خصم وإضافة الكميات بشكل آمن
 * يتكامل مع نظام المبيعات لتتبع الكميات
 * 
 * المشاكل المحتملة:
 * - متغير today غير معرف في عدة أماكن
 * - لا يوجد تتبع لتاريخ حركة المخزون
 * - خصم المخزون لا يسجل من قام بالعملية
 * - التحذير عند انخفاض المخزون ثابت عند 200 كرت
 * - لا يوجد آلية لجرد المخزون أو التعامل مع الفروقات
 */

// إدارة المخزون

/**
 * حساب إجمالي المخزون لباقة محددة
 * يجمع كميات جميع عناصر المخزون لنفس الباقة
 * @param {string} packageId - معرف الباقة
 * @returns {number} إجمالي الكمية المتوفرة
 */
function getTotalInventoryForPackage(packageId) {
  return data.inventory
    .filter(item => item.packageId === packageId)
    .reduce((sum, item) => sum + (item.quantity || 0), 0);
}

/**
 * خصم كمية من المخزون
 * يتحقق من توفر الكمية المطلوبة قبل الخصم
 * يخصم من عدة عناصر مخزون إذا لزم الأمر (يبدأ بالأقدم)
 * @param {string} packageId - معرف الباقة
 * @param {number} quantity - الكمية المطلوب خصمها
 * @returns {boolean} true إذا تم الخصم بنجاح، false إذا لم تكن الكمية متوفرة
 */
function deductFromInventory(packageId, quantity) {
  const totalAvailable = getTotalInventoryForPackage(packageId);
  if (totalAvailable < quantity) return false;
  let remaining = quantity;
  for (const item of data.inventory) {
    if (item.packageId !== packageId) continue;
    const available = item.quantity || 0; if (available <= 0) continue;
    const toDeduct = Math.min(available, remaining);
    item.quantity = available - toDeduct;
    remaining -= toDeduct;
    if (remaining === 0) break;
  }
  return true;
}

/**
 * إضافة كمية إلى المخزون
 * يضيف إلى عنصر موجود أو ينشئ عنصر جديد إذا لزم الأمر
 * @param {string} packageId - معرف الباقة
 * @param {number} quantity - الكمية المطلوب إضافتها
 */
function addToInventory(packageId, quantity) {
  const existing = data.inventory.find(i => i.packageId === packageId);
  if (existing) { existing.quantity = (existing.quantity || 0) + quantity; }
  else { data.inventory.push({ id: 'inv_' + Date.now(), packageId, quantity, createdAt: getTodayDate() }); }
}

/**
 * التحقق من انخفاض مخزون باقة محددة
 * يعرض تحذيراً إذا كان المخزون أقل من 200 كرت
 * @param {string} packageId - معرف الباقة المراد فحصها
 */
function checkLowStockForPackage(packageId) {
  const total = getTotalInventoryForPackage(packageId);
  if (total < 200) {
    const pkg = data.packages.find(p => p.id === packageId);
    const name = pkg ? pkg.name : packageId;
    showNotification(`تحذير: مخزون الباقة "${name}" أقل من 200 كرت`, 'error');
  }
}

/**
 * عرض جدول المخزون
 * يعرض جميع عناصر المخزون مع الكميات والقيم
 * يحسب قيمة المخزون بناءً على أنواع الأسعار المختلفة
 * يستخدم الطريقة الآمنة لعرض البيانات إذا كانت متاحة
 * يضيف أزرار التحكم (تعديل، حذف) لكل عنصر
 */
function renderInventoryTable() {
  const table = document.getElementById('inventoryTable');
  if (!table) return; 
  
  // إفراغ الجدول بأمان
  if (window.$safe && window.$safe.clear) {
    window.$safe.clear(table);
  } else {
    table.innerHTML = '';
  }
  
  data.inventory.forEach(item => {
    const pkg = data.packages.find(p => p.id === item.packageId); 
    if (!pkg) return;
    
    const retailValue = item.quantity * (pkg.retailPrice || 0);
    const wholesaleValue = item.quantity * (pkg.wholesalePrice || 0);
    const distributorValue = item.quantity * (pkg.distributorPrice || 0);
    
    if (window.$safe && window.$safe.row) {
      // استخدام الطريقة الآمنة
      const row = window.$safe.row([
        pkg.name,
        formatNumber(item.quantity),
        {text: formatNumber(retailValue), className: 'currency'},
        {text: formatNumber(wholesaleValue), className: 'currency'},
        {text: formatNumber(distributorValue), className: 'currency'},
        item.createdAt
      ], [
        {
          className: 'btn btn-sm btn-warning edit-inventory',
          icon: 'fas fa-edit',
          dataId: item.id,
          onClick: () => editInventory(item.id)
        },
        {
          className: 'btn btn-sm btn-danger delete-inventory',
          icon: 'fas fa-trash',
          dataId: item.id,
          onClick: () => deleteInventory(item.id)
        }
      ]);
      table.appendChild(row);
    } else {
      // الطريقة التقليدية مع التعقيم
      const row = document.createElement('tr');
      
      // إضافة الخلايا
      const cells = [
        pkg.name,
        formatNumber(item.quantity),
        formatNumber(retailValue),
        formatNumber(wholesaleValue),
        formatNumber(distributorValue),
        item.createdAt
      ];
      
      cells.forEach((content, index) => {
        const td = document.createElement('td');
        td.textContent = content;
        if (index >= 2 && index <= 4) td.className = 'currency';
        row.appendChild(td);
      });
      
      // خلية الأزرار
      const actionTd = document.createElement('td');
      actionTd.className = 'action-buttons';
      
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-sm btn-warning edit-inventory';
      editBtn.dataset.id = item.id;
      editBtn.innerHTML = '<i class="fas fa-edit"></i>';
      editBtn.addEventListener('click', () => editInventory(item.id));
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-sm btn-danger delete-inventory';
      deleteBtn.dataset.id = item.id;
      deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
      deleteBtn.addEventListener('click', () => deleteInventory(item.id));
      
      actionTd.appendChild(editBtn);
      actionTd.appendChild(deleteBtn);
      row.appendChild(actionTd);
      table.appendChild(row);
    }
  });
}

/**
 * فتح نموذج إضافة كمية جديدة للمخزون
 * يملأ قائمة الباقات من البيانات المتاحة
 * يعيد تعيين جميع حقول النموذج إلى قيمها الافتراضية
 */
function addInventory() {
  const select = document.getElementById('inventoryPackage'); if (!select) return;
  select.innerHTML = '';
  data.packages.forEach(pkg => { const option = document.createElement('option'); option.value = pkg.id; option.textContent = pkg.name; select.appendChild(option); });
  document.getElementById('inventoryModalTitle').textContent = 'إضافة كمية جديدة';
  document.getElementById('inventoryId').value = '';
  document.getElementById('inventoryQuantity').value = '';
  document.getElementById('inventoryDate').value = getTodayDate();
  const modal = new bootstrap.Modal(document.getElementById('inventoryModal')); modal.show();
}

/**
 * فتح نموذج تعديل عنصر مخزون موجود
 * يملأ النموذج بالبيانات الحالية للعنصر
 * @param {string} id - معرف عنصر المخزون المراد تعديله
 */
function editInventory(id) {
  const item = data.inventory.find(i => i.id === id); if (!item) return;
  const select = document.getElementById('inventoryPackage'); if (!select) return;
  select.innerHTML = '';
  data.packages.forEach(pkg => { const option = document.createElement('option'); option.value = pkg.id; option.textContent = pkg.name; option.selected = pkg.id === item.packageId; select.appendChild(option); });
  document.getElementById('inventoryModalTitle').textContent = 'تعديل الكمية';
  document.getElementById('inventoryId').value = item.id;
  document.getElementById('inventoryQuantity').value = formatNumber(item.quantity);
  document.getElementById('inventoryDate').value = item.createdAt || getTodayDate();
  const modal = new bootstrap.Modal(document.getElementById('inventoryModal')); modal.show();
}

/**
 * حذف عنصر من المخزون
 * يطلب تأكيد من المستخدم قبل الحذف
 * ينقل العنصر المحذوف إلى سلة المحذوفات إذا كانت متاحة
 * @param {string} id - معرف عنصر المخزون المراد حذفه
 */
function deleteInventory(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الكمية؟')) return;
  const inv = data.inventory.find(i => i.id === id);
  data.inventory = data.inventory.filter(i => i.id !== id);
  saveData();
  (async()=>{ try{ if (inv && typeof addToTrash==='function') await addToTrash('inventory', inv); }catch{}; refreshCurrentView(); })();
  showNotification('تم حذف الكمية بنجاح', 'success');
}

/**
 * حفظ بيانات المخزون (إضافة جديد أو تحديث موجود)
 * يتحقق من صحة البيانات المدخلة (الباقة، الكمية)
 * ينشئ معرف فريد للعناصر الجديدة
 * يحدث جدول المخزون ولوحة المعلومات
 */
function saveInventory() {
  const id = document.getElementById('inventoryId').value;
  const packageId = document.getElementById('inventoryPackage').value;
  const quantity = parseFormattedNumber(document.getElementById('inventoryQuantity').value);
  const date = document.getElementById('inventoryDate').value ? formatDateEn(document.getElementById('inventoryDate').value) : getTodayDate();
  if (!packageId || isNaN(quantity) || quantity <= 0) { showNotification('يرجى ملء جميع الحقول المطلوبة', 'error'); return; }
  if (id) {
    const item = data.inventory.find(i => i.id === id);
    if (item) { item.packageId = packageId; item.quantity = quantity; item.createdAt = date; }
    showNotification('تم تحديث الكمية بنجاح', 'success');
  } else {
    const newId = 'inv_' + Date.now();
    data.inventory.push({ id: newId, packageId, quantity, createdAt: date });
    showNotification('تم إضافة الكمية بنجاح', 'success');
  }
  saveData();
  refreshCurrentView(); // تحديث جميع العروض المرئية
  const modal = bootstrap.Modal.getInstance(document.getElementById('inventoryModal')); modal.hide();
}