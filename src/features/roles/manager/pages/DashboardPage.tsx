import React, { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  PackageCheck,
  Users2,
  FileBarChart2,
  Box,
  PlusSquare,
  FileText,
  Package,
  Factory,
  Truck,
  Search,
  PackagePlus,
  Package2,
  TrendingUp,
  TrendingDown,
  Database,
  RefreshCw,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  limit,
  getDocs,
  orderBy
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuth } from "@/context/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";

// UI Components
const Card = ({ className, children, ...props }: any) => (
  <div
    className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-600/50 overflow-hidden ${className}`}
    {...props}
  >
    {children}
  </div>
);
const CardHeader = ({ children, className }: any) => (
  <div className={`p-4 border-b border-gray-200/50 dark:border-gray-600/50 ${className}`}>
    {children}
  </div>
);
const CardTitle = ({ children }: any) => (
  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
    {children}
  </h2>
);
const CardContent = ({ children, className }: any) => (
  <div className={`p-4 ${className}`}>{children}</div>
);

const StatCard = ({ title, value, icon, color, trend, loading = false }: any) => (
  <motion.div
    className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300`}
    whileHover={{ y: -4, scale: 1.02 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-4 -mt-4"></div>
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold opacity-90">{title}</h3>
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-bold">جاري التحميل...</p>
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold mb-2">{value?.toLocaleString() ?? "0"}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1 text-xs opacity-90">
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </>
      )}
    </div>
  </motion.div>
);

const DataTable = ({ columns, data, isLoading, emptyMessage = "لا توجد بيانات متاحة" }: any) => (
  <div className="w-full max-h-[300px] overflow-y-auto font-tajawal rounded-xl">
    {isLoading ? (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm text-gray-500">جاري التحميل...</p>
      </div>
    ) : !data || data.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <Database className="w-12 h-12 opacity-50 mb-2" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    ) : (
      <table className="w-full text-right">
        <thead>
          <tr className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-700 dark:to-gray-600">
            {columns.map((col: any) => (
              <th
                key={col.accessorKey}
                className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white border-b border-blue-200 dark:border-gray-600"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row: any, idx: number) => (
            <tr
              key={idx}
              className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors"
            >
              {columns.map((col: any) => (
                <td
                  key={col.accessorKey}
                  className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  {row[col.accessorKey] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const Button = ({ onClick, children, variant = "default", className, loading, ...props }: any) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`px-4 py-2 rounded-xl transition-all duration-300 font-semibold flex items-center gap-2 ${
      variant === "default"
        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl"
        : "bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800"
    } ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    {...props}
  >
    {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);

// Table Columns
const suppliersColumns = [
  { header: "المورد", accessorKey: "supplier" },
  { header: "إجمالي التوريد", accessorKey: "totalSupplied" },
];
const topItemsColumns = [
  { header: "الصنف", accessorKey: "item_name" },
  { header: "عدد مرات الصرف", accessorKey: "sold" },
];
const stockColumns = [
  { header: "الصنف", accessorKey: "item_name" },
  { header: "الكمية المتاحة", accessorKey: "remaining_quantity" },
];

// Navigation & Quick Actions
const navigationCards = [
  {
    title: "عرض المخزون",
    description: "عرض جميع الأصناف المتاحة في المخزون الرئيسي",
    icon: <Box className="text-2xl text-yellow-500" />,
    to: "/manager/inventory-items",
    color: "from-yellow-500 to-amber-500"
  },
  {
    title: "إضافة صنف جديد",
    description: "إضافة أصناف جديدة إلى سجل المخزون",
    icon: <PlusSquare className="text-2xl text-green-500" />,
    to: "/manager/inventory-items/add",
    color: "from-green-500 to-emerald-500"
  },
  {
    title: "تقارير المصنع",
    description: "عرض تقارير صرف المصنع والتحليلات",
    icon: <FileText className="text-2xl text-orange-500" />,
    to: "/manager/factory-movements",
    color: "from-orange-500 to-red-500"
  },
  {
    title: "مخزون الإكسسوارات",
    description: "إدارة أصناف الإكسسوارات والمستلزمات",
    icon: <Package className="text-2xl text-purple-500" />,
    to: "/manager/accessory-items",
    color: "from-purple-500 to-pink-500"
  },
];

const managementCards = [
  {
    icon: <PackageCheck size={32} className="text-blue-500" />,
    title: "إدارة المخزون",
    description: "راقب وحدّث حالة المنتجات داخل النظام بشكل كامل",
    to: "/manager/inventory-items",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: <Users2 size={32} className="text-green-500" />,
    title: "إدارة المستخدمين",
    description: "أضف أو عدّل صلاحيات الموظفين وسجلاتهم بسهولة",
    to: "/manager/users",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: <FileBarChart2 size={32} className="text-purple-500" />,
    title: "التقارير والتحليلات",
    description: "استعرض تقارير الأداء والمبيعات والمخزون المفصلة",
    to: "/manager/reports",
    color: "from-purple-500 to-pink-500"
  },
];

const quickActions = [
  {
    title: "البحث والتعديل",
    description: "ابحث عن الأصناف وقم بتعديلها بسرعة",
    icon: <Search className="w-5 h-5" />,
    to: "/manager/inventory-items/search",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400"
  },
  {
    title: "صرف للمصنع",
    description: "تسجيل صرف أصناف للمصنع بسهولة",
    icon: <Factory className="w-5 h-5" />,
    to: "/manager/factory-movements/create",
    color: "bg-green-500/10 text-green-600 dark:text-green-400"
  },
  {
    title: "تحويل للمطبعة",
    description: "نقل أصناف إلى المطبعة بكفاءة",
    icon: <PackagePlus className="w-5 h-5" />,
    to: "/manager/location-transfers",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400"
  },
];

interface InventoryItem {
  id: string;
  item_name: string;
  item_code?: string;
  remaining_quantity: number;
  added_quantity?: number;
  sold?: number;
  supplier?: string;
  warehouseId?: string;
  category?: string;
}

interface Supplier {
  id: string;
  supplier: string;
  totalSupplied: number;
}

interface DashboardStats {
  totalBottles: number;
  totalStockValue: number;
  factoryDispatches: number;
  externalDispatches: number;
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
}

const COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"];

const DashboardContent: React.FC<{
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  suppliers: Supplier[];
  factoryDispatch: InventoryItem[];
  monofyaStock: InventoryItem[];
  matbaaStock: InventoryItem[];
  accessories: InventoryItem[];
  fetchData: () => void;
  view: "week" | "month";
  setView: (view: "week" | "month") => void;
  salesData: { name: string; sales: number }[];
  pieData: { name: string; value: number }[];
}> = ({
  stats,
  loading,
  error,
  suppliers,
  factoryDispatch,
  monofyaStock,
  matbaaStock,
  accessories,
  fetchData,
  view,
  setView,
  salesData,
  pieData,
}) => (
  <div className="space-y-6">
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-2xl shadow-lg flex items-center gap-3"
        >
          <AlertCircle className="w-6 h-6" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
          </div>
          <Button onClick={fetchData} loading={loading}>
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </Button>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Stats */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="إجمالي الأصناف"
        value={stats?.totalItems}
        icon={<Package2 className="text-white w-6 h-6" />}
        color="from-blue-500 to-blue-600"
        trend={12}
        loading={loading}
      />
      <StatCard
        title="قيمة المخزون"
        value={stats?.totalStockValue}
        icon={<BarChart3 className="text-white w-6 h-6" />}
        color="from-green-500 to-green-600"
        trend={8}
        loading={loading}
      />
      <StatCard
        title="صرف المصنع"
        value={stats?.factoryDispatches}
        icon={<Factory className="text-white w-6 h-6" />}
        color="from-orange-500 to-orange-600"
        trend={-5}
        loading={loading}
      />
      <StatCard
        title="صرف خارجي"
        value={stats?.externalDispatches}
        icon={<Truck className="text-white w-6 h-6" />}
        color="from-purple-500 to-purple-600"
        trend={15}
        loading={loading}
      />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        title="أصناف منخفضة"
        value={stats?.lowStockItems}
        icon={<TrendingDown className="text-white w-6 h-6" />}
        color="from-amber-500 to-amber-600"
        loading={loading}
      />
      <StatCard
        title="أصناف منتهية"
        value={stats?.outOfStockItems}
        icon={<AlertCircle className="text-white w-6 h-6" />}
        color="from-red-500 to-red-600"
        loading={loading}
      />
      <StatCard
        title="إجمالي الزجاج"
        value={stats?.totalBottles}
        icon={<Package className="text-white w-6 h-6" />}
        color="from-cyan-500 to-cyan-600"
        loading={loading}
      />
    </div>

    {/* Management Cards */}
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      {managementCards.map((card, index) => (
        <Link to={card.to} key={index}>
          <motion.div
            className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg p-6 hover:shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-600/50"
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className={`w-14 h-14 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
              {card.icon}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{card.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{card.description}</p>
          </motion.div>
        </Link>
      ))}
    </div>

    {/* Data Tables */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="shadow-xl">
        <CardHeader><CardTitle><Users2 className="w-5 h-5" /> أعلى الموردين</CardTitle></CardHeader>
        <CardContent><DataTable columns={suppliersColumns} data={suppliers} isLoading={loading} /></CardContent>
      </Card>
      <Card className="shadow-xl">
        <CardHeader><CardTitle><TrendingUp className="w-5 h-5" /> أكثر الأصناف صرفاً</CardTitle></CardHeader>
        <CardContent><DataTable columns={topItemsColumns} data={factoryDispatch.slice(0, 5)} isLoading={loading} /></CardContent>
      </Card>
      <Card className="shadow-xl">
        <CardHeader><CardTitle><Package className="w-5 h-5" /> مخزون المنوفية</CardTitle></CardHeader>
        <CardContent><DataTable columns={stockColumns} data={monofyaStock.slice(0, 5)} isLoading={loading} /></CardContent>
      </Card>
      <Card className="shadow-xl">
        <CardHeader><CardTitle><Factory className="w-5 h-5" /> مخزون المطبعة</CardTitle></CardHeader>
        <CardContent><DataTable columns={stockColumns} data={matbaaStock.slice(0, 5)} isLoading={loading} /></CardContent>
      </Card>
      <Card className="shadow-xl lg:col-span-2">
        <CardHeader><CardTitle><PackageCheck className="w-5 h-5" /> مخزن الإكسسوارات</CardTitle></CardHeader>
        <CardContent><DataTable columns={stockColumns} data={accessories.slice(0, 8)} isLoading={loading} /></CardContent>
      </Card>
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle><BarChart3 className="w-5 h-5" /> المبيعات حسب المنتج</CardTitle>
            <div className="flex gap-2">
              <Button onClick={() => setView("week")} variant={view === "week" ? "default" : "outline"} className="text-xs">أسبوعي</Button>
              <Button onClick={() => setView("month")} variant={view === "month" ? "default" : "outline"} className="text-xs">شهري</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {salesData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fontFamily: 'Tajawal, sans-serif' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip contentStyle={{ direction: "rtl", fontFamily: 'Tajawal, sans-serif', background: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }} formatter={(value) => [`${value} قطعة`, "المبيعات"]} />
                  <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <BarChart3 className="w-16 h-16 opacity-50 mb-4" />
              <p className="text-lg font-semibold">لا توجد بيانات مبيعات حالياً</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader><CardTitle><PieChartIcon className="w-5 h-5" /> توزيع المبيعات حسب النوع</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData.filter(item => item.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val} قطعة`, name]} contentStyle={{ fontFamily: 'Tajawal, sans-serif', background: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '12px' }} />
                <Legend formatter={(value) => value} wrapperStyle={{ fontFamily: 'Tajawal, sans-serif' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const NavigationContent: React.FC<{ navigationCards: any; quickActions: any }> = ({ navigationCards, quickActions }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {navigationCards.map((card: any, i: number) => (
        <Link key={i} to={card.to} className="block group">
          <motion.div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 p-6 border border-gray-200/50 dark:border-gray-600/50 h-full flex flex-col justify-between" whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
            <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>{card.icon}</div>
            <div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-2 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">{card.title}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{card.description}</p>
            </div>
          </motion.div>
        </Link>
      ))}
    </div>

    <Card className="shadow-xl">
      <CardHeader><CardTitle><PackagePlus className="w-5 h-5" /> العمليات السريعة</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action: any, i: number) => (
          <Link key={i} to={action.to} className="block group">
            <motion.div className={`p-4 rounded-xl border-2 border-gray-200/50 dark:border-gray-600/50 hover:border-transparent transition-all duration-300 transform hover:-translate-y-1 flex justify-between items-center min-h-[100px] group-hover:shadow-lg ${action.color}`} whileHover={{ scale: 1.02 }}>
              <div className="text-right flex-1">
                <h3 className="font-semibold flex items-center justify-end gap-2 text-sm mb-2">{action.title}{action.icon}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{action.description}</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </CardContent>
    </Card>
  </div>
);

const ManagerDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [accessories, setAccessories] = useState<InventoryItem[]>([]);
  const [matbaaStock, setMatbaaStock] = useState<InventoryItem[]>([]);
  const [monofyaStock, setMonofyaStock] = useState<InventoryItem[]>([]);
  const [factoryDispatch, setFactoryDispatch] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [view, setView] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "navigation">("dashboard");

  // Fetch all data directly from Firestore
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all collections in parallel
      const [
        inventorySnapshot,
        accessoriesSnapshot,
        monofyaSnapshot,
        matbaaSnapshot,
        factoryMovementsSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'inventoryItems')),
        getDocs(query(collection(db, 'inventoryItems'), where('category', '==', 'accessories'))),
        getDocs(query(collection(db, 'warehouseItems'), where('warehouseId', '==', 'monofia'))),
        getDocs(query(collection(db, 'warehouseItems'), where('warehouseId', '==', 'matbaa'))),
        getDocs(query(collection(db, 'factoryMovements'), orderBy('createdAt', 'desc'), limit(50)))
      ]);

      // Process inventory items
      const allInventoryItems = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InventoryItem));

      const accessoriesItems = accessoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InventoryItem));

      const monofyaItems = monofyaSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InventoryItem));

      const matbaaItems = matbaaSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InventoryItem));

      // Calculate factory dispatch items (top sold items)
      const factoryDispatchItems = allInventoryItems
        .filter(item => (item.sold || 0) > 0)
        .sort((a, b) => (b.sold || 0) - (a.sold || 0))
        .slice(0, 10);

      // Calculate suppliers data
      const supplierMap = new Map();
      allInventoryItems.forEach(item => {
        if (item.supplier) {
          const current = supplierMap.get(item.supplier) || 0;
          supplierMap.set(item.supplier, current + (item.added_quantity || 0));
        }
      });

      const suppliersData: Supplier[] = Array.from(supplierMap.entries())
        .map(([supplier, totalSupplied]) => ({
          id: supplier,
          supplier,
          totalSupplied
        }))
        .sort((a, b) => b.totalSupplied - a.totalSupplied)
        .slice(0, 5);

      // Calculate dashboard stats
      const totalItems = allInventoryItems.length;
      const lowStockItems = allInventoryItems.filter(item => 
        item.remaining_quantity > 0 && item.remaining_quantity <= 10
      ).length;
      const outOfStockItems = allInventoryItems.filter(item => 
        item.remaining_quantity === 0
      ).length;
      const totalBottles = allInventoryItems
        .filter(item => item.category === 'bottles')
        .reduce((sum, item) => sum + (item.remaining_quantity || 0), 0);
      
      const factoryDispatches = factoryMovementsSnapshot.size;
      const externalDispatches = allInventoryItems.reduce((sum, item) => sum + (item.sold || 0), 0);
      
      // Calculate total stock value (simplified - you might have actual prices)
      const totalStockValue = allInventoryItems.reduce((sum, item) => {
        const averagePrice = 50; // Assume average price per item
        return sum + (item.remaining_quantity * averagePrice);
      }, 0);

      // Set all states
      setAccessories(accessoriesItems);
      setMonofyaStock(monofyaItems);
      setMatbaaStock(matbaaItems);
      setFactoryDispatch(factoryDispatchItems);
      setSuppliers(suppliersData);
      setStats({
        totalItems,
        lowStockItems,
        outOfStockItems,
        totalBottles,
        factoryDispatches,
        externalDispatches,
        totalStockValue
      });

      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError("فشل في جلب البيانات. يرجى المحاولة مرة أخرى.");
      setLoading(false);
    }
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchData();

      // Set up real-time listeners for live updates
      const unsubscribeCallbacks = [
        // Inventory items listener
        onSnapshot(collection(db, 'inventoryItems'), () => {
          fetchData(); // Refetch when inventory changes
        }),
        
        // Warehouse items listeners
        onSnapshot(query(collection(db, 'warehouseItems'), where('warehouseId', '==', 'monofia')), () => {
          fetchData();
        }),
        
        onSnapshot(query(collection(db, 'warehouseItems'), where('warehouseId', '==', 'matbaa')), () => {
          fetchData();
        }),
        
        // Factory movements listener
        onSnapshot(query(collection(db, 'factoryMovements'), orderBy('createdAt', 'desc'), limit(50)), () => {
          fetchData();
        })
      ];

      // Cleanup listeners on unmount
      return () => {
        unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
      };
    }
  }, [activeTab, fetchData]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Prepare chart data
  const salesData = factoryDispatch.slice(0, 6).map(item => ({
    name: (item.item_name || "صنف").substring(0, 15) + ((item.item_name?.length || 0) > 15 ? '...' : ''),
    sales: view === "week" ? Math.round((item.sold || 0) * 0.25) : (item.sold || 0)
  }));

  const pieData = [
    { 
      name: "زجاجات", 
      value: monofyaStock.reduce((a, i) => a + (i.remaining_quantity || 0), 0) 
    },
    { 
      name: "إكسسوارات", 
      value: accessories.reduce((a, i) => a + (i.remaining_quantity || 0), 0) 
    },
    { 
      name: "مطبعة", 
      value: matbaaStock.reduce((a, i) => a + (i.remaining_quantity || 0), 0) 
    },
  ].filter(i => i.value > 0);

  return (
    <ErrorBoundary>
      <Helmet>
        <title>لوحة تحكم المدير - نظام المخزون المتكامل</title>
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-white to-indigo-100/80 dark:from-gray-900/90 dark:via-gray-800 dark:to-gray-700/90 font-tajawal p-4 sm:p-6" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl p-6 text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/30">
                <Database className="text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold drop-shadow-lg">
                  {activeTab === "dashboard" ? 'لوحة التحكم الرئيسية' : 'مركز التنقل السريع'}
                </h1>
                <p className="text-lg opacity-90 mt-1">نظام إدارة المخزون المتكامل</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <div className="bg-white/20 rounded-xl px-4 py-2 backdrop-blur-sm border border-white/30">
                <p className="text-sm opacity-90">المستخدم</p>
                <p className="font-semibold">{user?.name || "مدير النظام"}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setActiveTab("dashboard")} 
                  variant={activeTab === "dashboard" ? "default" : "outline"} 
                  className="bg-white/20 hover:bg-white/30 border-white/30"
                >
                  لوحة التحكم
                </Button>
                <Button 
                  onClick={() => setActiveTab("navigation")} 
                  variant={activeTab === "navigation" ? "default" : "outline"} 
                  className="bg-white/20 hover:bg-white/30 border-white/30"
                >
                  التنقل السريع
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {activeTab === "dashboard" ? (
          <DashboardContent
            stats={stats}
            loading={loading}
            error={error}
            suppliers={suppliers}
            factoryDispatch={factoryDispatch}
            monofyaStock={monofyaStock}
            matbaaStock={matbaaStock}
            accessories={accessories}
            fetchData={fetchData}
            view={view}
            setView={setView}
            salesData={salesData}
            pieData={pieData}
          />
        ) : (
          <NavigationContent navigationCards={navigationCards} quickActions={quickActions} />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default ManagerDashboard;