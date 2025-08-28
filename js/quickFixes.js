/**
 * ملف quickFixes.js - إصلاحات سريعة لمشاكل البيانات
 * يتحقق من سلامة البيانات عند التحميل ويصلح الأخطاء
 * يعالج أخطاء JSON ومشاكل localStorage
 * يضمن وجود بنية البيانات الصحيحة دائماً
 * 
 * المشاكل المحتملة:
 * - قد يحذف بيانات المستخدم دون تحذير
 * - معالج الأخطاء العام قد يخفي أخطاء مهمة
 * - لا يحتفظ بنسخة احتياطية قبل الإصلاح
 * - الإصلاحات التلقائية قد تكون غير متوقعة للمستخدم
 * - لا يسجل تفاصيل الإصلاحات التي تمت
 */

// إصلاحات سريعة لمشاكل البيانات
(function() {
    'use strict';

    /**
     * التحقق من البيانات عند تحميل الصفحة
     * ينشئ بنية بيانات افتراضية إذا لم تكن موجودة
     * يستدعي DataValidator لإصلاح البيانات التالفة
     */
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