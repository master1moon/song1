/**
 * ملف storage.js - طبقة تخزين البيانات المتقدمة
 * يستخدم IndexedDB كوسيلة تخزين رئيسية مع localStorage كبديل
 * يوفر فهرسة للمصروفات لتحسين أداء البحث والفلترة
 * 
 * المشاكل المحتملة:
 * - لا يتم معالجة حالة رفض وعود IndexedDB بشكل صحيح
 * - مزامنة المصروفات قد تفشل بصمت دون إشعار المستخدم
 * - تطبيع التواريخ يحدث عند كل تحميل مما قد يبطئ التطبيق
 * - لا يوجد آلية للتعامل مع تجاوز حد التخزين
 */

// IndexedDB storage layer with graceful fallback to localStorage

/**
 * نظام التخزين باستخدام IndexedDB
 * يوفر تخزين متقدم للبيانات مع بديل localStorage
 * يدعم الفهرسة للمصروفات لتسريع البحث والفلترة
 * يحسن من أداء التطبيق مع البيانات الكبيرة
 */
(function(){
  const DB_NAME = 'networkCardsDB';
  const DB_VERSION = 5;
  const STORE = 'app';
  let dbPromise = null;

  /**
   * فتح قاعدة بيانات IndexedDB
   * ينشئ مخازن للتطبيق، النسخ الاحتياطية، واللقطات
   * يضيف فهارس للمصروفات لتحسين الأداء
   * @returns {Promise<IDBDatabase>} قاعدة البيانات
   */
  function openDB(){
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(e){
        const db = req.result;
        if (!db.objectStoreNames.contains('app')) db.createObjectStore('app');
        if (!db.objectStoreNames.contains('backup')) db.createObjectStore('backup');
        if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'id' });
        // expenses store with indexes to optimize date/type filters
        let exp;
        if (!db.objectStoreNames.contains('expenses')) {
          exp = db.createObjectStore('expenses', { keyPath: 'id' });
        } else {
          exp = req.transaction.objectStore('expenses');
        }
        if (exp) {
          try { exp.createIndex('date', 'date', { unique: false }); } catch(_){}
          try { exp.createIndex('type', 'type', { unique: false }); } catch(_){}
          try { exp.createIndex('date_type', ['date','type'], { unique: false }); } catch(_){}
        }
      };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
    return dbPromise;
  }

  /**
   * قراءة بيانات من IndexedDB
   * @param {string} storeKey - مفتاح البيانات
   * @returns {Promise<any>} البيانات المخزنة
   */
  async function idbGet(storeKey){
    try{
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const req = store.get(storeKey);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }catch(e){ return undefined; }
  }

  /**
   * حفظ بيانات في IndexedDB
   * @param {string} key - مفتاح التخزين
   * @param {any} value - البيانات للحفظ
   * @returns {Promise<boolean>} نجاح العملية
   */
  async function idbSet(key, value){
    try{
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const req = store.put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    }catch(e){ return false; }
  }

  /**
   * الحصول على مرجع بيانات التطبيق
   * يبحث عن البيانات في window.data أو data العامة
   * @returns {Object|undefined} كائن البيانات
   */
  function getDataRef(){
    try {
      if (typeof window !== 'undefined' && typeof window.data !== 'undefined') return window.data;
    } catch(_) {}
    try { if (typeof data !== 'undefined') return data; } catch(_) {}
    return undefined;
  }

  /**
   * مزامنة المصروفات مع IndexedDB
   * ينظف ويعيد ملء مخزن المصروفات
   * يستخدم لتسريع عمليات البحث والفلترة
   */
  async function syncExpensesToIndexed(){
    try {
      const db = await openDB();
      const tx = db.transaction('expenses', 'readwrite');
      const s = tx.objectStore('expenses');
      await new Promise((res,rej)=>{ const r = s.clear(); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); });
      const dref = getDataRef();
      const list = (dref && Array.isArray(dref.expenses)) ? dref.expenses : [];
      for (const exp of list) {
        await new Promise((res,rej)=>{ const r = s.put(exp); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); });
      }
      await new Promise((res,rej)=>{ tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); });
    } catch(_){}
  }

  const originalLoadData = window.loadData;
  const originalSaveData = window.saveData;

  /**
   * تحميل البيانات مع دعم IndexedDB
   * يحاول التحميل من IndexedDB أولاً
   * يطبع التواريخ بصيغة موحدة
   * يرسل حدث app-data-loaded عند الانتهاء
   * @returns {Promise<void>}
   */
  window.loadData = async function(){
    try{
      const stored = await idbGet('root');
      if (stored && typeof stored === 'object') {
        localStorage.setItem('networkCardsData', JSON.stringify(stored));
      }
    }catch(_){}
    const result = await originalLoadData();
    try {
      const normalizeDate = (d) => (typeof formatDateEn === 'function' ? formatDateEn(d) : (d||''));
      const dref = getDataRef();
      if (dref) {
        if (Array.isArray(dref.expenses)) dref.expenses.forEach(e => { e.date = normalizeDate(e.date); });
        if (Array.isArray(dref.sales)) dref.sales.forEach(s => { s.date = normalizeDate(s.date); });
        if (Array.isArray(dref.payments)) dref.payments.forEach(p => { p.date = normalizeDate(p.date); });
        // persist back if any changed
        window.saveData();
      }
      // notify that data is loaded and normalized
      try { document.dispatchEvent(new Event('app-data-loaded')); } catch(_) {}
    } catch(_) {}
    return result;
  };

  /**
   * حفظ البيانات مع دعم IndexedDB
   * يحفظ في localStorage وIndexedDB
   * يزامن المصروفات مع مخزن منفصل
   * @returns {void}
   */
  window.saveData = function(){
    const result = originalSaveData();
    try { const dref = getDataRef(); if (dref) { idbSet('root', dref); syncExpensesToIndexed(); } } catch(_){ }
    return result;
  };
})();