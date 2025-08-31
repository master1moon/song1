/**
 * ملف trash.js - نظام سلة المحذوفات
 * يحتفظ بالعناصر المحذوفة من جميع الأقسام
 * يسمح باسترجاع العناصر المحذوفة أو حذفها نهائياً
 * يوفر البحث والفلترة والترتيب للعناصر المحذوفة
 * 
 * المشاكل المحتملة:
 * - العناصر المحذوفة تبقى في الذاكرة مما قد يستهلك مساحة كبيرة
 * - لا يوجد آلية للحذف التلقائي بعد فترة زمنية
 * - استرجاع العناصر قد يفشل إذا كانت هناك تعارضات في المعرفات
 * - البحث يتم في النص الكامل مما قد يكون بطيئاً
 * - لا يوجد سجل لمن قام بالحذف أو الاسترجاع
 */

// إدارة سلة المحذوفات

/**
 * نظام سلة المحذوفات
 * يحتفظ بالعناصر المحذوفة من جميع الأقسام
 * يسمح باسترجاع العناصر المحذوفة أو حذفها نهائياً
 * يوفر البحث والفلترة والترتيب للعناصر المحذوفة
 */
(function() {
    'use strict';

    /**
     * التأكد من وجود مصفوفة سلة المحذوفات في هيكل البيانات
     * ينشئ المصفوفة إذا لم تكن موجودة
     */
    function ensureTrashExists() {
        if (typeof data !== 'undefined' && data && !data.trash) {
            data.trash = [];
        } else if (typeof window.data !== 'undefined' && window.data && !window.data.trash) {
            window.data.trash = [];
        }
    }

    /**
     * إضافة عنصر إلى سلة المحذوفات
     * ينشئ نسخة عميقة من العنصر للحفظ
     * يضيف معلومات الحذف (القسم، التاريخ، المعرف)
     * @param {string} section - القسم الذي تم حذف العنصر منه
     * @param {Object} item - العنصر المحذوف
     * @returns {Promise<boolean>} true إذا تمت الإضافة بنجاح
     */
    async function addToTrash(section, item) {
        try {
            ensureTrashExists();
            
            const trashItem = {
                id: 'trash_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                section: section,
                deletedAt: new Date().toISOString(),
                item: JSON.parse(JSON.stringify(item)) // نسخة عميقة
            };
            
            if (data && data.trash) {
                data.trash.push(trashItem);
            } else if (window.data && window.data.trash) {
                window.data.trash.push(trashItem);
            }
            
            // حفظ البيانات
            if (typeof saveData === 'function') {
                saveData();
            }
            
            // تحديث عرض سلة المحذوفات إذا كانت مفتوحة
            if (typeof renderTrashTable === 'function') {
                renderTrashTable();
            }
            
            return true;
        } catch (error) {
            console.error('خطأ في إضافة العنصر إلى سلة المحذوفات:', error);
            return false;
        }
    }

    /**
     * عرض جدول العناصر المحذوفة
     * يطبق الفلترة والبحث والترتيب على العناصر
     * يعرض معلومات كل عنصر مع أزرار الاسترجاع والحذف النهائي
     * يستخدم الطريقة الآمنة لعرض البيانات
     */
    function renderTrashTable() {
        const table = document.getElementById('trashTable');
        if (!table) return;
        
        ensureTrashExists();
        
        const trash = (data && data.trash) || (window.data && window.data.trash) || [];
        const filterSection = document.getElementById('trashFilterSection')?.value || 'all';
        const searchTerm = (document.getElementById('trashSearch')?.value || '').toLowerCase();
        const sortBy = document.getElementById('trashSortBy')?.value || 'deletedAt_desc';
        
        // فلترة
        let filtered = trash.filter(item => {
            if (filterSection !== 'all' && item.section !== filterSection) return false;
            
            if (searchTerm) {
                const searchableText = JSON.stringify(item.item).toLowerCase();
                if (!searchableText.includes(searchTerm)) return false;
            }
            
            return true;
        });
        
        // ترتيب
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'deletedAt_asc':
                    return new Date(a.deletedAt) - new Date(b.deletedAt);
                case 'deletedAt_desc':
                    return new Date(b.deletedAt) - new Date(a.deletedAt);
                case 'section_asc':
                    return a.section.localeCompare(b.section);
                case 'section_desc':
                    return b.section.localeCompare(a.section);
                default:
                    return 0;
            }
        });
        
        // عرض الجدول
        // إفراغ الجدول بأمان
        if (window.$safe && window.$safe.clear) {
            window.$safe.clear(table);
        } else {
            while (table.firstChild) {
                table.removeChild(table.firstChild);
            }
        }
        
        if (filtered.length === 0) {
            const row = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 4;
            td.className = 'text-center';
            td.textContent = 'لا توجد عناصر محذوفة';
            row.appendChild(td);
            table.appendChild(row);
            return;
        }
        
        filtered.forEach(trashItem => {
            const row = document.createElement('tr');
            const sectionName = getSectionName(trashItem.section);
            const itemDesc = getItemDescription(trashItem.section, trashItem.item);
            // استخدام التاريخ الميلادي مثل باقي التطبيق
            const deletedDate = typeof formatDateEn === 'function' ? 
                formatDateEn(trashItem.deletedAt) : 
                new Date(trashItem.deletedAt).toLocaleDateString('en-US');
            
            if (window.$safe && window.$safe.row) {
                // استخدام الطريقة الآمنة
                const safeRow = window.$safe.row([
                    sectionName,
                    itemDesc,
                    deletedDate
                ], [
                    {
                        className: 'btn btn-sm btn-success restore-item',
                        icon: 'fas fa-undo',
                        text: 'استعادة',
                        dataId: trashItem.id,
                        onClick: () => restoreItem(trashItem.id)
                    },
                    {
                        className: 'btn btn-sm btn-danger delete-forever',
                        icon: 'fas fa-trash',
                        text: 'حذف نهائياً',
                        dataId: trashItem.id,
                        onClick: () => deleteForever(trashItem.id)
                    }
                ]);
                table.appendChild(safeRow);
            } else {
                // الطريقة التقليدية مع التعقيم
                const cells = [sectionName, itemDesc, deletedDate];
                cells.forEach(content => {
                    const td = document.createElement('td');
                    td.textContent = content;
                    row.appendChild(td);
                });
                
                const actionTd = document.createElement('td');
                actionTd.className = 'action-buttons';
                
                const restoreBtn = document.createElement('button');
                restoreBtn.className = 'btn btn-sm btn-success restore-item';
                restoreBtn.dataset.id = trashItem.id;
                restoreBtn.innerHTML = '<i class="fas fa-undo"></i> استعادة';
                restoreBtn.addEventListener('click', () => restoreItem(trashItem.id));
                
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-sm btn-danger delete-forever';
                deleteBtn.dataset.id = trashItem.id;
                deleteBtn.innerHTML = '<i class="fas fa-trash"></i> حذف نهائياً';
                deleteBtn.addEventListener('click', () => deleteForever(trashItem.id));
                
                actionTd.appendChild(restoreBtn);
                actionTd.appendChild(deleteBtn);
                row.appendChild(actionTd);
                
                table.appendChild(row);
            }
        });
    }

    /**
     * الحصول على اسم القسم باللغة العربية
     * يحول معرف القسم إلى اسم مقروء
     * @param {string} section - معرف القسم
     * @returns {string} اسم القسم بالعربية
     */
    function getSectionName(section) {
        const sectionNames = {
            'packages': 'الباقات',
            'inventory': 'المخزون',
            'stores': 'المحلات',
            'expenses': 'المصروفات',
            'sales': 'المبيعات',
            'payments': 'التسديدات'
        };
        return sectionNames[section] || section;
    }

    /**
     * الحصول على وصف مختصر للعنصر المحذوف
     * يعرض معلومات مختلفة حسب نوع العنصر
     * @param {string} section - القسم الذي ينتمي إليه العنصر
     * @param {Object} item - العنصر المراد وصفه
     * @returns {string} وصف مختصر للعنصر
     */
    function getItemDescription(section, item) {
        switch (section) {
            case 'packages':
                return `${item.name || 'باقة'} - ${item.retailPrice || 0}`;
            case 'inventory':
                return `كمية: ${item.quantity || 0}`;
            case 'stores':
                return item.name || 'محل';
            case 'expenses':
                return `${item.type || 'مصروف'} - ${item.amount || 0}`;
            case 'sales':
                return `بيع - ${item.total || 0}`;
            case 'payments':
                return `تسديد - ${item.amount || 0}`;
            default:
                return JSON.stringify(item).substr(0, 50) + '...';
        }
    }

    /**
     * استعادة عنصر من سلة المحذوفات
     * يعيد العنصر إلى قسمه الأصلي
     * يحذف العنصر من سلة المحذوفات
     * يحدث جميع الجداول والتقارير المتعلقة
     * @param {string} trashId - معرف العنصر في سلة المحذوفات
     */
    function restoreItem(trashId) {
        if (!confirm('هل تريد استعادة هذا العنصر؟')) return;
        
        ensureTrashExists();
        const trash = (data && data.trash) || (window.data && window.data.trash) || [];
        const trashItem = trash.find(t => t.id === trashId);
        
        if (!trashItem) {
            showNotification('العنصر غير موجود في سلة المحذوفات', 'error');
            return;
        }
        
        // استعادة العنصر إلى قسمه الأصلي
        const targetArray = data[trashItem.section];
        if (Array.isArray(targetArray)) {
            targetArray.push(trashItem.item);
            
            // حذف من سلة المحذوفات
            const index = trash.findIndex(t => t.id === trashId);
            if (index > -1) {
                trash.splice(index, 1);
            }
            
            saveData();
            renderTrashTable();
            updateAllSections();
            
            showNotification('تم استعادة العنصر بنجاح', 'success');
        } else {
            showNotification('لا يمكن استعادة العنصر - القسم غير موجود', 'error');
        }
    }

    /**
     * حذف عنصر نهائياً من سلة المحذوفات
     * لا يمكن التراجع عن هذه العملية
     * يطلب تأكيد من المستخدم قبل الحذف
     * @param {string} trashId - معرف العنصر في سلة المحذوفات
     */
    function deleteForever(trashId) {
        if (!confirm('هل أنت متأكد من الحذف النهائي؟ لا يمكن التراجع عن هذا الإجراء.')) return;
        
        ensureTrashExists();
        const trash = (data && data.trash) || (window.data && window.data.trash) || [];
        const index = trash.findIndex(t => t.id === trashId);
        
        if (index > -1) {
            trash.splice(index, 1);
            saveData();
            renderTrashTable();
            showNotification('تم الحذف النهائي', 'success');
        }
    }

    /**
     * تحديث جميع الأقسام والجداول
     * يستدعي دوال عرض جميع الجداول والتقارير
     * يستخدم بعد استعادة عنصر لتحديث العرض
     */
    function updateAllSections() {
        // تحديث الجداول حسب القسم النشط
        if (typeof renderPackagesTable === 'function') renderPackagesTable();
        if (typeof renderInventoryTable === 'function') renderInventoryTable();
        if (typeof renderStoresList === 'function') renderStoresList();
        if (typeof renderExpensesTable === 'function') renderExpensesTable();
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof updateProfitReport === 'function') updateProfitReport();
        if (typeof generateDebtReport === 'function') generateDebtReport();
    }

    /**
     * تفريغ سلة المحذوفات بالكامل
     * يحذف جميع العناصر نهائياً
     * يطلب تأكيد من المستخدم قبل التفريغ
     * لا يمكن التراجع عن هذه العملية
     */
    function emptyTrash() {
        if (!confirm('هل أنت متأكد من تفريغ سلة المحذوفات بالكامل؟ لا يمكن التراجع عن هذا الإجراء.')) return;
        
        ensureTrashExists();
        if (data && data.trash) {
            data.trash = [];
        } else if (window.data && window.data.trash) {
            window.data.trash = [];
        }
        
        saveData();
        renderTrashTable();
        showNotification('تم تفريغ سلة المحذوفات', 'success');
    }

    // تصدير الدوال للنطاق العام
    if (typeof window !== 'undefined') {
        window.addToTrash = addToTrash;
        window.renderTrashTable = renderTrashTable;
        window.restoreItem = restoreItem;
        window.deleteForever = deleteForever;
        window.emptyTrash = emptyTrash;
        window.ensureTrashExists = ensureTrashExists;
    }

    // تهيئة عند التحميل
    document.addEventListener('DOMContentLoaded', function() {
        ensureTrashExists();
        
        // معالجات أحداث الفلترة والبحث
        const filterSection = document.getElementById('trashFilterSection');
        const searchInput = document.getElementById('trashSearch');
        const sortBy = document.getElementById('trashSortBy');
        
        if (filterSection) filterSection.addEventListener('change', renderTrashTable);
        if (searchInput) searchInput.addEventListener('input', renderTrashTable);
        if (sortBy) sortBy.addEventListener('change', renderTrashTable);
        
        // الزر موجود الآن في HTML مباشرة
    });

})();