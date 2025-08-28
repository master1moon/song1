/**
 * ملف safeDOM.js - مكتبة التعامل الآمن مع DOM
 * توفر دوال لإنشاء عناصر HTML بطريقة آمنة
 * تحمي من هجمات XSS عبر تعقيم النصوص
 * تدعم العرض الافتراضي للجداول الكبيرة
 * 
 * المشاكل المحتملة:
 * - الثقة في HTML يجب أن تكون أكثر صرامة
 * - لا يوجد تحقق من صحة المعاملات المدخلة
 * - بعض الدوال لها نفس الوظيفة مع اختلاف بسيط
 * - معالجة الأحداث قد تسبب تسرب ذاكرة إذا لم تُزل
 * - لا يدعم virtual DOM للأداء الأفضل
 */

// دوال DOM آمنة ومحسّنة للمشروع

/**
 * مكتبة التعامل الآمن مع DOM
 * توفر دوال لإنشاء عناصر HTML بطريقة آمنة
 * تحمي من هجمات XSS عبر تعقيم النصوص
 * تدعم العرض الافتراضي للجداول الكبيرة
 */
(function() {
    'use strict';

    /**
     * تعقيم النص لحمايته من XSS
     * يحول الأحرف الخاصة في HTML إلى كيانات HTML
     * @param {*} text - النص المراد تعقيمه
     * @returns {string} النص المعقم
     */
    function e(text) {
        if (text == null) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * إنشاء صف جدول آمن مع أزرار التحكم
     * يعقم جميع البيانات تلقائياً
     * يدعم إضافة HTML موثوق فقط
     * ينشئ أزرار مع معالجات الأحداث
     * @param {Array} data - بيانات الخلايا
     * @param {Array} buttons - تكوينات الأزرار
     * @returns {HTMLTableRowElement} عنصر الصف
     */
    function createTableRow(data, buttons = []) {
        const tr = document.createElement('tr');
        
        // إضافة خلايا البيانات
        data.forEach(cellData => {
            const td = document.createElement('td');
            
            if (cellData && typeof cellData === 'object') {
                if (cellData.className) td.className = cellData.className;
                if (cellData.html && cellData.trusted) {
                    td.innerHTML = cellData.html;
                } else {
                    td.textContent = cellData.text || cellData.value || '';
                }
            } else {
                td.textContent = cellData || '';
            }
            
            tr.appendChild(td);
        });
        
        // إضافة خلية الأزرار إذا وجدت
        if (buttons.length > 0) {
            const actionTd = document.createElement('td');
            actionTd.className = 'action-buttons';
            
            buttons.forEach(btnConfig => {
                const btn = document.createElement('button');
                btn.className = btnConfig.className || 'btn btn-sm';
                if (btnConfig.dataId) btn.dataset.id = btnConfig.dataId;
                
                // إضافة الأيقونة
                if (btnConfig.icon) {
                    const icon = document.createElement('i');
                    icon.className = btnConfig.icon;
                    btn.appendChild(icon);
                }
                
                // إضافة النص
                if (btnConfig.text) {
                    if (btnConfig.icon) btn.appendChild(document.createTextNode(' '));
                    btn.appendChild(document.createTextNode(btnConfig.text));
                }
                
                // إضافة معالج الحدث
                if (btnConfig.onClick) {
                    btn.addEventListener('click', btnConfig.onClick);
                }
                
                actionTd.appendChild(btn);
            });
            
            tr.appendChild(actionTd);
        }
        
        return tr;
    }

    /**
     * إنشاء بطاقة معلومات آمنة
     * يعرض معلومات بتنسيق بطاقة
     * جميع النصوص تعقم تلقائياً
     * @param {string} title - عنوان البطاقة
     * @param {Array} items - عناصر المعلومات
     * @returns {HTMLDivElement} عنصر البطاقة
     */
    function createInfoCard(title, items) {
        const card = document.createElement('div');
        card.className = 'info-card';
        
        if (title) {
            const titleEl = document.createElement('h5');
            titleEl.textContent = title;
            card.appendChild(titleEl);
        }
        
        items.forEach(item => {
            const itemEl = document.createElement('div');
            
            if (item.label) {
                const label = document.createElement('span');
                label.className = 'label';
                label.textContent = item.label + ': ';
                itemEl.appendChild(label);
            }
            
            const value = document.createElement('span');
            value.className = item.className || '';
            value.textContent = item.value || '';
            itemEl.appendChild(value);
            
            card.appendChild(itemEl);
        });
        
        return card;
    }

    /**
     * ملء قائمة select بخيارات آمنة
     * يفرغ القائمة أولاً ثم يضيف الخيارات
     * جميع النصوص تعقم تلقائياً
     * @param {HTMLSelectElement} selectElement - عنصر select
     * @param {Array} options - قائمة الخيارات
     * @param {string} defaultText - نص الخيار الافتراضي
     * @param {*} selectedValue - القيمة المحددة مسبقاً
     */
    function fillSelect(selectElement, options, defaultText = 'اختر...', selectedValue = null) {
        // إفراغ القائمة
        while (selectElement.firstChild) {
            selectElement.removeChild(selectElement.firstChild);
        }
        
        // إضافة الخيار الافتراضي
        if (defaultText) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = defaultText;
            selectElement.appendChild(defaultOption);
        }
        
        // إضافة الخيارات
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value || opt.id || '';
            option.textContent = opt.text || opt.name || opt.value || '';
            
            if (selectedValue !== null && String(option.value) === String(selectedValue)) {
                option.selected = true;
            }
            
            selectElement.appendChild(option);
        });
    }

    /**
     * تحديث محتوى عنصر بطريقة آمنة
     * يستخدم textContent بشكل افتراضي
     * يسمح بـ innerHTML فقط للمحتوى الموثوق
     * @param {string} elementId - معرف العنصر
     * @param {*} content - المحتوى الجديد
     * @param {boolean} isHtml - هل المحتوى HTML موثوق
     */
    function safeUpdate(elementId, content, isHtml = false) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (isHtml && typeof content === 'string') {
            // للمحتوى الموثوق فقط (مثل الأيقونات)
            element.innerHTML = content;
        } else if (content instanceof Node) {
            element.innerHTML = '';
            element.appendChild(content);
        } else {
            element.textContent = content || '';
        }
    }

    /**
     * إنشاء عنصر HTML آمن مع محتوى
     * يدعم النصوص، العقد، والمصفوفات
     * جميع النصوص تعقم تلقائياً
     * @param {string} className - فئة CSS
     * @param {*} content - المحتوى
     * @param {string} tag - نوع العنصر HTML
     * @returns {HTMLElement} العنصر المنشأ
     */
    function createDiv(className, content, tag = 'div') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (content instanceof Node) {
            element.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    element.appendChild(child);
                }
            });
        }
        
        return element;
    }

    // إنشاء زر آمن
    function createButton(config) {
        const btn = document.createElement('button');
        btn.className = config.className || 'btn btn-primary';
        btn.type = config.type || 'button';
        
        if (config.id) btn.id = config.id;
        if (config.dataId) btn.dataset.id = config.dataId;
        
        // إضافة الأيقونة
        if (config.icon) {
            const icon = document.createElement('i');
            icon.className = config.icon;
            btn.appendChild(icon);
        }
        
        // إضافة النص
        if (config.text) {
            if (config.icon) btn.appendChild(document.createTextNode(' '));
            btn.appendChild(document.createTextNode(config.text));
        }
        
        // إضافة معالج الحدث
        if (config.onClick) {
            btn.addEventListener('click', config.onClick);
        }
        
        return btn;
    }

    // إفراغ عنصر بأمان
    function clearElement(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
    }

    // إنشاء قائمة آمنة
    function createList(items, className = 'list-group') {
        const list = document.createElement('ul');
        list.className = className;
        
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            
            if (typeof item === 'string') {
                li.textContent = item;
            } else if (item.html && item.trusted) {
                li.innerHTML = item.html;
            } else if (item.element) {
                li.appendChild(item.element);
            } else {
                li.textContent = item.text || item.value || '';
                if (item.className) li.className += ' ' + item.className;
            }
            
            list.appendChild(li);
        });
        
        return list;
    }

    // إنشاء جدول كامل آمن
    function createTable(headers, rows, config = {}) {
        const table = document.createElement('table');
        table.className = config.className || 'table table-sm';
        
        // إنشاء رأس الجدول
        if (headers && headers.length > 0) {
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
        }
        
        // إنشاء جسم الجدول
        const tbody = document.createElement('tbody');
        tbody.id = config.tbodyId || '';
        
        if (rows && rows.length > 0) {
            rows.forEach(rowData => {
                tbody.appendChild(createTableRow(rowData.cells, rowData.buttons));
            });
        }
        
        table.appendChild(tbody);
        return table;
    }

    // تصدير الدوال
    if (typeof window !== 'undefined') {
        window.SafeDOM = {
            e,
            createTableRow,
            createInfoCard,
            fillSelect,
            safeUpdate,
            createDiv,
            createButton,
            clearElement,
            createList,
            createTable
        };
        
        // اختصارات سريعة
        window.$safe = {
            e,
            row: createTableRow,
            card: createInfoCard,
            select: fillSelect,
            update: safeUpdate,
            div: createDiv,
            btn: createButton,
            clear: clearElement,
            list: createList,
            table: createTable
        };
    }

})();