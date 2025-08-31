/**
 * ملف backupManager.js - نظام إدارة النسخ الاحتياطية المتقدم
 * يدير اللقطات (snapshots) في IndexedDB مع ميزات متقدمة
 * يدعم النسخ الاحتياطي التلقائي والاحتفاظ بعدد محدد من النسخ
 * يوفر واجهة لاستعادة وتصدير وحذف النسخ الاحتياطية
 * 
 * المشاكل المحتملة:
 * - معالجة الأخطاء بسيطة (catch فارغ في عدة أماكن)
 * - حساب checksum قد لا يكون دقيقاً للكائنات المعقدة
 * - لا يوجد تحقق من سلامة البيانات قبل الاستعادة
 * - قد يستهلك مساحة كبيرة مع الوقت
 * - لا يوجد ضغط للبيانات المخزنة
 */

// Advanced Backup Manager: snapshots in IndexedDB with auto-backup and retention
(function(){
  const DB_NAME = 'networkCardsDB';
  const DB_VERSION = 4;
  const STORE_SNAPSHOTS = 'snapshots';
  const STORE_BACKUP = 'backup'; // keep for compatibility

  let dbPromise = null;
  function openDB(){
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function(){
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_BACKUP)) db.createObjectStore(STORE_BACKUP);
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function idbGet(store, key){
    try { const db = await openDB(); return await new Promise((res, rej)=>{ const tx=db.transaction(store,'readonly'); const os=tx.objectStore(store); const r=os.get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); } catch { return undefined; }
  }
  async function idbPut(store, value){
    try { const db = await openDB(); return await new Promise((res, rej)=>{ const tx=db.transaction(store,'readwrite'); const os=tx.objectStore(store); const r=os.put(value); r.onsuccess=()=>res(true); r.onerror=()=>rej(r.error); }); } catch { return false; }
  }
  async function idbDelete(store, key){
    try { const db = await openDB(); return await new Promise((res, rej)=>{ const tx=db.transaction(store,'readwrite'); const os=tx.objectStore(store); const r=os.delete(key); r.onsuccess=()=>res(true); r.onerror=()=>rej(r.error); }); } catch { return false; }
  }
  async function idbAll(store){
    try { const db = await openDB(); return await new Promise((res, rej)=>{ const tx=db.transaction(store,'readonly'); const os=tx.objectStore(store); const r=os.getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error); }); } catch { return []; }
  }

  function checksum(obj){
    try { const s = JSON.stringify(obj); let h = 2166136261; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h += (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24); } return (h>>>0).toString(16); } catch { return '' }
  }

  const defaultSettings = { autoOnSave: false, retention: 10 };
  function loadSettings(){
    try { return Object.assign({}, defaultSettings, JSON.parse(localStorage.getItem('backupSettings')||'{}')); } catch { return Object.assign({}, defaultSettings); }
  }
  function saveSettings(s){ localStorage.setItem('backupSettings', JSON.stringify(s)); }

  async function listSnapshots(){
    const arr = await idbAll(STORE_SNAPSHOTS);
    return arr.sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''));
  }

  function getCurrentData(){ try { return (typeof data !== 'undefined') ? data : window.data; } catch { return window.data; } }
  function setCurrentData(obj){ try { if (typeof data !== 'undefined') { data = obj; } else { window.data = obj; } } catch { window.data = obj; } }

  async function createSnapshot(reason){
    const cur = getCurrentData();
    if (!cur) return null;
    const content = JSON.parse(JSON.stringify(cur));
    const snap = {
      id: 'snap_'+Date.now(),
      createdAt: new Date().toISOString(),
      reason: reason || '',
      checksum: checksum(content),
      size: JSON.stringify(content).length,
      counts: {
        packages: (content.packages||[]).length,
        inventory: (content.inventory||[]).length,
        stores: (content.stores||[]).length,
        expenses: (content.expenses||[]).length,
        sales: (content.sales||[]).length,
        payments: (content.payments||[]).length,
      },
      content
    };
    await idbPut(STORE_SNAPSHOTS, snap);
    return snap;
  }

  async function restoreSnapshot(id){
    const snap = await idbGet(STORE_SNAPSHOTS, id);
    if (!snap) { showNotification('تعذر العثور على النسخة', 'error'); return; }
    setCurrentData(JSON.parse(JSON.stringify(snap.content)));
    localStorage.setItem('networkCardsData', JSON.stringify(getCurrentData()));
    saveData();
    updateDashboard();
    renderPackagesTable();
    renderInventoryTable();
    renderStoresList();
    renderExpensesTable();
    updateReportStores();
    updateProfitReport();
    generateDebtReport();
    generatePartnerReports();
    showNotification('تم استعادة النسخة الاحتياطية بنجاح', 'success');
  }

  async function deleteSnapshot(id){ await idbDelete(STORE_SNAPSHOTS, id); }

  function exportSnapshot(snap){
    const filename = `backup_${(snap.createdAt||'').replace(/[:T\-]/g,'').slice(0, 15)}.json`;
    const dataStr = JSON.stringify(snap.content, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  async function enforceRetention(){
    const settings = loadSettings();
    const keep = Math.max(1, Number(settings.retention)||10);
    const snaps = await listSnapshots();
    const toDelete = snaps.slice(keep);
    await Promise.all(toDelete.map(s => idbDelete(STORE_SNAPSHOTS, s.id)));
  }

  async function maybeAutoBackup(tag){
    const settings = loadSettings();
    if (!settings.autoOnSave) return;
    const snaps = await listSnapshots();
    const last = snaps[0];
    const cur = checksum(window.data || {});
    if (last && last.checksum === cur) return; // no change
    await createSnapshot(tag||'auto');
    await enforceRetention();
  }

  async function renderUI(){
    const tbody = document.getElementById('snapshotsTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    const snaps = await listSnapshots();
    snaps.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="radio" name="snapshotSelect" value="${s.id}"></td>
        <td>${s.createdAt}</td>
        <td>${s.reason||'-'}</td>
        <td>${(s.size||0).toLocaleString('en-US')}</td>
        <td>${s.counts.packages}/${s.counts.inventory}/${s.counts.stores}/${s.counts.sales}/${s.counts.payments}/${s.counts.expenses}</td>
        <td><button class="btn btn-sm btn-outline-secondary" data-act="export" data-id="${s.id}"><i class="fas fa-download"></i></button>
            <button class="btn btn-sm btn-outline-danger" data-act="delete" data-id="${s.id}"><i class="fas fa-trash"></i></button></td>`;
      tbody.appendChild(tr);
    });
  }

  function getSelectedSnapshotId(){ const r = document.querySelector('input[name="snapshotSelect"]:checked'); return r ? r.value : ''; }

     document.addEventListener('DOMContentLoaded', function(){ // DOM ready is enough; DB open handles upgrade
    const btnCreate = document.getElementById('backupCreateBtn');
    const btnRestore = document.getElementById('backupRestoreBtn');
    const btnExport = document.getElementById('backupExportBtn');
    const btnDelete = document.getElementById('backupDeleteBtn');
    const autoChk = document.getElementById('backupAutoOnSave');
    const retentionInp = document.getElementById('backupRetention');

    // Init settings UI
    const s = loadSettings();
    if (autoChk) autoChk.checked = !!s.autoOnSave;
    if (retentionInp) retentionInp.value = s.retention;

    if (autoChk) autoChk.addEventListener('change', ()=>{ const st=loadSettings(); st.autoOnSave = autoChk.checked; saveSettings(st); showNotification('تم حفظ إعداد النسخ التلقائي', 'success'); });
    if (retentionInp) retentionInp.addEventListener('change', ()=>{ const st=loadSettings(); st.retention = Math.max(1, Number(retentionInp.value)||10); saveSettings(st); showNotification('تم تحديث حد الاحتفاظ', 'success'); });

    if (btnCreate) btnCreate.addEventListener('click', async ()=>{ await createSnapshot('manual'); await enforceRetention(); await renderUI(); showNotification('تم إنشاء نسخة احتياطية', 'success'); });
    if (btnRestore) btnRestore.addEventListener('click', async ()=>{ const id=getSelectedSnapshotId(); if (!id) { showNotification('اختر نسخة للاستعادة', 'error'); return; } await restoreSnapshot(id); });
    if (btnExport) btnExport.addEventListener('click', async ()=>{ const id=getSelectedSnapshotId(); if (!id) { showNotification('اختر نسخة للتصدير', 'error'); return; } const snap = await idbGet(STORE_SNAPSHOTS, id); if (snap) exportSnapshot(snap); });
    if (btnDelete) btnDelete.addEventListener('click', async ()=>{ const id=getSelectedSnapshotId(); if (!id) { showNotification('اختر نسخة للحذف', 'error'); return; } await deleteSnapshot(id); await renderUI(); showNotification('تم حذف النسخة', 'success'); });

    // Delegate row actions
    const table = document.getElementById('snapshotsTable');
    if (table) table.addEventListener('click', async (e)=>{
      const btn = e.target.closest('button[data-act]'); if (!btn) return;
      const id = btn.getAttribute('data-id'); const act = btn.getAttribute('data-act');
      if (act==='export'){ const snap = await idbGet(STORE_SNAPSHOTS, id); if (snap) exportSnapshot(snap); }
      if (act==='delete'){ await deleteSnapshot(id); await renderUI(); showNotification('تم حذف النسخة', 'success'); }
    });

    renderUI();
  });

  // Hook saveData for auto-backup
  const prevSave = window.saveData;
  window.saveData = function(){ const r = prevSave ? prevSave() : undefined; try { maybeAutoBackup('auto'); } catch{} return r; };

  // Expose for programmatic use
  window.__backupManager = { createSnapshot, listSnapshots, restoreSnapshot, deleteSnapshot };
})();