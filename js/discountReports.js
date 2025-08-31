/**
 * ملف discountReports.js - نظام تقارير الخصومات
 * يوفر تقارير شاملة ومفصلة عن جميع أنواع الخصومات في النظام
 * يتضمن إحصائيات وتحليلات للخصومات الدائمة والإضافية
 */

/**
 * تحويل التاريخ العربي إلى تاريخ JS قابل للقراءة
 * @param {string} arabicDateStr - التاريخ بالصيغة العربية
 * @returns {Date} - كائن التاريخ
 */
function parseArabicDate(arabicDateStr) {
    if (!arabicDateStr) return new Date();
    
    // إذا كان التاريخ بصيغة ISO
    if (arabicDateStr.includes('-') && !arabicDateStr.includes('٠') && !arabicDateStr.includes('١')) {
        return new Date(arabicDateStr);
    }
    
    // تحويل الأرقام العربية إلى إنجليزية
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    let englishDate = arabicDateStr;
    
    arabicNumerals.forEach((arabic, index) => {
        const regex = new RegExp(arabic, 'g');
        englishDate = englishDate.replace(regex, index.toString());
    });
    
    // محاولة تحليل التاريخ بصيغ مختلفة
    const formats = [
        /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
        /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/ // DD/MM/YYYY
    ];
    
    for (let format of formats) {
        const match = englishDate.match(format);
        if (match) {
            let year, month, day;
            if (format === formats[0]) {
                [, year, month, day] = match;
            } else {
                [, day, month, year] = match;
            }
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
    }
    
    return new Date(englishDate);
}


/**
 * تبديل عرض حقول التاريخ المخصص
 */
function toggleDiscountCustomDates() {
    const period = document.getElementById('discountPeriod').value;
    const customDates = document.getElementById('discountCustomDates');
    const customDatesTo = document.getElementById('discountCustomDatesTo');
    
    if (period === 'custom') {
        customDates.style.display = 'block';
        customDatesTo.style.display = 'block';
    } else {
        customDates.style.display = 'none';
        customDatesTo.style.display = 'none';
    }
}

/**
 * الحصول على نطاق التاريخ بناءً على الفترة المحددة
 * @param {string} period - الفترة المحددة
 * @returns {Object} - {from: Date, to: Date}
 */
function getDiscountDateRange(period) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let from, to;
    
    switch (period) {
        case 'today':
            from = today;
            to = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
            break;
            
        case 'week':
            from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            to = now;
            break;
            
        case 'month':
            from = new Date(now.getFullYear(), now.getMonth(), 1);
            to = now;
            break;
            
        case 'lastMonth':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            from = lastMonth;
            to = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
            
        case 'year':
            from = new Date(now.getFullYear(), 0, 1);
            to = now;
            break;
            
        case 'all':
            from = new Date(0);
            to = now;
            break;
            
        case 'custom':
            const fromDate = document.getElementById('discountFromDate').value;
            const toDate = document.getElementById('discountToDate').value;
            
            if (!fromDate || !toDate) {
                showNotification('يرجى تحديد تاريخ البداية والنهاية', 'error');
                return null;
            }
            
            from = new Date(fromDate);
            to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            break;
            
        default:
            from = new Date(0);
            to = now;
    }
    
    return { from, to };
}

/**
 * توليد تقرير الخصومات
 */
function generateDiscountReport() {
    const period = document.getElementById('discountPeriod').value;
    const dateRange = getDiscountDateRange(period);
    
    if (!dateRange) return;
    
    // جمع البيانات
    const discountData = collectDiscountData(dateRange);
    
    // عرض الإحصائيات
    displayDiscountStats(discountData);
    
    // عرض التفاصيل
    displayDiscountDetails(discountData);
    
    // عرض التقرير حسب المحل
    displayDiscountByStore(discountData);
    
    // إظهار الأقسام
    document.getElementById('discountStatsSummary').style.display = 'flex';
    document.getElementById('discountDetailsCard').style.display = 'block';
    document.getElementById('discountByStoreCard').style.display = 'block';
}

/**
 * جمع بيانات الخصومات للفترة المحددة
 * @param {Object} dateRange - نطاق التاريخ
 * @returns {Object} - بيانات الخصومات
 */
function collectDiscountData(dateRange) {
    const discountData = {
        transactions: [],
        totalStoreDiscount: 0,
        totalAdditionalDiscount: 0,
        totalOriginalAmount: 0,
        totalDiscountAmount: 0,
        storeStats: {}
    };
    
    // معالجة المبيعات
    data.sales.forEach(sale => {
        const saleDate = new Date(parseArabicDate(sale.date));
        
        if (saleDate >= dateRange.from && saleDate <= dateRange.to) {
            const store = data.stores.find(s => s.id === sale.storeId);
            if (!store) return;
            
            const originalAmount = sale.originalTotal || sale.total;
            const storeDiscount = sale.storeDiscount || 0;
            const additionalDiscount = sale.additionalDiscount || 0;
            const totalDiscount = storeDiscount + additionalDiscount;
            
            // إضافة للإحصائيات العامة
            discountData.totalOriginalAmount += originalAmount;
            discountData.totalStoreDiscount += storeDiscount;
            discountData.totalAdditionalDiscount += additionalDiscount;
            discountData.totalDiscountAmount += totalDiscount;
            
            // إضافة للإحصائيات حسب المحل
            if (!discountData.storeStats[sale.storeId]) {
                discountData.storeStats[sale.storeId] = {
                    storeName: store.name,
                    transactions: 0,
                    storeDiscount: 0,
                    additionalDiscount: 0,
                    totalDiscount: 0,
                    totalSales: 0
                };
            }
            
            const storeStat = discountData.storeStats[sale.storeId];
            storeStat.transactions++;
            storeStat.storeDiscount += storeDiscount;
            storeStat.additionalDiscount += additionalDiscount;
            storeStat.totalDiscount += totalDiscount;
            storeStat.totalSales += originalAmount;
            
            // إضافة للتفاصيل إذا كان هناك خصم
            if (totalDiscount > 0) {
                // خصم المحل
                if (storeDiscount > 0) {
                    discountData.transactions.push({
                        date: sale.date,
                        storeName: store.name,
                        type: 'خصم دائم',
                        originalAmount: originalAmount,
                        discountAmount: storeDiscount,
                        percentage: ((storeDiscount / originalAmount) * 100).toFixed(1),
                        reason: 'خصم المحل الدائم'
                    });
                }
                
                // خصم إضافي
                if (additionalDiscount > 0) {
                    discountData.transactions.push({
                        date: sale.date,
                        storeName: store.name,
                        type: 'خصم إضافي',
                        originalAmount: originalAmount - storeDiscount,
                        discountAmount: additionalDiscount,
                        percentage: (((additionalDiscount / (originalAmount - storeDiscount)) * 100)).toFixed(1),
                        reason: sale.additionalDiscountReason || 'بدون سبب'
                    });
                }
            }
        }
    });
    
    // ترتيب المعاملات حسب التاريخ
    discountData.transactions.sort((a, b) => {
        const dateA = new Date(parseArabicDate(a.date));
        const dateB = new Date(parseArabicDate(b.date));
        return dateB - dateA;
    });
    
    return discountData;
}

/**
 * عرض إحصائيات الخصومات
 * @param {Object} discountData - بيانات الخصومات
 */
function displayDiscountStats(discountData) {
    // إجمالي الخصومات
    document.getElementById('totalDiscountAmount').textContent = formatNumber(discountData.totalDiscountAmount);
    
    // خصومات المحلات
    document.getElementById('storeDiscountAmount').textContent = formatNumber(discountData.totalStoreDiscount);
    
    // خصومات إضافية
    document.getElementById('additionalDiscountAmount').textContent = formatNumber(discountData.totalAdditionalDiscount);
    
    // نسبة الخصومات
    const discountPercentage = discountData.totalOriginalAmount > 0 
        ? ((discountData.totalDiscountAmount / discountData.totalOriginalAmount) * 100).toFixed(1)
        : 0;
    document.getElementById('discountPercentage').textContent = discountPercentage + '%';
}

/**
 * عرض تفاصيل الخصومات
 * @param {Object} discountData - بيانات الخصومات
 */
function displayDiscountDetails(discountData) {
    const tbody = document.getElementById('discountDetailsBody');
    tbody.innerHTML = '';
    
    if (discountData.transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">لا توجد خصومات في الفترة المحددة</td>
            </tr>
        `;
        return;
    }
    
    discountData.transactions.forEach(transaction => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${transaction.date}</td>
            <td>${transaction.storeName}</td>
            <td>
                <span class="badge ${transaction.type === 'خصم دائم' ? 'bg-success' : 'bg-warning'}">
                    ${transaction.type}
                </span>
            </td>
            <td>${formatNumber(transaction.originalAmount)}</td>
            <td>${formatNumber(transaction.discountAmount)}</td>
            <td>${transaction.percentage}%</td>
            <td>${transaction.reason}</td>
        `;
    });
    
    // تحديث الإجمالي في footer
    document.getElementById('footerOriginalTotal').textContent = formatNumber(discountData.totalOriginalAmount);
    document.getElementById('footerDiscountTotal').textContent = formatNumber(discountData.totalDiscountAmount);
    document.getElementById('footerDiscountPercent').textContent = 
        discountData.totalOriginalAmount > 0 
            ? ((discountData.totalDiscountAmount / discountData.totalOriginalAmount) * 100).toFixed(1) + '%'
            : '0%';
}

/**
 * عرض الخصومات حسب المحل
 * @param {Object} discountData - بيانات الخصومات
 */
function displayDiscountByStore(discountData) {
    const tbody = document.getElementById('discountByStoreBody');
    tbody.innerHTML = '';
    
    const storeIds = Object.keys(discountData.storeStats);
    
    if (storeIds.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">لا توجد بيانات للعرض</td>
            </tr>
        `;
        return;
    }
    
    // ترتيب المحلات حسب إجمالي الخصومات
    storeIds.sort((a, b) => {
        return discountData.storeStats[b].totalDiscount - discountData.storeStats[a].totalDiscount;
    });
    
    storeIds.forEach(storeId => {
        const stats = discountData.storeStats[storeId];
        const discountPercentage = stats.totalSales > 0 
            ? ((stats.totalDiscount / stats.totalSales) * 100).toFixed(1)
            : 0;
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${stats.storeName}</td>
            <td>${stats.transactions}</td>
            <td>${formatNumber(stats.storeDiscount)}</td>
            <td>${formatNumber(stats.additionalDiscount)}</td>
            <td class="fw-bold">${formatNumber(stats.totalDiscount)}</td>
            <td>
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar ${discountPercentage > 10 ? 'bg-danger' : discountPercentage > 5 ? 'bg-warning' : 'bg-success'}" 
                         role="progressbar" 
                         style="width: ${Math.min(discountPercentage, 100)}%">
                        ${discountPercentage}%
                    </div>
                </div>
            </td>
        `;
    });
}

/**
 * تصدير تقرير الخصومات
 * @param {string} format - صيغة التصدير (excel, pdf)
 */
function exportDiscountReport(format) {
    const period = document.getElementById('discountPeriod').value;
    const dateRange = getDiscountDateRange(period);
    
    if (!dateRange) return;
    
    const discountData = collectDiscountData(dateRange);
    
    switch (format) {
        case 'excel':
            exportDiscountToExcel(discountData, dateRange);
            break;
            
        case 'pdf':
            exportDiscountToPDF(discountData, dateRange);
            break;
            
        default:
            showNotification('صيغة التصدير غير مدعومة', 'error');
    }
}

/**
 * تصدير الخصومات إلى Excel
 * @param {Object} discountData - بيانات الخصومات
 * @param {Object} dateRange - نطاق التاريخ
 */
function exportDiscountToExcel(discountData, dateRange) {
    let csvContent = '\ufeff'; // UTF-8 BOM
    
    // العنوان
    csvContent += 'تقرير الخصومات\n';
    csvContent += `من ${formatDateEn(dateRange.from)} إلى ${formatDateEn(dateRange.to)}\n\n`;
    
    // الإحصائيات
    csvContent += 'ملخص الإحصائيات\n';
    csvContent += `إجمالي الخصومات,${discountData.totalDiscountAmount}\n`;
    csvContent += `خصومات المحلات,${discountData.totalStoreDiscount}\n`;
    csvContent += `خصومات إضافية,${discountData.totalAdditionalDiscount}\n`;
    csvContent += `نسبة الخصومات,${(discountData.totalDiscountAmount / discountData.totalOriginalAmount * 100).toFixed(1)}%\n\n`;
    
    // تفاصيل الخصومات
    csvContent += 'تفاصيل الخصومات\n';
    csvContent += 'التاريخ,المحل,نوع الخصم,المبلغ الأصلي,قيمة الخصم,النسبة,السبب\n';
    
    discountData.transactions.forEach(t => {
        csvContent += `${t.date},${t.storeName},${t.type},${t.originalAmount},${t.discountAmount},${t.percentage}%,${t.reason}\n`;
    });
    
    csvContent += '\n';
    
    // الخصومات حسب المحل
    csvContent += 'الخصومات حسب المحل\n';
    csvContent += 'المحل,عدد العمليات,خصومات دائمة,خصومات إضافية,إجمالي الخصومات,النسبة من المبيعات\n';
    
    Object.keys(discountData.storeStats).forEach(storeId => {
        const stats = discountData.storeStats[storeId];
        const percentage = ((stats.totalDiscount / stats.totalSales) * 100).toFixed(1);
        csvContent += `${stats.storeName},${stats.transactions},${stats.storeDiscount},${stats.additionalDiscount},${stats.totalDiscount},${percentage}%\n`;
    });
    
    // إضافة حقوق النشر
    csvContent += '\n\n';
    csvContent += getCopyrightText();
    
    // تحميل الملف
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_الخصومات_${formatDateEn(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('تم تصدير التقرير بنجاح', 'success');
}

/**
 * تصدير الخصومات إلى PDF/HTML
 * @param {Object} discountData - بيانات الخصومات
 * @param {Object} dateRange - نطاق التاريخ
 */
function exportDiscountToPDF(discountData, dateRange) {
    let html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>تقرير الخصومات</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    direction: rtl;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .stats {
                    display: flex;
                    justify-content: space-around;
                    margin-bottom: 30px;
                }
                .stat-box {
                    text-align: center;
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }
                th, td {
                    padding: 8px;
                    text-align: right;
                    border: 1px solid #ddd;
                }
                th {
                    background-color: #f8f9fa;
                    font-weight: bold;
                }
                .badge {
                    padding: 3px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                }
                .bg-success {
                    background-color: #28a745;
                    color: white;
                }
                .bg-warning {
                    background-color: #ffc107;
                    color: black;
                }
                @media print {
                    body {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>تقرير الخصومات</h1>
                <p>من ${formatDateEn(dateRange.from)} إلى ${formatDateEn(dateRange.to)}</p>
            </div>
            
            <div class="stats">
                <div class="stat-box">
                    <h3>${formatNumber(discountData.totalDiscountAmount)}</h3>
                    <p>إجمالي الخصومات</p>
                </div>
                <div class="stat-box">
                    <h3>${formatNumber(discountData.totalStoreDiscount)}</h3>
                    <p>خصومات المحلات</p>
                </div>
                <div class="stat-box">
                    <h3>${formatNumber(discountData.totalAdditionalDiscount)}</h3>
                    <p>خصومات إضافية</p>
                </div>
                <div class="stat-box">
                    <h3>${((discountData.totalDiscountAmount / discountData.totalOriginalAmount) * 100).toFixed(1)}%</h3>
                    <p>نسبة الخصومات</p>
                </div>
            </div>
            
            <h2>تفاصيل الخصومات</h2>
            <table>
                <thead>
                    <tr>
                        <th>التاريخ</th>
                        <th>المحل</th>
                        <th>نوع الخصم</th>
                        <th>المبلغ الأصلي</th>
                        <th>قيمة الخصم</th>
                        <th>النسبة</th>
                        <th>السبب</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    discountData.transactions.forEach(t => {
        html += `
            <tr>
                <td>${t.date}</td>
                <td>${t.storeName}</td>
                <td><span class="badge ${t.type === 'خصم دائم' ? 'bg-success' : 'bg-warning'}">${t.type}</span></td>
                <td>${formatNumber(t.originalAmount)}</td>
                <td>${formatNumber(t.discountAmount)}</td>
                <td>${t.percentage}%</td>
                <td>${t.reason}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            
            <h2>الخصومات حسب المحل</h2>
            <table>
                <thead>
                    <tr>
                        <th>المحل</th>
                        <th>عدد العمليات</th>
                        <th>خصومات دائمة</th>
                        <th>خصومات إضافية</th>
                        <th>إجمالي الخصومات</th>
                        <th>النسبة من المبيعات</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    Object.keys(discountData.storeStats).forEach(storeId => {
        const stats = discountData.storeStats[storeId];
        const percentage = ((stats.totalDiscount / stats.totalSales) * 100).toFixed(1);
        html += `
            <tr>
                <td>${stats.storeName}</td>
                <td>${stats.transactions}</td>
                <td>${formatNumber(stats.storeDiscount)}</td>
                <td>${formatNumber(stats.additionalDiscount)}</td>
                <td>${formatNumber(stats.totalDiscount)}</td>
                <td>${percentage}%</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            
            ${getCopyrightHTML()}
        </body>
        </html>
    `;
    
    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(html);
    reportWindow.document.close();
    
    showNotification('تم فتح التقرير في نافذة جديدة', 'success');
}

/**
 * طباعة تقرير الخصومات
 */
function printDiscountReport() {
    window.print();
}

// تصدير الدوال للاستخدام العام
window.toggleDiscountCustomDates = toggleDiscountCustomDates;
window.generateDiscountReport = generateDiscountReport;
window.exportDiscountReport = exportDiscountReport;
window.printDiscountReport = printDiscountReport;