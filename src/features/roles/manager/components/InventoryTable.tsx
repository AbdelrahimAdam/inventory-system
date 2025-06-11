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

const InventoryTable = ({ items = [], onEdit, onDelete }) => {
  const [selectedCategory, setSelectedCategory] = useState('كل');

  const filteredItems =
    selectedCategory === 'كل'
      ? items
      : items.filter((item) => item.category === selectedCategory);

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
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المعرف</TableHead>
              <TableHead>الاسم</TableHead>
              <TableHead>الكمية</TableHead>
              <TableHead>السعر</TableHead>
              <TableHead>الفئة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>${item.price.toFixed(2)}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                      تعديل
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(item.id)}>
                      حذف
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  لا توجد عناصر في هذه الفئة
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
