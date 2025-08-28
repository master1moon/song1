// التحقق من صحة البيانات وإصلاحها
(function() {
    'use strict';

    // بنية البيانات الافتراضية
    const defaultDataStructure = {
        packages: [],
        inventory: [],
        stores: [],
        expenses: [],
        sales: [],
        payments: [],
        trash: []
    };

    // التحقق من صحة كائن البيانات
    function validateDataObject(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        // التحقق من وجود جميع الخصائص المطلوبة
        const requiredKeys = Object.keys(defaultDataStructure);
        for (const key of requiredKeys) {
            if (!(key in data) || !Array.isArray(data[key])) {
                return false;
            }
        }

        return true;
    }

    // إصلاح البيانات وإضافة الخصائص المفقودة
    function repairDataObject(data) {
        const repaired = { ...defaultDataStructure };

        if (data && typeof data === 'object') {
            for (const key in defaultDataStructure) {
                if (Array.isArray(data[key])) {
                    repaired[key] = data[key];
                }
            }
        }

        return repaired;
    }

    // التحقق من صحة العناصر الفردية
    function validateItem(item, type) {
        if (!item || typeof item !== 'object') return false;
        
        // التحقق من وجود معرف
        if (!item.id) return false;

        // التحقق حسب النوع
        switch (type) {
            case 'packages':
                return item.name && typeof item.name === 'string';
            
            case 'inventory':
                return item.packageId && typeof item.quantity === 'number' && item.quantity >= 0;
            
            case 'stores':
                return item.name && typeof item.name === 'string';
            
            case 'expenses':
                return item.type && typeof item.amount === 'number' && item.amount >= 0;
            
            case 'sales':
                return item.storeId && typeof item.total === 'number' && item.total >= 0;
            
            case 'payments':
                return item.storeId && typeof item.amount === 'number' && item.amount > 0;
            
            default:
                return true;
        }
    }

    // تنظيف البيانات من العناصر غير الصحيحة
    function cleanData(data) {
        const cleaned = { ...data };

        for (const key in cleaned) {
            if (Array.isArray(cleaned[key])) {
                cleaned[key] = cleaned[key].filter(item => validateItem(item, key));
            }
        }

        return cleaned;
    }

    // تصدير الدوال للاستخدام العام
    window.DataValidator = {
        validate: validateDataObject,
        repair: repairDataObject,
        clean: cleanData,
        validateItem: validateItem,
        getDefaultStructure: () => ({ ...defaultDataStructure })
    };

})();