/**
 * محرك الفلترة المتقدم للمحلات
 * يدير الدورات المالية والفلترة الزمنية والترتيب الذكي
 * @module storeFilter
 */

// حالة الفلترة الحالية لكل محل
const storeFilters = {};

/**
 * أنواع الفلترة المتاحة
 */
const FILTER_TYPES = {
  CYCLE: 'cycle',           // دورة مالية
  TIME: 'time',            // فترة زمنية
  CUSTOM: 'custom'         // مخصص
};

/**
 * معرفات الفترات السريعة
 */
const QUICK_FILTERS = {
  CURRENT_CYCLE: 'current_cycle',
  PREVIOUS_CYCLE: 'previous_cycle',
  ALL_TIME: 'all_time',
  TODAY: 'today',
  LAST_7_DAYS: 'last_7_days',
  LAST_30_DAYS: 'last_30_days',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  CUSTOM_RANGE: 'custom_range'
};

/**
 * الحصول على الفلترة النشطة للمحل
 * @param {string} storeId - معرف المحل
 * @returns {Object} كائن الفلترة النشط
 */
function getActiveStoreFilter(storeId) {
  if (!storeFilters[storeId]) {
    // الفلترة الافتراضية: الدورة المالية الحالية
    storeFilters[storeId] = {
      type: FILTER_TYPES.CYCLE,
      id: QUICK_FILTERS.CURRENT_CYCLE,
      data: {
        cycleNumber: 'current',
        includeTypes: ['sales', 'payments']
      },
      description: 'الدورة المالية الحالية',
      subtitle: 'من آخر تصفير حتى الآن'
    };
  }
  return storeFilters[storeId];
}

/**
 * تعيين فلترة جديدة للمحل
 * @param {string} storeId - معرف المحل
 * @param {Object} filter - كائن الفلترة الجديد
 */
function setActiveStoreFilter(storeId, filter) {
  storeFilters[storeId] = filter;
  // حفظ في localStorage للاستمرارية
  try {
    localStorage.setItem(`storeFilter_${storeId}`, JSON.stringify(filter));
  } catch (e) {
    console.warn('تعذر حفظ الفلترة:', e);
  }
}

/**
 * اكتشاف الدورات المالية للمحل
 * الدورة المالية: من آخر رصيد صفر إلى الرصيد الصفر التالي
 * @param {string} storeId - معرف المحل
 * @returns {Array} مصفوفة الدورات المالية
 */
function detectFinancialCycles(storeId) {
  const sales = (data.sales || []).filter(s => s.storeId === storeId);
  const payments = (data.payments || []).filter(p => p.storeId === storeId);
  
  // دمج وترتيب كل العمليات حسب التاريخ
  const allTransactions = [
    ...sales.map(s => ({ ...s, type: 'sale', amount: -s.total })),
    ...payments.map(p => ({ ...p, type: 'payment', amount: p.amount }))
  ].sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    if (!dateA || !dateB) return 0;
    return dateA.valueOf() - dateB.valueOf();
  });
  
  const cycles = [];
  let currentCycle = null;
  let runningBalance = 0;
  
  for (let i = 0; i < allTransactions.length; i++) {
    const transaction = allTransactions[i];
    const prevBalance = runningBalance;
    runningBalance += transaction.amount;
    
    // بداية دورة جديدة
    if (!currentCycle) {
      currentCycle = {
        startDate: transaction.date,
        startIndex: i,
        transactions: [transaction],
        startBalance: 0
      };
    } else {
      currentCycle.transactions.push(transaction);
    }
    
    // نهاية الدورة عند الوصول لرصيد صفر أو سالب ثم موجب
    if (prevBalance <= 0 && runningBalance > 0 && currentCycle.transactions.length > 1) {
      currentCycle.endDate = transaction.date;
      currentCycle.endIndex = i;
      currentCycle.endBalance = runningBalance;
      cycles.push(currentCycle);
      
      // بداية دورة جديدة
      currentCycle = {
        startDate: transaction.date,
        startIndex: i,
        transactions: [],
        startBalance: runningBalance
      };
    }
  }
  
  // الدورة الحالية (غير مكتملة)
  if (currentCycle && currentCycle.transactions.length > 0) {
    currentCycle.endDate = null; // لم تكتمل بعد
    currentCycle.endIndex = allTransactions.length - 1;
    currentCycle.endBalance = runningBalance;
    currentCycle.isCurrent = true;
    cycles.push(currentCycle);
  }
  
  return cycles;
}

/**
 * تطبيق الفلترة على بيانات المحل
 * @param {string} storeId - معرف المحل
 * @param {Object} filter - كائن الفلترة
 * @returns {Object} البيانات المفلترة
 */
function applyStoreFilter(storeId, filter = null) {
  filter = filter || getActiveStoreFilter(storeId);
  
  let filteredSales = [];
  let filteredPayments = [];
  
  const allSales = (data.sales || []).filter(s => s.storeId === storeId);
  const allPayments = (data.payments || []).filter(p => p.storeId === storeId);
  
  switch (filter.type) {
    case FILTER_TYPES.CYCLE:
      const cycles = detectFinancialCycles(storeId);
      let targetCycle = null;
      
      if (filter.data.cycleNumber === 'current') {
        targetCycle = cycles.find(c => c.isCurrent) || cycles[cycles.length - 1];
      } else if (typeof filter.data.cycleNumber === 'number') {
        targetCycle = cycles[cycles.length - 1 - filter.data.cycleNumber];
      }
      
      if (targetCycle) {
        const startDate = parseDate(targetCycle.startDate);
        const endDate = targetCycle.endDate ? parseDate(targetCycle.endDate) : moment();
        
        filteredSales = filterByDateRange(allSales, startDate, endDate);
        filteredPayments = filterByDateRange(allPayments, startDate, endDate);
      }
      break;
      
    case FILTER_TYPES.TIME:
      const { startDate, endDate } = getDateRangeForQuickFilter(filter.id);
      filteredSales = filterByDateRange(allSales, startDate, endDate);
      filteredPayments = filterByDateRange(allPayments, startDate, endDate);
      break;
      
    case FILTER_TYPES.CUSTOM:
      const customStart = parseDate(filter.data.startDate);
      const customEnd = parseDate(filter.data.endDate);
      filteredSales = filterByDateRange(allSales, customStart, customEnd);
      filteredPayments = filterByDateRange(allPayments, customStart, customEnd);
      break;
  }
  
  // تطبيق فلتر النوع
  if (filter.data.includeTypes && filter.data.includeTypes.length > 0) {
    if (!filter.data.includeTypes.includes('sales')) {
      filteredSales = [];
    }
    if (!filter.data.includeTypes.includes('payments')) {
      filteredPayments = [];
    }
  }
  
  return {
    sales: filteredSales,
    payments: filteredPayments,
    filter: filter
  };
}

/**
 * فلترة حسب نطاق التاريخ
 * @param {Array} items - العناصر للفلترة
 * @param {moment} startDate - تاريخ البداية
 * @param {moment} endDate - تاريخ النهاية
 * @returns {Array} العناصر المفلترة
 */
function filterByDateRange(items, startDate, endDate) {
  return items.filter(item => {
    const itemDate = parseDate(item.date);
    if (!itemDate) return false;
    
    if (startDate && itemDate.isBefore(startDate, 'day')) return false;
    if (endDate && itemDate.isAfter(endDate, 'day')) return false;
    
    return true;
  });
}

/**
 * الحصول على نطاق التاريخ للفلاتر السريعة
 * @param {string} filterId - معرف الفلتر السريع
 * @returns {Object} تاريخ البداية والنهاية
 */
function getDateRangeForQuickFilter(filterId) {
  const today = moment().startOf('day');
  
  switch (filterId) {
    case QUICK_FILTERS.TODAY:
      return { startDate: today, endDate: today };
      
    case QUICK_FILTERS.LAST_7_DAYS:
      return { startDate: moment().subtract(6, 'days').startOf('day'), endDate: today };
      
    case QUICK_FILTERS.LAST_30_DAYS:
      return { startDate: moment().subtract(29, 'days').startOf('day'), endDate: today };
      
    case QUICK_FILTERS.THIS_MONTH:
      return { 
        startDate: moment().startOf('month'), 
        endDate: moment().endOf('month') 
      };
      
    case QUICK_FILTERS.LAST_MONTH:
      return { 
        startDate: moment().subtract(1, 'month').startOf('month'), 
        endDate: moment().subtract(1, 'month').endOf('month') 
      };
      
    case QUICK_FILTERS.ALL_TIME:
      return { startDate: null, endDate: null };
      
    default:
      return { startDate: null, endDate: null };
  }
}

/**
 * تطبيق الترتيب الذكي للعمليات في نفس اليوم
 * @param {Array} transactions - العمليات للترتيب
 * @param {number} previousBalance - الرصيد السابق
 * @returns {Array} العمليات مرتبة بذكاء
 */
function applySmartOrdering(transactions, previousBalance = 0) {
  // تجميع العمليات حسب التاريخ
  const groupedByDate = {};
  
  transactions.forEach(t => {
    const date = parseDate(t.date).format('YYYY-MM-DD');
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push(t);
  });
  
  const orderedTransactions = [];
  let runningBalance = previousBalance;
  
  // معالجة كل يوم
  Object.keys(groupedByDate).sort().forEach(date => {
    const dayTransactions = groupedByDate[date];
    const sales = dayTransactions.filter(t => t.type === 'sale');
    const payments = dayTransactions.filter(t => t.type === 'payment');
    
    // الترتيب الذكي: إذا كان هناك رصيد دائن، التسديدات أولاً
    if (runningBalance < 0 && payments.length > 0) {
      // التسديدات أولاً لتقليل الدين
      orderedTransactions.push(...payments);
      payments.forEach(p => {
        runningBalance += p.amount;
      });
      
      // ثم المبيعات
      orderedTransactions.push(...sales);
      sales.forEach(s => {
        runningBalance -= s.total;
      });
    } else {
      // المبيعات أولاً ثم التسديدات
      orderedTransactions.push(...sales);
      sales.forEach(s => {
        runningBalance -= s.total;
      });
      
      orderedTransactions.push(...payments);
      payments.forEach(p => {
        runningBalance += p.amount;
      });
    }
  });
  
  return orderedTransactions;
}

/**
 * تحليل التاريخ (نسخة مبسطة)
 * @param {string} dateStr - نص التاريخ
 * @returns {moment|null} كائن moment أو null
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // محاولة تحليل التاريخ بصيغ مختلفة
  const formats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'D/M/YYYY', 'YYYY-M-D'];
  
  for (const format of formats) {
    const m = moment(dateStr, format, true);
    if (m.isValid()) return m;
  }
  
  // محاولة أخيرة
  const m = moment(dateStr);
  return m.isValid() ? m : null;
}

// تصدير الدوال للاستخدام العام
window.storeFilter = {
  FILTER_TYPES,
  QUICK_FILTERS,
  getActiveStoreFilter,
  setActiveStoreFilter,
  detectFinancialCycles,
  applyStoreFilter,
  applySmartOrdering,
  getDateRangeForQuickFilter
};