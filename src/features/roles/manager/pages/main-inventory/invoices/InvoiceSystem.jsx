import React, { useEffect, useState, useMemo, useRef, Component } from "react";
import { FileText, PlusCircle, Search, Printer, X, Menu, ChevronDown, ChevronUp, Edit, Trash2, Eye, Download, RotateCcw } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Card, CardContent, CardHeader, CardTitle } from "@/features/roles/manager/ui/card";
import { Button } from "@/features/roles/manager/ui/Button";
import { Input } from "@/features/roles/manager/ui/Input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/features/roles/manager/ui/Dialog";
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Firebase imports
import { 
  collection, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/services/firebase';

// Error Boundary Component
class InvoiceErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center text-red-500 dark:text-red-400 p-4">
          <p>حدث خطأ: {this.state.error.message}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
          >
            إعادة تحميل
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Utility functions
const parseNumber = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatCurrency = (number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parseNumber(number));
};

const formatDate = (date) => {
  if (!date) return 'غير متوفر';
  const parsedDate = date.toDate ? date.toDate() : new Date(date);
  if (isNaN(parsedDate.getTime())) return 'تاريخ غير صالح';
  return parsedDate.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Map invoice types for display
const getInvoiceTypeDisplay = (type) => {
  const typeMap = {
    'SALE': 'بيع',
    'PURCHASE': 'شراء',
    'FACTORY_DISPATCH': 'صرف المصنع',
    'SALE_RETURN': 'مرتجع بيع',
    'PURCHASE_RETURN': 'مرتجع شراء',
    'FACTORY_RETURN': 'مرتجع المصنع'
  };
  return typeMap[type] || type;
};

// Printable Invoice Component
const InvoicePrint = React.forwardRef(({ invoice }, ref) => {
  const handleExportToPDF = async () => {
    const input = document.getElementById('invoice-content');
    if (!input) return;
    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`فاتورة_${invoice.invoice_number || 'فاتورة'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleExportToExcel = () => {
    const wb = XLSX.utils.book_new();
    let ws;
   
    if (invoice.invoice_type === 'FACTORY_DISPATCH') {
      ws = XLSX.utils.json_to_sheet([
        { A: `إذن تسليم زجاج رقم: ${invoice.invoice_number || 'غير متوفر'}` },
        { A: `تاريخ الإصدار: ${formatDate(invoice.invoice_date)}` },
        { A: `منصرف إلى: ${invoice.recipient || 'غير متوفر'}` },
        { A: `ملاحظات: ${invoice.notes || 'لا توجد'}` },
        { A: "" },
        { A: "الأصناف" },
      ], { skipHeader: true });
      const itemsData = (invoice.details || []).map((d, index) => ({
        "م": index + 1,
        "الكود/التشغيله": d.item_code || '-',
        "اسم الصنف/الوصف": d.item_name || '-',
        "اللون": d.color || '-',
        "الوحدة": d.unit || '-',
        "الكمية": d.quantity || 0,
        "ملاحظات": d.notes || '-',
      }));
      XLSX.utils.sheet_add_json(ws, itemsData, { origin: -1 });
      XLSX.utils.book_append_sheet(wb, ws, "إذن تسليم زجاج");
      XLSX.writeFile(wb, `إذن_تسليم_زجاج_${invoice.invoice_number || 'إذن'}.xlsx`);
    } else {
      ws = XLSX.utils.json_to_sheet([
        { A: `فاتورة رقم: ${invoice.invoice_number || 'غير متوفر'}` },
        { A: `تاريخ الإصدار: ${formatDate(invoice.invoice_date)}` },
        { A: `نوع الفاتورة: ${getInvoiceTypeDisplay(invoice.invoice_type)}` },
        { A: `العميل: ${invoice.client_name || 'غير متوفر'}` },
        ...(invoice.invoice_type === 'SALE' ? [{ A: `رقم هاتف العميل: ${invoice.client_phone || 'غير متوفر'}` }] : []),
        { A: `المورد: ${invoice.supplier_name || 'غير متوفر'}` },
        { A: `ملاحظات: ${invoice.notes || 'لا توجد'}` },
        { A: "" },
        { A: "الأصناف" },
      ], { skipHeader: true });
      const itemsData = (invoice.details || []).map((d, index) => ({
        "الصنف": d.item_name || '-',
        "الكود": d.item_code || '-',
        "اللون": d.color || '-',
        "الكمية": d.quantity || 0,
        "سعر الوحدة (جنيه)": formatCurrency(d.unit_price),
        "الإجمالي (جنيه)": formatCurrency(parseNumber(d.quantity) * parseNumber(d.unit_price)),
      }));
      XLSX.utils.sheet_add_json(ws, itemsData, { origin: -1 });
      XLSX.utils.sheet_add_json(ws, [
        { "الصنف": "الإجمالي الكلي", "الإجمالي (جنيه)": formatCurrency(invoice.total_amount) }
      ], { origin: -1, skipHeader: true });
      XLSX.utils.book_append_sheet(wb, ws, "فاتورة");
      XLSX.writeFile(wb, `فاتورة_${invoice.invoice_number || 'فاتورة'}.xlsx`);
    }
  };

  if (!invoice || !invoice.details) {
    return null;
  }

  const totalQuantity = invoice.details.reduce((sum, d) => sum + parseNumber(d.quantity), 0);
  const displayType = getInvoiceTypeDisplay(invoice.invoice_type);

  return (
    <div dir="rtl" className="font-tajawal text-right">
      <div id="invoice-content" ref={ref} className="p-6 bg-white dark:bg-gray-800 print-content relative" style={{ width: '210mm', minHeight: '297mm' }}>
        {/* Watermark Logo */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 z-0">
          <div className="text-6xl font-bold text-gray-400 dark:text-gray-600">EL BARAN</div>
        </div>

        {/* Company Header */}
        <div className="flex justify-between items-start mb-6 border-b-2 border-gray-300 dark:border-gray-600 pb-4">
          <div className="text-left">
            <div className="text-sm text-gray-600 dark:text-gray-400">نظام إدارة الفواتير</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">#{invoice.invoice_number || "غير متوفر"}</div>
          </div>
          <div className="flex flex-col items-center">
            <img
              src="/logo.png"
              alt="EL BARAN Logo"
              className="w-16 h-16 object-cover rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div className="text-sm font-bold text-gray-800 dark:text-white mt-2">EL BARAN</div>
          </div>
        </div>

        {invoice.invoice_type === 'FACTORY_DISPATCH' ? (
          <>
            {/* Factory Dispatch Invoice */}
            <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border-teal-200 dark:border-teal-800">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">تفاصيل إذن التسليم</h3>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">رقم:</span> {invoice.invoice_number || 'غير متوفر'}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">التاريخ:</span> {formatDate(invoice.invoice_date)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">بيانات التسليم</h3>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">منصرف إلى:</span> {invoice.recipient || 'غير متوفر'}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">أنشأها:</span> {invoice.created_by_username || 'غير متوفر'}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">اذن تسليم زجاج</h1>
              </div>
              <table className="w-full border-collapse border border-gray-800 dark:border-gray-400 text-sm mb-6">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700">
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold w-12 text-gray-800 dark:text-white">م</th>
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold min-w-[150px] text-gray-800 dark:text-white">الصنف</th>
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold min-w-[100px] text-gray-800 dark:text-white">الكود</th>
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold min-w-[100px] text-gray-800 dark:text-white">اللون</th>
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold min-w-[80px] text-gray-800 dark:text-white">الوحدة</th>
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold min-w-[80px] text-gray-800 dark:text-white">الكمية</th>
                    <th className="border border-gray-800 dark:border-gray-400 p-2 font-bold min-w-[150px] text-gray-800 dark:text-white">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.details || []).map((d, index) => (
                    <tr key={index} className="border-b border-gray-800 dark:border-gray-400">
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300">{index + 1}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-gray-700 dark:text-gray-300">{d.item_name || ''}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-gray-700 dark:text-gray-300">{d.item_code || ''}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-gray-700 dark:text-gray-300">{d.color || ''}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-gray-700 dark:text-gray-300">{d.unit || ''}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300">{d.quantity || ''}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-gray-700 dark:text-gray-300">{d.notes || ''}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 15 - (invoice.details?.length || 0)) }).map((_, index) => (
                    <tr key={`empty-${index}`}>
                      <td className="border border-gray-800 dark:border-gray-400 p-2 text-center text-gray-700 dark:text-gray-300">{(invoice.details?.length || 0) + index + 1}</td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                      <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <td colSpan={5} className="border border-gray-800 dark:border-gray-400 p-2 text-center font-bold text-gray-800 dark:text-white">المجموع</td>
                    <td className="border border-gray-800 dark:border-gray-400 p-2 text-center font-bold text-gray-800 dark:text-white">{totalQuantity}</td>
                    <td className="border border-gray-800 dark:border-gray-400 p-2"></td>
                  </tr>
                </tfoot>
              </table>
              {invoice.notes && (
                <Card className="mt-4 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  <CardContent className="p-4">
                    <span className="font-bold text-gray-800 dark:text-white">ملاحظات: </span>
                    <span className="text-gray-700 dark:text-gray-300">{invoice.notes}</span>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Regular Invoice */}
            <div className="relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border-teal-200 dark:border-teal-800">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">تفاصيل الفاتورة</h3>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">فاتورة رقم:</span> {invoice.invoice_number || 'غير متوفر'}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">تاريخ الإصدار:</span> {formatDate(invoice.invoice_date)}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">نوع الفاتورة:</span> {displayType}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">أنشأها:</span> {invoice.created_by_username || 'غير متوفر'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">بيانات العميل / المورد</h3>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">العميل:</span> {invoice.client_name || 'غير متوفر'}</p>
                    {invoice.invoice_type === 'SALE' && (
                      <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">رقم هاتف العميل:</span> {invoice.client_phone || 'غير متوفر'}</p>
                    )}
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">المورد:</span> {invoice.supplier_name || 'غير متوفر'}</p>
                    <p className="text-gray-700 dark:text-gray-300"><span className="font-bold">ملاحظات:</span> {invoice.notes || 'لا توجد'}</p>
                  </CardContent>
                </Card>
              </div>
              <table className="w-full border-collapse mb-6 text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold min-w-[150px] text-gray-800 dark:text-white">الصنف</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold min-w-[100px] text-gray-800 dark:text-white">الكود</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold min-w-[100px] text-gray-800 dark:text-white">اللون</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold min-w-[80px] text-gray-800 dark:text-white">الكمية</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold min-w-[100px] text-gray-800 dark:text-white">سعر الوحدة (جنيه)</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold min-w-[100px] text-gray-800 dark:text-white">الإجمالي (جنيه)</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.details || []).map((d, index) => (
                    <tr key={index} className="border-b border-gray-300 dark:border-gray-600">
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-right text-gray-700 dark:text-gray-300">{d.item_name || '-'}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-gray-700 dark:text-gray-300">{d.item_code || '-'}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-gray-700 dark:text-gray-300">{d.color || '-'}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-center text-gray-700 dark:text-gray-300">{d.quantity || 0}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(d.unit_price)}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-right text-gray-700 dark:text-gray-300">
                        {formatCurrency(parseNumber(d.quantity) * parseNumber(d.unit_price))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <td colSpan={5} className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold text-gray-800 dark:text-white">الإجمالي الكلي</td>
                    <td className="border border-gray-300 dark:border-gray-600 p-3 text-right font-bold text-gray-800 dark:text-white">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        <div className="relative z-10 text-center text-gray-600 dark:text-gray-400 mt-6">
          <p className="text-sm">نشكر ثقتكم بمنتجاتنا 🌸</p>
          {invoice.invoice_type !== 'FACTORY_DISPATCH' && (
            <p className="text-sm">سياسة الاسترجاع: خلال 14 يوم من تاريخ الفاتورة مع الاحتفاظ بالعبوة الأصلية.</p>
          )}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <Button
          onClick={handleExportToPDF}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
        >
          <Download size={16} /> تحميل PDF
        </Button>
        <Button
          onClick={handleExportToExcel}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
        >
          تصدير إلى Excel
        </Button>
      </div>
    </div>
  );
});

InvoicePrint.displayName = 'InvoicePrint';

// Factory Return Dialog Component
const FactoryReturnDialog = ({ invoice, user, onSuccess, onCancel }) => {
  const [returnType, setReturnType] = useState('زجاج فقط');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!invoice?.id || !user?.id) {
      setError('بيانات غير صالحة');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Generate return invoice number
      const returnInvoiceNumber = `RET-${invoice.invoice_number}-${Date.now()}`;
      
      // Create return invoice in Firestore
      const returnInvoiceData = {
        invoice_number: returnInvoiceNumber,
        invoice_type: 'FACTORY_RETURN',
        original_invoice_id: invoice.id,
        original_invoice_number: invoice.invoice_number,
        return_type: returnType,
        recipient: invoice.recipient,
        details: invoice.details,
        notes: notes || undefined,
        created_by: user.id,
        created_by_username: user.username,
        created_at: Timestamp.now(),
        total_amount: 0
      };

      const docRef = await addDoc(collection(db, 'invoices'), returnInvoiceData);

      // Update stock quantities in main inventory
      const updatePromises = invoice.details.map(async (detail) => {
        if (detail.stock_id) {
          const stockRef = doc(db, 'warehouseItems', detail.stock_id);
          try {
            const stockDoc = await getDoc(stockRef);
            if (stockDoc.exists()) {
              const stockData = stockDoc.data();
              const newQuantity = (stockData.remaining_quantity || 0) + parseNumber(detail.quantity);
              await updateDoc(stockRef, {
                remaining_quantity: newQuantity,
                updatedAt: Timestamp.now()
              });
            }
          } catch (stockErr) {
            console.error('Error updating stock for return:', stockErr);
          }
        }
      });

      await Promise.all(updatePromises);

      onSuccess({
        success: true,
        return_invoice_number: returnInvoiceNumber,
        message: 'تم معالجة مرتجع المصنع بنجاح'
      });
    } catch (err) {
      console.error('Factory return error:', err);
      setError(err.message || 'حدث خطأ أثناء معالجة المرتجع');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-800 dark:text-white">
            مرتجع صرف المصنع
          </DialogTitle>
          <DialogDescription>
            معالجة مرتجع لفاتورة صرف المصنع رقم: {invoice?.invoice_number}
          </DialogDescription>
        </DialogHeader>
       
        <div className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 p-2 bg-red-50 rounded-md">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              نوع المرتجع
            </label>
            <select
              value={returnType}
              onChange={(e) => setReturnType(e.target.value)}
              className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            >
              <option value="زجاج فقط">زجاج فقط</option>
              <option value="زجاج مع الإكسسوارات">زجاج مع الإكسسوارات</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات المرتجع
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أدخل ملاحظات المرتجع (اختياري)"
              className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              {submitting ? 'جاري المعالجة...' : 'معالجة المرتجع'}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Create Invoice Form Component
function CreateInvoiceForm({ clients, suppliers, stockItems, user, onCreated, onCancel, isEdit, initialData }) {
  const [type, setType] = useState(initialData?.invoice_type || "SALE");
  const [party, setParty] = useState(initialData ? (initialData.invoice_type === 'SALE' ? initialData.client_name : initialData.invoice_type === 'PURCHASE' ? initialData.supplier_name : initialData.recipient) : "");
  const [clientPhone, setClientPhone] = useState(initialData?.client_phone || "");
  const [details, setDetails] = useState(initialData?.details || []);
  const [selectedItem, setSelectedItem] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("");
  const [itemNotes, setItemNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [notes, setNotes] = useState(initialData?.notes || "");

  const filteredItems = useMemo(() => {
    if (!itemSearch) return stockItems;
    return stockItems.filter(item =>
      (item.item_name || '').toLowerCase().includes(itemSearch.toLowerCase()) ||
      (item.item_code || '').toLowerCase().includes(itemSearch.toLowerCase()) ||
      (item.color || '').toLowerCase().includes(itemSearch.toLowerCase())
    );
  }, [stockItems, itemSearch]);

  const totalQty = details.reduce((sum, d) => sum + parseNumber(d.quantity), 0);
  const total = type !== 'FACTORY_DISPATCH' ? details.reduce((s, d) => s + (parseNumber(d.quantity) * parseNumber(d.unit_price)), 0) : 0;

  const addLine = () => {
    if (!selectedItem || qty <= 0) {
      setError("يرجى إكمال بيانات الصنف: الصنف والكمية");
      return;
    }
   
    if (type !== 'FACTORY_DISPATCH' && (!price || parseFloat(price) <= 0)) {
      setError("يرجى إدخال سعر الوحدة (يجب أن يكون أكبر من 0)");
      return;
    }
   
    const item = stockItems.find(s => String(s.id) === String(selectedItem));
    if (!item) {
      setError("الصنف غير موجود");
      return;
    }
   
    if ((type === 'SALE' || type === 'FACTORY_DISPATCH') && item.remaining_quantity < qty) {
      setError(`الكمية غير كافية للصنف ${item.item_name}: المتوفر ${item.remaining_quantity}، المطلوب ${qty}`);
      return;
    }
   
    const existingItemIndex = details.findIndex(d => d.stock_id === item.id);
   
    const newDetail = {
      stock_id: item.id,
      item_name: item.item_name,
      item_code: item.item_code,
      color: item.color,
      quantity: parseInt(qty),
    };
    if (type !== 'FACTORY_DISPATCH') {
      newDetail.unit_price = parseFloat(price) || 0;
    } else {
      newDetail.unit = unit || '';
      newDetail.notes = itemNotes || '';
    }
    if (existingItemIndex >= 0) {
      const updatedDetails = [...details];
      updatedDetails[existingItemIndex] = {
        ...updatedDetails[existingItemIndex],
        quantity: parseInt(updatedDetails[existingItemIndex].quantity) + parseInt(qty),
        ...(type !== 'FACTORY_DISPATCH' && { unit_price: parseFloat(price) || 0 }),
        ...(type === 'FACTORY_DISPATCH' && { unit: unit || '', notes: itemNotes || '' })
      };
      setDetails(updatedDetails);
    } else {
      setDetails([...details, newDetail]);
    }
   
    setSelectedItem("");
    setQty(1);
    setPrice("");
    setUnit("");
    setItemNotes("");
    setError("");
    setShowItemForm(false);
    setItemSearch("");
  };

  const removeDetail = (index) => {
    const newDetails = [...details];
    newDetails.splice(index, 1);
    setDetails(newDetails);
  };

  const updateDetail = (index, field, value) => {
    const newDetails = [...details];
    const item = stockItems.find(s => s.id === newDetails[index].stock_id);
    if (field === 'quantity' && (type === 'SALE' || type === 'FACTORY_DISPATCH') && item && parseInt(value) > item.remaining_quantity) {
      setError(`الكمية غير كافية للصنف ${item.item_name}: المتوفر ${item.remaining_quantity}، المطلوب ${value}`);
      return;
    }
    newDetails[index] = {
      ...newDetails[index],
      [field]: field === 'quantity' ? parseInt(value) || 0 : field === 'unit_price' ? parseFloat(value) || 0 : value
    };
    setDetails(newDetails);
  };

  const submit = async () => {
    if (!user?.id) {
      setError("بيانات المستخدم غير صالحة");
      return;
    }
    if (!party) {
      setError("يرجى إدخال اسم العميل أو المورد أو الجهة المنصرف إليها");
      return;
    }
    if (type === 'SALE' && !clientPhone) {
      setError("يرجى إدخال رقم هاتف العميل");
      return;
    }
    if (type === 'SALE' && !/^\+?\d+$/.test(clientPhone)) {
      setError("رقم هاتف العميل يجب أن يحتوي على أرقام فقط (يمكن أن يبدأ بـ +)");
      return;
    }
    if (details.length === 0) {
      setError("أضف صنفًا واحدًا على الأقل");
      return;
    }
    setSubmitting(true);
    try {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const invoiceData = {
        invoice_number: invoiceNumber,
        invoice_type: type,
        client_name: type === "SALE" ? party : null,
        client_phone: type === "SALE" ? clientPhone : null,
        supplier_name: type === "PURCHASE" ? party : null,
        recipient: type === "FACTORY_DISPATCH" ? party : null,
        details: details,
        notes: notes || '',
        total_amount: type !== 'FACTORY_DISPATCH' ? total : 0,
        created_by: user.id,
        created_by_username: user.username,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };

      if (isEdit) {
        if (!initialData?.id) {
          throw new Error("معرف الفاتورة غير صالح");
        }
        // Restore original quantities first
        if (initialData.details) {
          const restorePromises = initialData.details.map(async (detail) => {
            if (detail.stock_id) {
              const stockRef = doc(db, 'warehouseItems', detail.stock_id);
              try {
                const stockDoc = await getDoc(stockRef);
                if (stockDoc.exists()) {
                  const stockData = stockDoc.data();
                  const newQuantity = (stockData.remaining_quantity || 0) + parseNumber(detail.quantity);
                  await updateDoc(stockRef, {
                    remaining_quantity: newQuantity,
                    updatedAt: Timestamp.now()
                  });
                }
              } catch (stockErr) {
                console.error('Error restoring stock:', stockErr);
              }
            }
          });
          await Promise.all(restorePromises);
        }

        // Update invoice
        invoiceData.updated_at = Timestamp.now();
        await updateDoc(doc(db, 'invoices', initialData.id), invoiceData);
      } else {
        await addDoc(collection(db, 'invoices'), invoiceData);
      }

      // Update stock quantities in main inventory only
      const updatePromises = details.map(async (detail) => {
        if (detail.stock_id && (type === 'SALE' || type === 'FACTORY_DISPATCH')) {
          const stockRef = doc(db, 'warehouseItems', detail.stock_id);
          try {
            const stockDoc = await getDoc(stockRef);
            if (stockDoc.exists()) {
              const stockData = stockDoc.data();
              const newQuantity = (stockData.remaining_quantity || 0) - parseNumber(detail.quantity);
              await updateDoc(stockRef, {
                remaining_quantity: Math.max(0, newQuantity),
                updatedAt: Timestamp.now()
              });
            }
          } catch (stockErr) {
            console.error('Error updating stock:', stockErr);
          }
        }
      });

      await Promise.all(updatePromises);
      onCreated();
    } catch (err) {
      console.error('Firebase Error:', err);
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 font-tajawal">
      {error && <div className="text-sm text-red-600 p-2 bg-red-50 rounded-md">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الفاتورة</label>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setParty("");
              setClientPhone("");
              setDetails([]);
            }}
            className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
          >
            <option value="SALE">فاتورة بيع</option>
            <option value="PURCHASE">فاتورة شراء</option>
            <option value="FACTORY_DISPATCH">صرف المصنع</option>
          </select>
        </div>
        <div className={type === 'SALE' ? 'md:col-span-1' : 'md:col-span-2'}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {type === 'SALE' ? 'اسم العميل' : type === 'PURCHASE' ? 'اسم المورد' : 'منصرف إلى'}
          </label>
          <Input
            value={party}
            onChange={(e) => setParty(e.target.value)}
            placeholder={`أدخل ${type === 'SALE' ? 'اسم العميل' : type === 'PURCHASE' ? 'اسم المورد' : 'الجهة المنصرف إليها'}`}
            className="p-2 border rounded w-full"
          />
        </div>
        {type === 'SALE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم هاتف العميل</label>
            <Input
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="أدخل رقم هاتف العميل (مثال: +966123456789)"
              className="p-2 border rounded w-full"
            />
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أدخل ملاحظات الفاتورة (اختياري)"
          className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
          rows={3}
        />
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-semibold text-gray-800 dark:text-white">الأصناف</h3>
          <Button
            onClick={() => setShowItemForm(!showItemForm)}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
          >
            {showItemForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showItemForm ? 'إخفاء' : 'إضافة صنف'}
          </Button>
        </div>
       
        {showItemForm && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4 space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="ابحث بالصنف، الكود أو اللون..."
                className="pl-10 pr-4 w-full"
              />
            </div>
           
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-600">
                    <th className="p-2 text-gray-800 dark:text-white">الصنف</th>
                    <th className="p-2 text-gray-800 dark:text-white">الكود</th>
                    <th className="p-2 text-gray-800 dark:text-white">اللون</th>
                    <th className="p-2 text-gray-800 dark:text-white">المتاح</th>
                    {type !== 'FACTORY_DISPATCH' && <th className="p-2 text-gray-800 dark:text-white">سعر الوحدة</th>}
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item.id} className="border-b border-gray-200 dark:border-gray-600">
                      <td className="p-2 text-gray-700 dark:text-gray-300">{item.item_name || '-'}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{item.item_code || '-'}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{item.color || '-'}</td>
                      <td className="p-2 text-gray-700 dark:text-gray-300">{item.remaining_quantity || 0}</td>
                      {type !== 'FACTORY_DISPATCH' && (
                        <td className="p-2 text-gray-700 dark:text-gray-300">{parseNumber(item.unit_price).toFixed(2)}</td>
                      )}
                      <td className="p-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedItem(String(item.id));
                            setPrice(item.unit_price || '');
                            setUnit(item.unit || '');
                            setItemNotes('');
                          }}
                          className="bg-teal-500 hover:bg-teal-600 text-white"
                        >
                          اختر
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الصنف</label>
                <select
                  value={selectedItem}
                  onChange={(e) => {
                    const item = stockItems.find(s => String(s.id) === String(e.target.value));
                    setSelectedItem(e.target.value);
                    setPrice(item?.unit_price || '');
                    setUnit(item?.unit || '');
                    setItemNotes('');
                  }}
                  className="p-2 border rounded w-full bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="">اختر صنف</option>
                  {stockItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.item_name} {item.color ? `(${item.color})` : ''} {item.item_code ? `[${item.item_code}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الكمية</label>
                <Input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                  placeholder="أدخل الكمية"
                  className="p-2 border rounded w-full"
                />
              </div>
              {type !== 'FACTORY_DISPATCH' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">سعر الوحدة</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="أدخل سعر الوحدة"
                    className="p-2 border rounded w-full"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوحدة</label>
                    <Input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="أدخل الوحدة"
                      className="p-2 border rounded w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات الصنف</label>
                    <Input
                      value={itemNotes}
                      onChange={(e) => setItemNotes(e.target.value)}
                      placeholder="أدخل ملاحظات الصنف"
                      className="p-2 border rounded w-full"
                    />
                  </div>
                </>
              )}
            </div>
            <Button
              onClick={addLine}
              className="w-full mt-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              إضافة الصنف
            </Button>
          </div>
        )}
      </div>
      {details.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-md font-semibold text-gray-800 dark:text-white mb-2">الأصناف المضافة</h3>
          <div className="overflow-x-auto">
            <table className={`w-full text-sm ${type === 'FACTORY_DISPATCH' ? 'elastic-table' : ''}`}>
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr className="text-right">
                  <th className="p-3 text-gray-800 dark:text-white">الصنف</th>
                  <th className="p-3 text-gray-800 dark:text-white">الكود</th>
                  <th className="p-3 text-gray-800 dark:text-white">اللون</th>
                  <th className="p-3 text-gray-800 dark:text-white">الكمية</th>
                  {type !== 'FACTORY_DISPATCH' ? (
                    <>
                      <th className="p-3 text-gray-800 dark:text-white">سعر الوحدة</th>
                      <th className="p-3 text-gray-800 dark:text-white">الإجمالي</th>
                    </>
                  ) : (
                    <>
                      <th className="p-3 text-gray-800 dark:text-white">الوحدة</th>
                      <th className="p-3 text-gray-800 dark:text-white">ملاحظات</th>
                    </>
                  )}
                  <th className="p-3 text-gray-800 dark:text-white">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {details.map((detail, index) => (
                  <tr key={index} className="border-b border-gray-200 dark:border-gray-600">
                    <td className="p-3 text-gray-700 dark:text-gray-300">{detail.item_name || '-'}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{detail.item_code || '-'}</td>
                    <td className="p-3 text-gray-700 dark:text-gray-300">{detail.color || '-'}</td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min="1"
                        value={detail.quantity}
                        onChange={(e) => updateDetail(index, 'quantity', e.target.value)}
                        className="p-2 border rounded w-20 text-center"
                      />
                    </td>
                    {type !== 'FACTORY_DISPATCH' ? (
                      <>
                        <td className="p-3">
                          <Input
                            type="number"
                            step="0.01"
                            value={detail.unit_price}
                            onChange={(e) => updateDetail(index, 'unit_price', e.target.value)}
                            className="p-2 border rounded w-24 text-center"
                          />
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">
                          {(parseNumber(detail.quantity) * parseNumber(detail.unit_price)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3">
                          <Input
                            value={detail.unit}
                            onChange={(e) => updateDetail(index, 'unit', e.target.value)}
                            className="p-2 border rounded w-24 text-center"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={detail.notes}
                            onChange={(e) => updateDetail(index, 'notes', e.target.value)}
                            className="p-2 border rounded w-32 text-center"
                          />
                        </td>
                      </>
                    )}
                    <td className="p-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeDetail(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-gray-100"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={type !== 'FACTORY_DISPATCH' ? 4 : 3} className="p-3 text-right font-bold text-gray-800 dark:text-white">
                    {type !== 'FACTORY_DISPATCH' ? 'إجمالي الكمية' : 'الإجمالي'}
                  </td>
                  <td className="p-3 text-right font-bold text-gray-800 dark:text-white">{totalQty}</td>
                  {type !== 'FACTORY_DISPATCH' && (
                    <>
                      <td className="p-3"></td>
                      <td className="p-3 text-right font-bold text-gray-800 dark:text-white">
                        {total.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه
                      </td>
                    </>
                  )}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <Button
          onClick={submit}
          disabled={submitting}
          className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
        >
          {submitting ? 'جاري الحفظ...' : isEdit ? 'تحديث الفاتورة' : 'إنشاء الفاتورة'}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1 border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
        >
          إلغاء
        </Button>
      </div>
    </div>
  );
}

// Main Invoice System Component
export default function InvoiceSystemRedesign() {
  const [invoices, setInvoices] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClientListOpen, setIsClientListOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [selectedForReturn, setSelectedForReturn] = useState(null);
  const printRef = useRef();

  // Mock user data (replace with actual user management)
  const user = {
    id: 'manager-1',
    username: 'المدير',
    role: 'manager' // or 'superadmin'
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch invoices - SIMPLE QUERY without complex constraints
      const invoicesQuery = query(
        collection(db, 'invoices'), 
        orderBy('created_at', 'desc')
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const invoicesData = invoicesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setInvoices(invoicesData);

      // Fetch stock items - SIMPLE QUERY without complex filters
      const stockQuery = query(
        collection(db, 'warehouseItems'), 
        orderBy('createdAt', 'desc')
      );
      const stockSnapshot = await getDocs(stockQuery);
      const stockData = stockSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setStockItems(stockData);

      // Extract clients and suppliers from invoices
      const clientsMap = new Map();
      const suppliersMap = new Map();

      invoicesData.forEach(invoice => {
        if (invoice.client_name && invoice.client_phone) {
          clientsMap.set(invoice.client_phone, {
            name: invoice.client_name,
            phone: invoice.client_phone,
            type: 'عادي',
            notes: `آخر فاتورة: ${invoice.invoice_number}`
          });
        }
        if (invoice.supplier_name) {
          suppliersMap.set(invoice.supplier_name, {
            name: invoice.supplier_name,
            type: 'مورد'
          });
        }
      });

      setClients(Array.from(clientsMap.values()));
      setSuppliers(Array.from(suppliersMap.values()));
      setError(null);
    } catch (err) {
      console.error('Fetch Error:', err);
      setError(err.message || "فشل في تحميل البيانات. حاول مرة أخرى لاحقًا.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        String(inv.invoice_number || '').toLowerCase().includes(q) ||
        (inv.client_name || '').toLowerCase().includes(q) ||
        (inv.supplier_name || '').toLowerCase().includes(q) ||
        (inv.recipient || '').toLowerCase().includes(q) ||
        (inv.client_phone || '').includes(q) ||
        (inv.created_by_username || '').toLowerCase().includes(q)
      );
    });
  }, [invoices, query]);

  const totalSales = useMemo(() => {
    return invoices.reduce((sum, inv) =>
      inv.invoice_type !== 'FACTORY_DISPATCH' ? sum + parseNumber(inv.total_amount) : sum, 0);
  }, [invoices]);

  const invoiceClients = useMemo(() => {
    const clientMap = new Map();
    invoices.forEach(inv => {
      if (inv.client_name && inv.client_phone) {
        clientMap.set(inv.client_phone, {
          name: inv.client_name,
          phone: inv.client_phone,
          type: 'عادي',
          notes: `آخر فاتورة: ${inv.invoice_number}`
        });
      }
    });
    return Array.from(clientMap.values());
  }, [invoices]);

  const handleDeleteInvoice = async (invoiceId) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
      try {
        // First restore stock quantities
        const invoiceDocRef = doc(db, 'invoices', invoiceId);
        const invoiceDocSnap = await getDoc(invoiceDocRef);
        
        if (invoiceDocSnap.exists()) {
          const invoiceData = invoiceDocSnap.data();
          if (invoiceData.details && (invoiceData.invoice_type === 'SALE' || invoiceData.invoice_type === 'FACTORY_DISPATCH')) {
            const restorePromises = invoiceData.details.map(async (detail) => {
              if (detail.stock_id) {
                const stockRef = doc(db, 'warehouseItems', detail.stock_id);
                try {
                  const stockDoc = await getDoc(stockRef);
                  if (stockDoc.exists()) {
                    const stockData = stockDoc.data();
                    const newQuantity = (stockData.remaining_quantity || 0) + parseNumber(detail.quantity);
                    await updateDoc(stockRef, {
                      remaining_quantity: newQuantity,
                      updatedAt: Timestamp.now()
                    });
                  }
                } catch (stockErr) {
                  console.error('Error restoring stock:', stockErr);
                }
              }
            });
            await Promise.all(restorePromises);
          }
        }

        // Then delete the invoice
        await deleteDoc(doc(db, 'invoices', invoiceId));
        fetchData();
      } catch (err) {
        console.error('Delete Error:', err);
        setError(`فشل في حذف الفاتورة: ${err.message}`);
      }
    }
  };

  const handleSendWhatsApp = (invoice) => {
    if (!invoice || !invoice.details) {
      setError("لا يمكن إرسال الفاتورة عبر واتساب: بيانات الفاتورة غير صالحة");
      return;
    }

    let message;
    const displayType = getInvoiceTypeDisplay(invoice.invoice_type);
    
    if (invoice.invoice_type === 'FACTORY_DISPATCH') {
      const itemsList = invoice.details.map((d, index) =>
        `${index + 1}. الصنف: ${d.item_name || '-'}\n الكود: ${d.item_code || '-'}\n اللون: ${d.color || '-'}\n الوحدة: ${d.unit || '-'}\n الكمية: ${d.quantity || 0}\n ملاحظات: ${d.notes || '-'}`
      ).join('\n\n');
      
      message = `إذن تسليم زجاج رقم ${invoice.invoice_number || 'غير متوفر'}
التاريخ: ${formatDate(invoice.created_at)}
منصرف إلى: ${invoice.recipient || 'غير متوفر'}
أنشأها: ${invoice.created_by_username || 'غير متوفر'}

الأصناف:
${itemsList}

ملاحظات: ${invoice.notes || 'لا توجد'}`;
    } else {
      const total = invoice.details.reduce((sum, d) => sum + (parseNumber(d.quantity) * parseNumber(d.unit_price)), 0);
      const itemsList = invoice.details.map((d, index) =>
        `${index + 1}. الصنف: ${d.item_name || '-'}\n الكود: ${d.item_code || '-'}\n اللون: ${d.color || '-'}\n الكمية: ${d.quantity || 0}\n سعر الوحدة: ${formatCurrency(d.unit_price)} جنيه\n الإجمالي: ${formatCurrency(parseNumber(d.quantity) * parseNumber(d.unit_price))} جنيه`
      ).join('\n\n');
      
      message = `فاتورة ${displayType} رقم ${invoice.invoice_number || 'غير متوفر'}
التاريخ: ${formatDate(invoice.created_at)}
العميل: ${invoice.client_name || 'غير متوفر'}
${invoice.invoice_type === 'SALE' ? `رقم هاتف العميل: ${invoice.client_phone || 'غير متوفر'}\n` : ''}المورد: ${invoice.supplier_name || 'غير متوفر'}
أنشأها: ${invoice.created_by_username || 'غير متوفر'}

الأصناف:
${itemsList}

الإجمالي الكلي: ${formatCurrency(total)} جنيه
ملاحظات: ${invoice.notes || 'لا توجد'}`;
    }

    const phoneNumber = invoice.invoice_type === 'SALE' && invoice.client_phone ?
      invoice.client_phone.replace(/\D/g, '') : '';
    const whatsappUrl = phoneNumber ?
      `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}` :
      `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleFactoryReturn = (invoice) => {
    setSelectedForReturn(invoice);
    setIsReturnDialogOpen(true);
  };

  const handleReturnSuccess = (result) => {
    setIsReturnDialogOpen(false);
    setSelectedForReturn(null);
    fetchData();
    alert(`تم معالجة مرتجع المصنع بنجاح\nرقم الفاتورة: ${result.return_invoice_number}\n${result.message}`);
  };

  const handleReturnCancel = () => {
    setIsReturnDialogOpen(false);
    setSelectedForReturn(null);
  };

  return (
    <InvoiceErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 space-y-6 font-tajawal transition-colors duration-200" dir="rtl">
        <style>
          {`
            .font-tajawal { font-family: 'Tajawal', Arial, sans-serif; }
            @media print {
              body * { visibility: hidden; }
              .print-content, .print-content * { visibility: visible; }
              .print-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 210mm;
                min-height: 297mm;
                font-size: 12pt;
                padding: 15mm;
              }
            }
            .stats-cards { max-width: 400px; }
            @media (max-width: 768px) {
              .stats-cards { max-width: 100%; order: -1; }
              .invoices-table { order: 1; }
              .mobile-stats { display: block; }
              .desktop-stats { display: none; }
            }
            @media (min-width: 769px) {
              .mobile-stats { display: none; }
              .desktop-stats { display: block; }
            }
            .table-container { overflow-x: auto; }
            .sticky-header {
              position: sticky;
              top: 0;
              background: white;
              z-index: 10;
            }
            .dark .sticky-header { background: #1f2937; }
            .action-buttons {
              display: flex;
              gap: 4px;
              justify-content: center;
            }
            .action-btn {
              padding: 6px;
              border-radius: 4px;
              transition: all 0.3s ease;
            }
            .action-btn:hover {
              transform: scale(1.1);
              background-color: rgba(0,0,0,0.05);
            }
            .dark .action-btn:hover {
              background-color: rgba(255,255,255,0.05);
            }
            .client-table-container {
              max-height: 400px;
              overflow-y: auto;
            }
            .client-table-container thead {
              position: sticky;
              top: 0;
              background: white;
              z-index: 10;
            }
            .dark .client-table-container thead {
              background: #1f2937;
            }
            .elastic-table {
              width: 100%;
              table-layout: fixed;
            }
            .elastic-table td, .elastic-table th {
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
          `}
        </style>

        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">نظام الفواتير</h1>
          <Button
            variant="ghost"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>

        {/* Main Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 md:p-4 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow">
              <FileText size={24} className="md:size-7" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">نظام إدارة الفواتير</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">إدارة الفواتير، العملاء، والمخزون بكفاءة</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">مرحباً، {user?.username || 'غير متوفر'}</span>
          </div>
          <div className={`${isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto`}>
            <div className="relative flex-grow">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث برقم فاتورة أو اسم أو رقم هاتف أو اسم المستخدم"
                className="pl-10 pr-4 w-full"
              />
            </div>
            <Button
              onClick={() => {
                setIsCreateOpen(true);
                setSelected(null);
              }}
              className="flex items-center justify-center gap-2 mt-2 md:mt-0 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              <PlusCircle size={16} /> إضافة فاتورة
            </Button>
          </div>
        </div>

        {/* Mobile Stats Cards */}
        <div className="mobile-stats md:hidden space-y-4">
          <Card className="bg-white dark:bg-gray-800 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">إحصائيات سريعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي الفواتير</div>
                  <div className="text-xl font-bold text-gray-800 dark:text-white">{invoices.length}</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي المبيعات</div>
                  <div className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalSales)} جنيه</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">إنشاء فاتورة جديدة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    setIsCreateOpen(true);
                    setSelected(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
                >
                  <PlusCircle size={16} /> فاتورة جديدة
                </Button>
                <Button
                  variant="outline"
                  onClick={fetchData}
                  className="w-full border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                >
                  تحديث البيانات
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">الأطراف</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm text-gray-500 dark:text-gray-400">العملاء:</span>
                  <strong className="text-gray-800 dark:text-white">{invoiceClients.length}</strong>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm text-gray-500 dark:text-gray-400">الموردون:</span>
                  <strong className="text-gray-800 dark:text-white">{suppliers.length}</strong>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm text-gray-500 dark:text-gray-400">الأصناف:</span>
                  <strong className="text-gray-800 dark:text-white">{stockItems.length}</strong>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsClientListOpen(true)}
                className="w-full mt-4 border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
              >
                عرض قائمة العملاء
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Invoices Table */}
          <div className="flex-1 lg:w-2/3 invoices-table">
            <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                  قائمة الفواتير ({invoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">جاري التحميل...</div>
                ) : error ? (
                  <div className="py-6 text-center text-red-500 dark:text-red-400">{error}</div>
                ) : filtered.length === 0 ? (
                  <div className="py-6 text-center text-gray-500 dark:text-gray-400">لا توجد فواتير متاحة</div>
                ) : (
                  <div className="table-container max-h-[60vh]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-right sticky-header">
                          <th className="p-3 text-gray-800 dark:text-white font-bold min-w-[100px]">رقم</th>
                          <th className="p-3 text-gray-800 dark:text-white font-bold min-w-[100px]">النوع</th>
                          <th className="p-3 text-gray-800 dark:text-white font-bold min-w-[100px]">التاريخ</th>
                          <th className="p-3 text-gray-800 dark:text-white font-bold min-w-[120px]">طرف</th>
                          <th className="p-3 text-gray-800 dark:text-white font-bold min-w-[120px]">أنشأها</th>
                          <th className="p-3 text-right text-gray-800 dark:text-white font-bold min-w-[100px]">الإجمالي</th>
                          <th className="p-3 text-gray-800 dark:text-white font-bold min-w-[140px] text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((inv) => (
                          <tr
                            key={inv.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700"
                            onClick={() => setSelected(inv)}
                          >
                            <td className="p-3 text-gray-700 dark:text-gray-300">{inv.invoice_number || 'غير متوفر'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                inv.invoice_type === 'SALE' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                inv.invoice_type === 'PURCHASE' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                              }`}>
                                {getInvoiceTypeDisplay(inv.invoice_type)}
                              </span>
                            </td>
                            <td className="p-3 text-gray-700 dark:text-gray-300">{formatDate(inv.created_at)}</td>
                            <td className="p-3 text-gray-700 dark:text-gray-300">
                              {inv.invoice_type === 'SALE' ? inv.client_name :
                               inv.invoice_type === 'PURCHASE' ? inv.supplier_name :
                               inv.recipient || 'غير متوفر'}
                            </td>
                            <td className="p-3 text-gray-700 dark:text-gray-300">{inv.created_by_username || 'غير متوفر'}</td>
                            <td className="p-3 text-right font-bold text-gray-800 dark:text-white">
                              {inv.invoice_type !== 'FACTORY_DISPATCH' ? `${formatCurrency(inv.total_amount)} جنيه` : '-'}
                            </td>
                            <td className="p-3">
                              <div className="action-buttons">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelected(inv);
                                  }}
                                  className="action-btn text-blue-500 hover:text-blue-700"
                                  title="عرض"
                                >
                                  <Eye size={18} />
                                </Button>
                                {inv.invoice_type === 'FACTORY_DISPATCH' && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFactoryReturn(inv);
                                    }}
                                    className="action-btn text-purple-500 hover:text-purple-700"
                                    title="مرتجع المصنع"
                                  >
                                    <RotateCcw size={18} />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendWhatsApp(inv);
                                  }}
                                  className="action-btn text-green-500 hover:text-green-700"
                                  title="إرسال عبر واتساب"
                                >
                                  <FaWhatsapp size={18} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCreateOpen(true);
                                    setSelected(inv);
                                  }}
                                  className="action-btn text-amber-500 hover:text-amber-700"
                                  title="تعديل"
                                >
                                  <Edit size={18} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteInvoice(inv.id);
                                  }}
                                  className="action-btn text-red-500 hover:text-red-700"
                                  title="حذف"
                                >
                                  <Trash2 size={18} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Desktop Stats Cards */}
          <div className="desktop-stats stats-cards lg:w-1/3 space-y-4">
            <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">إحصائيات سريعة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي الفواتير</div>
                    <div className="text-xl font-bold text-gray-800 dark:text-white">{invoices.length}</div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي المبيعات</div>
                    <div className="text-xl font-bold text-gray-800 dark:text-white">{formatCurrency(totalSales)} جنيه</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">إنشاء فاتورة جديدة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => {
                      setIsCreateOpen(true);
                      setSelected(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
                  >
                    <PlusCircle size={16} /> فاتورة جديدة
                  </Button>
                  <Button
                    variant="outline"
                    onClick={fetchData}
                    className="w-full border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                  >
                    تحديث البيانات
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">الأطراف</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-500 dark:text-gray-400">العملاء:</span>
                    <strong className="text-gray-800 dark:text-white">{invoiceClients.length}</strong>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-500 dark:text-gray-400">الموردون:</span>
                    <strong className="text-gray-800 dark:text-white">{suppliers.length}</strong>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <span className="text-sm text-gray-500 dark:text-gray-400">الأصناف:</span>
                    <strong className="text-gray-800 dark:text-white">{stockItems.length}</strong>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsClientListOpen(true)}
                  className="w-full mt-4 border-teal-500 text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                >
                  عرض قائمة العملاء
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialogs */}
        {selected && (
          <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                  تفاصيل {selected.invoice_type === 'FACTORY_DISPATCH' ? 'إذن التسليم' : 'الفاتورة'} - {selected.invoice_number || 'غير متوفر'}
                </DialogTitle>
              </DialogHeader>
              <div className="p-4 space-y-4">
                <InvoicePrint ref={printRef} invoice={selected} />
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">
                {selected ? 'تحرير الفاتورة' : 'إنشاء فاتورة جديدة'}
              </DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <CreateInvoiceForm
                clients={clients}
                suppliers={suppliers}
                stockItems={stockItems}
                user={user}
                onCreated={() => {
                  setIsCreateOpen(false);
                  setSelected(null);
                  fetchData();
                }}
                onCancel={() => {
                  setIsCreateOpen(false);
                  setSelected(null);
                }}
                isEdit={!!selected}
                initialData={selected}
              />
            </div>
          </DialogContent>
        </Dialog>

        {isReturnDialogOpen && selectedForReturn && (
          <FactoryReturnDialog
            invoice={selectedForReturn}
            user={user}
            onSuccess={handleReturnSuccess}
            onCancel={handleReturnCancel}
          />
        )}

        <Dialog open={isClientListOpen} onOpenChange={setIsClientListOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">قائمة العملاء</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="ابحث عن عميل بالاسم أو الهاتف"
                  className="pl-10 pr-4 w-full"
                />
              </div>
              <div className="client-table-container">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-right bg-gray-100 dark:bg-gray-700">
                      <th className="p-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-bold min-w-[150px]">الاسم</th>
                      <th className="p-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-bold min-w-[120px]">رقم الهاتف</th>
                      <th className="p-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-bold min-w-[80px]">النوع</th>
                      <th className="p-3 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-bold min-w-[200px]">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceClients
                      .filter(client =>
                        (client.name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
                        (client.phone || '').includes(clientSearch)
                      )
                      .map((client, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                          <td className="p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-right">{client.name || 'غير متوفر'}</td>
                          <td className="p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">{client.phone || '-'}</td>
                          <td className="p-3 border border-gray-300 dark:border-gray-600">
                            <span className={`px-2 py-1 rounded-full text-xs ${client.type === 'vip' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'}`}>
                              {client.type === 'vip' ? 'VIP' : 'عادي'}
                            </span>
                          </td>
                          <td className="p-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">{client.notes || '-'}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </InvoiceErrorBoundary>
  );
}