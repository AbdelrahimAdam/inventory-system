import React, { useState } from 'react';
import { Button } from '../ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

const categories = ['كل', 'إكسسوارات', 'زجاج'];

// Define the mapping of keys to column labels
const columns = [
  { key: 'name', label: 'الصنف' },
  { key: 'code', label: 'الكود' },
  { key: 'color', label: 'اللون' },
  { key: 'cartons', label: 'الكراتين' },
  { key: 'per_carton', label: 'في الكرتونة' },
  { key: 'individual', label: 'الفردي' },
  { key: 'supplier', label: 'المورد' },
  { key: 'location', label: 'المكان' },
  { key: 'notes', label: 'ملاحظات' },
  { key: 'date_added', label: 'التاريخ' },
  { key: 'added_quantity', label: 'المضافة' },
  { key: 'remaining_quantity', label: 'المتبقية' },
];

const InventoryTable = ({ items = [], onEdit, onDelete }) => {
  const [selectedCategory, setSelectedCategory] = useState('كل');

  const filteredItems =
    selectedCategory === 'كل'
      ? items
      : items.filter((item) => item.category === selectedCategory);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div dir="rtl" className="space-y-4">
      {/* Category Filter Buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-semibold">تصفية حسب الفئة:</span>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(cat)}
            className="text-sm"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border w-full">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className="text-center">
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  {columns.map(({ key }) => (
                    <TableCell key={key} className="text-center">
                      {key === 'date_added'
                        ? formatDate(item[key])
                        : item[key] ?? '-'}
                    </TableCell>
                  ))}
                  <TableCell className="flex gap-2 justify-center flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(item.id)}
                    >
                      حذف
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground">
                  لا توجد بيانات
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default InventoryTable;
