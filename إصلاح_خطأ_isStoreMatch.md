# إصلاح خطأ "isStoreMatch not defined"

## المشكلة
عند استيراد ملف نسخة احتياطية قديمة، كان يظهر الخطأ:
```
حدث خطأ غير متوقع: isStoreMatch not defined
```

## السبب
الدالة `isStoreMatch` كانت تُستخدم في عدة أماكن في ملف `reports.js` لكنها لم تكن معرّفة.

## الحل المطبق

### 1. إضافة دالة isStoreMatch
تم إضافة الدالة في بداية ملف `js/reports.js`:
```javascript
// دالة للتحقق من تطابق المحل مع الفلتر
function isStoreMatch(item) {
  const storeFilter = (document.getElementById('reportsStoreFilter')?.value) || 'all';
  if (storeFilter === 'all') return true;
  return String(item.storeId || '') === String(storeFilter);
}
```

### 2. إضافة التحقق من البيانات
تم إضافة تحقق من وجود البيانات في جميع الدوال التي تستخدم `isStoreMatch`:
- `updateProfitReport()`
- `exportPartnerReport()`
- `renderQuickSummaries()`

### 3. حماية من الأخطاء
تم تغيير جميع استخدامات `data.sales` إلى `(data.sales || [])` لتجنب أخطاء null/undefined.

## الملفات المعدلة
- `/workspace/js/reports.js` - إضافة الدالة المفقودة وحماية البيانات

## كيفية التحقق من الإصلاح
1. افتح التطبيق
2. استورد ملف النسخة الاحتياطية القديمة
3. يجب أن يتم الاستيراد بنجاح دون أخطاء
4. تحقق من أن التقارير تعمل بشكل صحيح

## ملاحظات
- هذا الخطأ كان يحدث لأن النسخ القديمة قد تحتوي على بيانات بتنسيق مختلف قليلاً
- الإصلاح يضمن التوافق مع النسخ القديمة والجديدة