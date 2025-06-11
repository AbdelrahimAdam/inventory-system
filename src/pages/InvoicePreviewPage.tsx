// src/pages/InvoicePreviewPage.tsx
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import MyArabicInvoice from '../components/pdf/MyArabicInvoice';

const InvoicePreviewPage = () => (
  <div className="p-4">
    <h1 className="text-xl font-bold mb-4">معاينة الطلب</h1>

    <div style={{ height: '90vh' }}>
      <PDFViewer width="100%" height="100%">
        <MyArabicInvoice />
      </PDFViewer>
    </div>

    <div className="mt-4">
      <PDFDownloadLink document={<MyArabicInvoice />} fileName="طلب.pdf">
        {({ loading }) => (loading ? 'جاري التحميل...' : 'تحميل PDF')}
      </PDFDownloadLink>
    </div>
  </div>
);

export default InvoicePreviewPage;
