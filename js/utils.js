/**
 * ملف utils.js - دوال مساعدة عامة للتطبيق
 * يحتوي على دوال تحويل الأرقام، تنسيق التاريخ، عرض الإشعارات، والتنقل بين الأقسام
 * 
 * المشاكل المحتملة:
 * - دالة formatDateEn قد لا تتعامل مع جميع صيغ التاريخ بشكل صحيح
 * - setupFormattedInputs معقدة وقد تحتوي على أخطاء في موضع المؤشر
 * - لا يوجد معالجة للأخطاء في بعض الدوال
 * - التبديل بين الأقسام لا يحفظ الحالة أو التاريخ
 */

// رقمية: تحويل الأرقام العربية/الفارسية إلى إنجليزية

/**
 * تحويل الأرقام العربية والفارسية إلى أرقام إنجليزية
 * يتعامل مع الأرقام العربية (٠-٩) والفارسية (۰-۹)
 * @param {*} input - المدخل الذي قد يحتوي على أرقام عربية/فارسية
 * @returns {string} النص بأرقام إنجليزية
 */
function toEnglishDigits(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));
}

/**
 * تنسيق الأرقام بفواصل إنجليزية
 * يحول الأرقام إلى إنجليزية أولاً ثم يضيف الفواصل
 * @param {*} num - الرقم المراد تنسيقه
 * @returns {string} الرقم منسق بفواصل إنجليزية
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '';
  const n = Number(toEnglishDigits(num)) || 0;
  return n.toLocaleString('en-US');
}

/**
 * تحليل الأرقام المنسقة مع دعم الأرقام العربية
 * يحول الأرقام إلى إنجليزية ويزيل الفواصل
 * @param {string} str - النص المحتوي على رقم منسق
 * @returns {number} الرقم العشري
 */
function parseFormattedNumber(str) {
  if (!str) return 0;
  const eng = toEnglishDigits(str);
  return parseFloat(eng.replace(/,/g, '')) || 0;
}

/**
 * تنسيق التاريخ إلى صيغة YYYY-MM-DD بأرقام إنجليزية
 * يحول الأرقام إلى إنجليزية ويستخدم moment.js إذا كان متاحاً
 * يدعم عدة صيغ للتاريخ المدخل
 * @param {string} dateStr - نص التاريخ
 * @returns {string} التاريخ بصيغة YYYY-MM-DD
 */
function formatDateEn(dateStr) {
  if (!dateStr) return '';
  
  // تحويل الأرقام العربية إلى إنجليزية
  const englishDate = toEnglishDigits(dateStr);
  
  try {
    if (typeof moment !== 'undefined') {
      // جرب صيغ مختلفة للتاريخ
      const formats = [
        'YYYY-MM-DD',
        'YYYY-M-D',
        'DD/MM/YYYY',
        'D/M/YYYY',
        'DD-MM-YYYY',
        'D-M-YYYY',
        moment.ISO_8601
      ];
      
      const m = moment(englishDate, formats, true);
      if (m.isValid()) {
        return m.format('YYYY-MM-DD');
      }
    }
  } catch (_) {}
  
  // إذا فشل moment.js، حاول التحليل اليدوي
  // التحقق من الصيغ المختلفة
  const patterns = {
    'YYYY-MM-DD': /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    'DD/MM/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    'DD-MM-YYYY': /^(\d{1,2})-(\d{1,2})-(\d{4})$/
  };
  
  for (const [format, pattern] of Object.entries(patterns)) {
    const match = englishDate.match(pattern);
    if (match) {
      if (format === 'YYYY-MM-DD') {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      } else {
        // DD/MM/YYYY أو DD-MM-YYYY
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      }
    }
  }
  
  // إذا لم تتطابق أي صيغة، حاول تنظيف بسيط
  const cleanDate = englishDate.replace(/\D/g, '');
  if (cleanDate.length === 8) {
    // افترض DDMMYYYY
    return `${cleanDate.substr(4, 4)}-${cleanDate.substr(2, 2)}-${cleanDate.substr(0, 2)}`;
  }
  
  return englishDate;
}

/**
 * إعداد حقول الإدخال المنسقة
 * يضيف مستمعي الأحداث لتنسيق الأرقام أثناء الكتابة
 * يحول الأرقام العربية إلى إنجليزية ويضيف الفواصل
 * يحافظ على موضع المؤشر أثناء التنسيق
 * يدعم الأرقام السالبة والكسور العشرية
 */
function setupFormattedInputs() {
  document.querySelectorAll('.formatted-input').forEach(input => {
    input.addEventListener('focus', function () {
      this.value = toEnglishDigits(this.value).replace(/,/g, '');
    });

    input.addEventListener('input', function () {
      const original = this.value;
      const caret = this.selectionStart || 0;
      let plain = toEnglishDigits(original);
      const isNegative = /^-/.test(plain);
      plain = plain.replace(/[^0-9.]/g, '');
      const parts = plain.split('.');
      if (parts.length > 2) {
        plain = parts[0] + '.' + parts.slice(1).join('');
      }
      const leftText = toEnglishDigits(original.slice(0, caret));
      const leftDigitsCount = (leftText.match(/[0-9]/g) || []).length;
      let numberPart = parts[0];
      numberPart = numberPart.replace(/^0+(\d)/, '$1');
      const formattedInt = Number(numberPart || 0).toLocaleString('en-US');
      const decimalPart = parts.length > 1 ? '.' + parts[1] : '';
      const formatted = (isNegative ? '-' : '') + formattedInt + decimalPart;
      if (formatted !== this.value) this.value = formatted;
      let newCaret = 0, seenDigits = 0;
      const val = this.value;
      for (let i = 0; i < val.length; i++) {
        if (/[0-9]/.test(val[i])) {
          seenDigits++;
          if (seenDigits >= leftDigitsCount) { newCaret = i + 1; break; }
        } else if (val[i] === '.' && leftText.includes('.')) {
          const leftDotIndex = leftText.indexOf('.');
          const digitsBeforeDot = (leftText.slice(0, leftDotIndex).match(/[0-9]/g) || []).length;
          if (leftDigitsCount === digitsBeforeDot) { newCaret = i + 1; break; }
        }
      }
      if (!newCaret) newCaret = this.value.length;
      this.setSelectionRange(newCaret, newCaret);
    });

    input.addEventListener('blur', function () {
      const num = parseFormattedNumber(this.value);
      this.value = num ? formatNumber(num) : '';
    });
  });
}

/**
 * عرض إشعار في أسفل الصفحة
 * يعرض رسالة مؤقتة للمستخدم بنوع محدد
 * يختفي الإشعار بعد 3 ثواني
 * @param {string} message - نص الرسالة
 * @param {string} type - نوع الإشعار (success, error, warning, info)
 */
function showNotification(message, type) {
  const notification = document.getElementById('notification');
  const notificationText = document.getElementById('notificationText');
  if (!notification || !notificationText) return;
  notificationText.textContent = message;
  notification.className = `notification ${type} show`;
  setTimeout(() => { notification.className = 'notification'; }, 3000);
}

/**
 * التنقل بين أقسام التطبيق
 * يعرض القسم المطلوب ويخفي البقية
 * يحدث الرابط النشط في الشريط الجانبي
 * يحدث عنوان الصفحة
 * يستدعي دوال تحديث خاصة لبعض الأقسام
 * @param {string} targetSection - معرف القسم المراد عرضه
 * @param {string} labelText - عنوان الصفحة (اختياري)
 */
function switchSection(targetSection, labelText) {
  const allLinks = document.querySelectorAll('.sidebar .nav-link, #mobileDrawer .nav-link');
  allLinks.forEach(l => l.classList.remove('active'));
  allLinks.forEach(l => { if (l.getAttribute('data-section') === targetSection) l.classList.add('active'); });
  document.querySelectorAll('.section').forEach(s => { s.style.display = 'none'; s.classList.remove('show'); });
  const sectionEl = document.getElementById(targetSection);
  if (sectionEl) { sectionEl.style.display = 'block'; setTimeout(() => sectionEl.classList.add('show'), 10); }
  const title = labelText || (document.querySelector(`.sidebar .nav-link[data-section="${targetSection}"]`)?.textContent.trim() || '');
  if (title) document.querySelector('.page-title').textContent = title;
  if (targetSection === 'reports') if (typeof generatePartnerReports === 'function') generatePartnerReports();
  if (targetSection === 'trash') if (typeof renderTrashTable === 'function') setTimeout(() => renderTrashTable(), 100);
}

/**
 * ضمان عرض القسم الافتراضي عند تحميل الصفحة
 * يعرض لوحة المعلومات بشكل افتراضي إذا لم يكن هناك قسم مرئي
 */
document.addEventListener('DOMContentLoaded', function () {
  const currentVisible = document.querySelector('.section:not([style*="display: none"])') || document.getElementById('dashboard');
  if (currentVisible && !currentVisible.classList.contains('show')) {
    currentVisible.classList.add('show');
  }
});

/**
 * إعداد حقول التاريخ للعمل باللغة الإنجليزية
 * يضبط اللغة والاتجاه لجميع حقول التاريخ
 * يضيف مستمعين لتنسيق التاريخ عند التغيير
 */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('input[type="date"]').forEach(inp => {
    inp.setAttribute('lang', 'en');
    inp.style.direction = 'ltr';
    inp.placeholder = 'YYYY-MM-DD';
    // لا نحتاج لتطبيع التاريخ هنا لأن حقول date تتعامل مع صيغة YYYY-MM-DD تلقائياً
    // إزالة مستمعي الأحداث التي قد تغير القيمة بشكل غير مرغوب
  });
});

/**
 * نظام القائمة الجانبية للأجهزة المحمولة
 * يدير فتح وإغلاق القائمة الجانبية
 * يعمل مع اللمس والنقر
 * يغلق بزر Escape أو عند تكبير الشاشة
 */
// درج الجوال المخصص (مؤجل حتى اكتمال DOM)
document.addEventListener('DOMContentLoaded', function () {
  const toggleBtn = document.getElementById('mobileSidebarToggle');
  const closeBtn = document.getElementById('drawerClose');

  function openDrawer() {
    const drawer = document.getElementById('mobileDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('show');
    document.body.classList.add('drawer-open');
  }
  function closeDrawer() {
    const drawer = document.getElementById('mobileDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
    document.body.classList.remove('drawer-open');
  }

  if (toggleBtn) ['click', 'touchend'].forEach(ev => toggleBtn.addEventListener(ev, function (e) { e.preventDefault(); openDrawer(); }));

  const backdrop = document.getElementById('drawerBackdrop');
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  const drawer = document.getElementById('mobileDrawer');
  if (drawer) {
    drawer.addEventListener('click', function (e) {
      const link = e.target.closest('a.nav-link');
      if (!link) return;
      closeDrawer();
      const targetSection = link.getAttribute('data-section');
      switchSection(targetSection, link.textContent.trim());
    });
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  window.addEventListener('resize', function () { if (window.innerWidth >= 769) closeDrawer(); });
});

function setTextSafe(el, text){ if (el) el.textContent = text; }

/**
 * الحصول على تاريخ اليوم بصيغة YYYY-MM-DD
 * يستخدم كقيمة افتراضية عندما لا يكون هناك تاريخ محدد
 * @returns {string} التاريخ الحالي بصيغة YYYY-MM-DD
 */
function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * تحديث عرض البيانات في جميع الأقسام المرئية
 * يحدث القوائم والجداول والتقارير بناءً على القسم النشط
 * يستخدم بعد أي عملية تعديل للبيانات لضمان ظهور التغييرات مباشرة
 * آمن للاستخدام - يتحقق من وجود الدوال قبل استدعائها
 */
function refreshCurrentView() {
  // تحديث قائمة المحلات دائماً (قد تكون في الشريط الجانبي)
  if (typeof renderStoresList === 'function') {
    renderStoresList();
  }
  
  // تحديث تفاصيل المحل إذا كانت مفتوحة
  const storeDetailsSection = document.getElementById('storeDetailsSection');
  if (storeDetailsSection && storeDetailsSection.style.display !== 'none') {
    const storeId = document.querySelector('#storeHeader [data-id]')?.dataset.id;
    if (storeId && typeof showStoreDetails === 'function') {
      showStoreDetails(storeId);
    }
  }
  
  // تحديث لوحة المعلومات (دائماً مفيد)
  if (typeof updateDashboard === 'function') {
    updateDashboard();
  }
  
  // تحديث القسم النشط حالياً
  const activeSection = document.querySelector('.section.show');
  if (activeSection) {
    switch(activeSection.id) {
      case 'inventory':
        if (typeof renderInventoryTable === 'function') renderInventoryTable();
        break;
      case 'expenses':
        if (typeof renderExpensesTable === 'function') renderExpensesTable();
        break;
      case 'packages':
        if (typeof renderPackagesTable === 'function') renderPackagesTable();
        break;
      case 'reports':
        if (typeof updateProfitReport === 'function') updateProfitReport();
        if (typeof generateDebtReport === 'function') generateDebtReport();
        if (typeof generatePartnerReports === 'function') generatePartnerReports();
        break;
      case 'trash':
        if (typeof renderTrashTable === 'function') renderTrashTable();
        break;
    }
  }
}

// تصدير الدوال للنطاق العام
if (typeof window !== 'undefined') {
  window.toEnglishDigits = toEnglishDigits;
  window.formatNumber = formatNumber;
  window.parseFormattedNumber = parseFormattedNumber;
  window.formatDateEn = formatDateEn;
  window.showNotification = showNotification;
  window.switchSection = switchSection;
  window.getTodayDate = getTodayDate;
  window.refreshCurrentView = refreshCurrentView;
}