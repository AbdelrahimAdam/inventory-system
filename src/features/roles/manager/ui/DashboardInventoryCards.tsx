import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Box, Package, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardInventoryCards = ({ items }) => {
  // Filter categories
  const accessories = items.filter(item => item.category === 'إكسسوارات');
  const bottles = items.filter(item => item.category === 'زجاج');

  // Sum quantities
  const totalAccessories = accessories.reduce((acc, item) => acc + item.quantity, 0);
  const totalBottles = bottles.reduce((acc, item) => acc + item.quantity, 0);

  // Find most sold bottle by quantity
  let mostSoldBottle = null;
  if (bottles.length) {
    mostSoldBottle = bottles.reduce((maxItem, item) =>
      item.quantity > maxItem.quantity ? item : maxItem,
      bottles[0]
    );
  }

  // Demo previous sold count for percentage change (replace with real data)
  const prevSold = 30;
  const currentSold = mostSoldBottle ? mostSoldBottle.quantity : 0;
  const soldChangePercent = prevSold
    ? ((currentSold - prevSold) / prevSold) * 100
    : 0;

  return (
    <div dir="rtl" className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {/* Accessories Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-6 flex items-center gap-4">
          <Box className="w-12 h-12 text-blue-600 dark:text-blue-400" />
          <CardContent className="p-0">
            <h2 className="text-xl font-semibold mb-2">إجمالي الإكسسوارات</h2>
            <p className="text-4xl font-bold text-blue-600">{totalAccessories}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottles & Most Sold */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <Package className="w-12 h-12 text-green-600 dark:text-green-400" />
            <CardContent className="p-0">
              <h2 className="text-xl font-semibold mb-2">إجمالي الزجاجات</h2>
              <p className="text-4xl font-bold text-green-600">{totalBottles}</p>
            </CardContent>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
                أكثر زجاجة مبيعا:
              </h3>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {mostSoldBottle ? mostSoldBottle.name : 'لا توجد بيانات'}
              </p>
            </div>

            <div
              className={`text-sm font-semibold flex items-center gap-1 ${
                soldChangePercent >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
              title={`تغير المبيعات: ${soldChangePercent.toFixed(1)}%`}
            >
              <TrendingUp className="w-5 h-5" />
              {soldChangePercent.toFixed(1)}%
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default DashboardInventoryCards;
