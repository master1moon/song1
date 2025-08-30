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
    
    const timeDiff = dateA.getTime() - dateB.getTime();
    
    // إذا كانت العمليات في نفس اليوم
    if (timeDiff === 0) {
      // ترتيب التسديدات قبل المبيعات لضمان اكتشاف نقاط التصفير بشكل صحيح
      if (a.type === 'payment' && b.type === 'sale') return -1;
      if (a.type === 'sale' && b.type === 'payment') return 1;
    }
    
    return timeDiff;
  });
  
  if (allTransactions.length === 0) {
    return [];
  }
  
  const cycles = [];
  let runningBalance = 0;
  let lastZeroIndex = -1; // آخر نقطة كان فيها الرصيد صفر
  
  // البحث عن نقاط التصفير (الرصيد = 0)
  for (let i = 0; i < allTransactions.length; i++) {
    const transaction = allTransactions[i];
    runningBalance += transaction.amount;
    
    console.log(`Transaction ${i}: ${transaction.date}, Amount: ${transaction.amount}, Running Balance: ${runningBalance}`);
    
    // إذا وصل الرصيد إلى الصفر
    if (runningBalance === 0) {
      console.log(`Zero balance found at index ${i}, date: ${transaction.date}`);
      // إنشاء دورة من آخر نقطة صفر إلى النقطة الحالية
      const cycleStart = lastZeroIndex + 1;
      if (cycleStart <= i) {
        cycles.push({
          startDate: allTransactions[cycleStart].date,
          endDate: transaction.date,
          startIndex: cycleStart,
          endIndex: i,
          transactions: allTransactions.slice(cycleStart, i + 1),
          startBalance: 0,
          endBalance: 0,
          isComplete: true
        });
      }
      lastZeroIndex = i;
    }
  }
  
  // الدورة الحالية (من آخر تصفير حتى الآن)
  if (lastZeroIndex < allTransactions.length - 1) {
    const currentCycleStart = lastZeroIndex + 1;
    console.log(`Current cycle starts from index ${currentCycleStart}, date: ${allTransactions[currentCycleStart].date}`);
    console.log(`Last zero was at index ${lastZeroIndex}`);
    cycles.push({
      startDate: allTransactions[currentCycleStart].date,
      endDate: null,
      startIndex: currentCycleStart,
      endIndex: allTransactions.length - 1,
      transactions: allTransactions.slice(currentCycleStart),
      startBalance: 0,
      endBalance: runningBalance,
      isCurrent: true,
      isComplete: false
    });
  }
  
  // إذا لم توجد نقاط تصفير، كل العمليات في دورة واحدة
  if (cycles.length === 0 && allTransactions.length > 0) {
    cycles.push({
      startDate: allTransactions[0].date,
      endDate: null,
      startIndex: 0,
      endIndex: allTransactions.length - 1,
      transactions: allTransactions,
      startBalance: 0,
      endBalance: runningBalance,
      isCurrent: true,
      isComplete: false
    });
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
      
      if (targetCycle && targetCycle.transactions) {
        // استخدام العمليات من الدورة مباشرة
        const cycleTransactions = targetCycle.transactions;
        
        // فصل المبيعات والتسديدات من عمليات الدورة
        filteredSales = [];
        filteredPayments = [];
        
        cycleTransactions.forEach(t => {
          if (t.type === 'sale') {
            // البحث عن المبيعة الأصلية
            const originalSale = allSales.find(s => s.id === t.id);
            if (originalSale) filteredSales.push(originalSale);
          } else if (t.type === 'payment') {
            // البحث عن التسديد الأصلي
            const originalPayment = allPayments.find(p => p.id === t.id);
            if (originalPayment) filteredPayments.push(originalPayment);
          }
        });
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
 * @param {Date} startDate - تاريخ البداية
 * @param {Date} endDate - تاريخ النهاية
 * @returns {Array} العناصر المفلترة
 */
function filterByDateRange(items, startDate, endDate) {
  return items.filter(item => {
    const itemDate = parseDate(item.date);
    if (!itemDate) return false;
    
    // مقارنة التواريخ
    if (startDate) {
      const itemTime = new Date(itemDate);
      itemTime.setHours(0, 0, 0, 0);
      const startTime = new Date(startDate);
      startTime.setHours(0, 0, 0, 0);
      if (itemTime < startTime) return false;
    }
    
    if (endDate) {
      const itemTime = new Date(itemDate);
      itemTime.setHours(23, 59, 59, 999);
      const endTime = new Date(endDate);
      endTime.setHours(23, 59, 59, 999);
      if (itemTime > endTime) return false;
    }
    
    return true;
  });
}

/**
 * الحصول على نطاق التاريخ للفلاتر السريعة
 * @param {string} filterId - معرف الفلتر السريع
 * @returns {Object} تاريخ البداية والنهاية
 */
function getDateRangeForQuickFilter(filterId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (filterId) {
    case QUICK_FILTERS.TODAY:
      return { startDate: today, endDate: today };
      
    case QUICK_FILTERS.LAST_7_DAYS:
      const last7Days = new Date(today);
      last7Days.setDate(today.getDate() - 6);
      return { startDate: last7Days, endDate: today };
      
    case QUICK_FILTERS.LAST_30_DAYS:
      const last30Days = new Date(today);
      last30Days.setDate(today.getDate() - 29);
      return { startDate: last30Days, endDate: today };
      
    case QUICK_FILTERS.THIS_MONTH:
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { startDate: monthStart, endDate: monthEnd };
      
    case QUICK_FILTERS.LAST_MONTH:
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: lastMonthStart, endDate: lastMonthEnd };
      
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
    const dateObj = parseDate(t.date);
    const date = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
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
 * تحليل التاريخ (نسخة مبسطة بدون moment)
 * @param {string} dateStr - نص التاريخ
 * @returns {Date|null} كائن Date أو null
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // محاولة تحليل التاريخ
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // محاولة تحليل التاريخ العربي
    if (dateStr.includes('٢٠')) {
      // تحويل الأرقام العربية إلى إنجليزية
      const arabicNumerals = '٠١٢٣٤٥٦٧٨٩';
      const englishNumerals = '0123456789';
      let englishDate = dateStr;
      for (let i = 0; i < arabicNumerals.length; i++) {
        englishDate = englishDate.replace(new RegExp(arabicNumerals[i], 'g'), englishNumerals[i]);
      }
      const date2 = new Date(englishDate);
      if (!isNaN(date2.getTime())) {
        return date2;
      }
    }
  } catch (e) {
    // تجاهل الأخطاء
  }
  
  return null;
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