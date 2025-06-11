// src/components/pdf/MyArabicInvoice.tsx
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';

// Register Amiri font
Font.register({
  family: 'Amiri',
  fonts: [
    { src: '/fonts/Amiri-Regular.ttf' },
    { src: '/fonts/Amiri-Bold.ttf', fontWeight: 'bold' },
  ],
});

// Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Amiri',
    padding: 40,
    direction: 'rtl',
    fontSize: 12,
  },
  logo: {
    width: 100,
    height: 50,
    marginBottom: 20,
  },
  barcode: {
    width: 200,
    height: 50,
    marginVertical: 10,
    alignSelf: 'center',
  },
  section: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1 solid #000',
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5 solid #999',
  },
  cell: {
    flex: 1,
    padding: 4,
    textAlign: 'center',
  },
});

const MyArabicInvoice = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Logo */}
      <Image src="/logo.png" style={styles.logo} />

      {/* Title */}
      <Text style={styles.title}>طلب شراء جديد</Text>

      {/* Barcode */}
      <Image src="/barcode/INV-20250525.png" style={styles.barcode} />

      {/* Info Section */}
      <View style={styles.section}>
        <Text>رقم الفاتورة: INV-20250525</Text>
        <Text>التاريخ: 2025/05/25</Text>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.cell}>المنتج</Text>
        <Text style={styles.cell}>الكمية</Text>
        <Text style={styles.cell}>السعر</Text>
      </View>

      {/* Table Rows */}
      {[
        { name: 'قنينة عطر 100مل', qty: 10, price: '25.00 EGP' },
        { name: 'علبة تغليف', qty: 5, price: '10.00 EGP' },
      ].map((item, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={styles.cell}>{item.name}</Text>
          <Text style={styles.cell}>{item.qty}</Text>
          <Text style={styles.cell}>{item.price}</Text>
        </View>
      ))}
    </Page>
  </Document>
);

export default MyArabicInvoice;
