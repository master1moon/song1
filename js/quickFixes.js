// إصلاحات سريعة لمشاكل البيانات
(function() {
    'use strict';

    // التحقق من البيانات عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', function() {
        // التأكد من وجود بنية البيانات الصحيحة
        if (typeof data === 'undefined' || !data) {
            window.data = {
                packages: [],
                inventory: [],
                stores: [],
                expenses: [],
                sales: [],
                payments: [],
                trash: []
            };
            console.log('تم إنشاء بنية بيانات افتراضية');
        }

        // التحقق من صحة البيانات المحملة
        if (window.DataValidator && !window.DataValidator.validate(data)) {
            console.warn('البيانات المحملة غير صحيحة، سيتم إصلاحها');
            window.data = window.DataValidator.repair(data);
            // حفظ البيانات المصلحة
            if (typeof saveData === 'function') {
                saveData();
            }
        }
    });

    // معالج أخطاء عام
    window.addEventListener('error', function(event) {
        // التحقق من أخطاء JSON
        if (event.error && event.error.message && event.error.message.includes('JSON')) {
            console.error('خطأ في معالجة JSON:', event.error);
            // محاولة إصلاح البيانات
            if (window.DataValidator && data) {
                window.data = window.DataValidator.repair(data);
            }
        }
    });

    // التحقق من localStorage عند التحميل
    try {
        const savedData = localStorage.getItem('networkCardsData');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (!parsed || typeof parsed !== 'object') {
                    throw new Error('بيانات غير صحيحة');
                }
            } catch (e) {
                console.error('خطأ في البيانات المحفوظة، سيتم حذفها:', e);
                localStorage.removeItem('networkCardsData');
                // إنشاء بيانات جديدة
                localStorage.setItem('networkCardsData', JSON.stringify({
                    packages: [],
                    inventory: [],
                    stores: [],
                    expenses: [],
                    sales: [],
                    payments: [],
                    trash: []
                }));
            }
        }
    } catch (e) {
        console.error('خطأ في الوصول إلى localStorage:', e);
    }

})();