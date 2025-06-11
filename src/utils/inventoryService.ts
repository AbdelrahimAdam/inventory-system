export const updateInventoryByBarcode = async (barcode: string) => {
  // Example: Update from localStorage or send to backend
  const items = JSON.parse(localStorage.getItem('inventory') || '[]');
  const index = items.findIndex(item => item.barcode === barcode);

  if (index !== -1) {
    items[index].quantity += 1;
    localStorage.setItem('inventory', JSON.stringify(items));
  } else {
    items.push({ name: 'منتج غير معروف', barcode, quantity: 1 });
    localStorage.setItem('inventory', JSON.stringify(items));
  }
};
