import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Truck,
  Calendar,
  DollarSign,
  User,
  Plus,
  BarChart3,
  MoreVertical,
  Package,
  TrendingUp
} from 'lucide-react';

interface ProcurementItem {
  id: string;
  uuid: string;
  item_name: string;
  item_code: string;
  color: string;
  supplier: string;
  cost_price: number;
  selling_price: number;
  min_stock_level: number;
  max_stock_level: number;
  current_stock: number;
  lead_time: number; // in days
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_order';
  last_ordered: string;
  next_delivery?: string;
  preferred_suppliers: string[];
}

interface PurchaseOrder {
  id: string;
  uuid: string;
  order_number: string;
  supplier_name: string;
  item_name: string;
  item_code: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  order_date: string;
  expected_delivery: string;
  status: 'draft' | 'submitted' | 'approved' | 'ordered' | 'delivered' | 'cancelled';
  notes?: string;
}

interface ProcurementStats {
  total_items: number;
  low_stock: number;
  on_order: number;
  monthly_spend: number;
  avg_lead_time: number;
  supplier_count: number;
}

const ProcurementPage: React.FC = () => {
  const [procurementItems, setProcurementItems] = useState<ProcurementItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [filteredItems, setFilteredItems] = useState<ProcurementItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ProcurementItem | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1200));

      const mockItems: ProcurementItem[] = [
        {
          id: '1',
          uuid: 'item-uuid-1',
          item_name: 'Premium Perfume Glass 50ml',
          item_code: 'PG-50-PREM',
          color: 'Clear',
          supplier: 'GlassCo International',
          cost_price: 12.50,
          selling_price: 25.00,
          min_stock_level: 100,
          max_stock_level: 1000,
          current_stock: 85,
          lead_time: 7,
          status: 'low_stock',
          last_ordered: '2024-01-08',
          next_delivery: '2024-01-18',
          preferred_suppliers: ['GlassCo International', 'Premium Glass Ltd']
        },
        {
          id: '2',
          uuid: 'item-uuid-2',
          item_name: 'Luxury Bottle 100ml',
          item_code: 'LB-100-LUX',
          color: 'Amber',
          supplier: 'BottleMaster Ltd',
          cost_price: 18.75,
          selling_price: 45.00,
          min_stock_level: 50,
          max_stock_level: 500,
          current_stock: 45,
          lead_time: 10,
          status: 'low_stock',
          last_ordered: '2024-01-05',
          preferred_suppliers: ['BottleMaster Ltd', 'Luxury Containers Inc']
        },
        {
          id: '3',
          uuid: 'item-uuid-3',
          item_name: 'Spray Pump Gold',
          item_code: 'SP-GOLD-01',
          color: 'Gold',
          supplier: 'PumpTech Industries',
          cost_price: 8.20,
          selling_price: 18.50,
          min_stock_level: 200,
          max_stock_level: 2000,
          current_stock: 350,
          lead_time: 5,
          status: 'in_stock',
          last_ordered: '2024-01-12',
          preferred_suppliers: ['PumpTech Industries']
        },
        {
          id: '4',
          uuid: 'item-uuid-4',
          item_name: 'Premium Cap Gold',
          item_code: 'CAP-GOLD-PREM',
          color: 'Gold',
          supplier: 'CapManufacturers Inc',
          cost_price: 4.80,
          selling_price: 12.00,
          min_stock_level: 150,
          max_stock_level: 1500,
          current_stock: 0,
          lead_time: 14,
          status: 'out_of_stock',
          last_ordered: '2023-12-20',
          next_delivery: '2024-01-25',
          preferred_suppliers: ['CapManufacturers Inc', 'Global Caps Ltd']
        },
        {
          id: '5',
          uuid: 'item-uuid-5',
          item_name: 'Spray Pump Silver',
          item_code: 'SP-SILVER-02',
          color: 'Silver',
          supplier: 'PumpTech Industries',
          cost_price: 7.90,
          selling_price: 17.50,
          min_stock_level: 150,
          max_stock_level: 1500,
          current_stock: 180,
          lead_time: 5,
          status: 'in_stock',
          last_ordered: '2024-01-10',
          preferred_suppliers: ['PumpTech Industries', 'Precision Pumps Co']
        }
      ];

      const mockOrders: PurchaseOrder[] = [
        {
          id: '1',
          uuid: 'order-uuid-1',
          order_number: 'PO-2024-001',
          supplier_name: 'GlassCo International',
          item_name: 'Premium Perfume Glass 50ml',
          item_code: 'PG-50-PREM',
          quantity: 500,
          unit_price: 12.50,
          total_amount: 6250.00,
          order_date: '2024-01-15',
          expected_delivery: '2024-01-22',
          status: 'ordered',
          notes: 'Urgent order for production line'
        },
        {
          id: '2',
          uuid: 'order-uuid-2',
          order_number: 'PO-2024-002',
          supplier_name: 'CapManufacturers Inc',
          item_name: 'Premium Cap Gold',
          item_code: 'CAP-GOLD-PREM',
          quantity: 1000,
          unit_price: 4.80,
          total_amount: 4800.00,
          order_date: '2024-01-12',
          expected_delivery: '2024-01-26',
          status: 'approved',
          notes: 'Backorder fulfillment'
        },
        {
          id: '3',
          uuid: 'order-uuid-3',
          order_number: 'PO-2024-003',
          supplier_name: 'BottleMaster Ltd',
          item_name: 'Luxury Bottle 100ml',
          item_code: 'LB-100-LUX',
          quantity: 200,
          unit_price: 18.75,
          total_amount: 3750.00,
          order_date: '2024-01-18',
          expected_delivery: '2024-01-28',
          status: 'submitted',
          notes: 'New product line requirement'
        }
      ];

      setProcurementItems(mockItems);
      setFilteredItems(mockItems);
      setPurchaseOrders(mockOrders);
      setIsLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    let filtered = procurementItems;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (supplierFilter !== 'all') {
      filtered = filtered.filter(item => item.supplier === supplierFilter);
    }

    setFilteredItems(filtered);
  }, [searchTerm, statusFilter, supplierFilter, procurementItems]);

  const procurementStats: ProcurementStats = {
    total_items: procurementItems.length,
    low_stock: procurementItems.filter(item => item.status === 'low_stock').length,
    on_order: procurementItems.filter(item => item.status === 'on_order').length,
    monthly_spend: 24800,
    avg_lead_time: 8.2,
    supplier_count: 12
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'low_stock':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'out_of_stock':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'on_order':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStockPercentage = (item: ProcurementItem) => {
    const range = item.max_stock_level - item.min_stock_level;
    const currentAboveMin = item.current_stock - item.min_stock_level;
    return Math.max(0, (currentAboveMin / range) * 100);
  };

  const getStockColor = (percentage: number) => {
    if (percentage >= 70) return 'bg-emerald-500';
    if (percentage >= 40) return 'bg-amber-500';
    if (percentage >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const createPurchaseOrder = (item: ProcurementItem, quantity: number) => {
    const newOrder: PurchaseOrder = {
      id: (purchaseOrders.length + 1).toString(),
      uuid: `order-uuid-${Date.now()}`,
      order_number: `PO-2024-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
      supplier_name: item.supplier,
      item_name: item.item_name,
      item_code: item.item_code,
      quantity: quantity,
      unit_price: item.cost_price,
      total_amount: item.cost_price * quantity,
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery: new Date(Date.now() + item.lead_time * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      notes: `Auto-generated order for ${item.item_name}`
    };

    setPurchaseOrders(prev => [newOrder, ...prev]);
    setShowOrderModal(false);
    setSelectedItem(null);
  };

  const exportProcurementReport = () => {
    // Implement export functionality
    console.log('Exporting procurement report...');
  };

  const getSuppliers = () => {
    return [...new Set(procurementItems.map(item => item.supplier))];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-6"></div>
            <ShoppingCart className="w-8 h-8 text-emerald-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Procurement Data</h3>
          <p className="text-slate-600">Analyzing inventory and supplier information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-500/25">
                  <ShoppingCart className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-emerald-400/20 rounded-2xl blur-sm -z-10"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Procurement Hub
                </h1>
                <p className="text-slate-600 mt-1">Manage inventory procurement and supplier orders</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportProcurementReport}
                className="px-6 py-3 bg-white/80 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 group backdrop-blur-sm"
              >
                <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Items</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{procurementStats.total_items}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <Package className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Low Stock</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{procurementStats.low_stock}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Monthly Spend</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">${(procurementStats.monthly_spend / 1000).toFixed(0)}K</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Lead Time</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{procurementStats.avg_lead_time}d</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Purchase Orders */}
          <div className="xl:col-span-1 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Recent Orders</h2>
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-4">
              {purchaseOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="p-4 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{order.order_number}</h3>
                      <p className="text-sm text-slate-600">{order.item_name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                      order.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'approved' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
                    <span>{order.supplier_name}</span>
                    <span>{order.quantity} units</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">${order.total_amount.toLocaleString()}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(order.expected_delivery).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Procurement Items */}
          <div className="xl:col-span-2">
            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search items, codes, suppliers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm"
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="on_order">On Order</option>
                  </select>

                  <select
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                    className="px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 shadow-sm"
                  >
                    <option value="all">All Suppliers</option>
                    {getSuppliers().map(supplier => (
                      <option key={supplier} value={supplier}>{supplier}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 gap-6">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden group cursor-pointer"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-lg group-hover:text-emerald-600 transition-colors">
                          {item.item_name}
                        </h3>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-slate-600">{item.item_code}</span>
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                            {item.color}
                          </span>
                          <span className="text-sm text-slate-600">{item.supplier}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(item.status)}`}>
                          {item.status === 'in_stock' && <CheckCircle2 className="w-4 h-4" />}
                          {item.status === 'low_stock' && <AlertTriangle className="w-4 h-4" />}
                          {item.status === 'out_of_stock' && <XCircle className="w-4 h-4" />}
                          {item.status === 'on_order' && <Clock className="w-4 h-4" />}
                          <span className="text-sm font-medium capitalize">
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    {/* Stock Information */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-slate-600">Current Stock</p>
                        <p className="text-2xl font-bold text-slate-900">{item.current_stock}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Min Level</p>
                        <p className="text-lg font-semibold text-slate-900">{item.min_stock_level}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Max Level</p>
                        <p className="text-lg font-semibold text-slate-900">{item.max_stock_level}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Lead Time</p>
                        <p className="text-lg font-semibold text-slate-900">{item.lead_time}d</p>
                      </div>
                    </div>

                    {/* Stock Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">Stock Level</span>
                        <span className="font-semibold text-slate-900">
                          {Math.round(getStockPercentage(item))}% of optimal
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${getStockColor(getStockPercentage(item))}`}
                          style={{ width: `${getStockPercentage(item)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Pricing and Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/60">
                      <div className="flex items-center gap-6 text-slate-600">
                        <div>
                          <p className="text-sm">Cost Price</p>
                          <p className="font-semibold text-slate-900">${item.cost_price}</p>
                        </div>
                        <div>
                          <p className="text-sm">Selling Price</p>
                          <p className="font-semibold text-slate-900">${item.selling_price}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                          setShowOrderModal(true);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Create Order
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60">
                <div className="p-4 bg-slate-100 rounded-2xl inline-block mb-4">
                  <ShoppingCart className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No procurement items found</h3>
                <p className="text-slate-600">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order Modal */}
      {showOrderModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Create Purchase Order</h2>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-slate-900 mb-2">{selectedItem.item_name}</h3>
                <p className="text-slate-600">{selectedItem.item_code} • {selectedItem.color}</p>
                <p className="text-sm text-slate-600 mt-1">Supplier: {selectedItem.supplier}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Order Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedItem.max_stock_level - selectedItem.current_stock}
                    defaultValue={selectedItem.min_stock_level - selectedItem.current_stock}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                  />
                  <p className="text-sm text-slate-600 mt-1">
                    Recommended: {Math.max(selectedItem.min_stock_level - selectedItem.current_stock, 1)} units
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Expected Delivery
                  </label>
                  <div className="px-4 py-3 bg-slate-50 rounded-xl text-slate-700">
                    {new Date(Date.now() + selectedItem.lead_time * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    <span className="text-sm text-slate-500 ml-2">({selectedItem.lead_time} days lead time)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Preferred Suppliers
                  </label>
                  <div className="space-y-2">
                    {selectedItem.preferred_suppliers.map((supplier, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span className="font-medium text-slate-700">{supplier}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowOrderModal(false)}
                className="px-6 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => createPurchaseOrder(selectedItem, selectedItem.min_stock_level - selectedItem.current_stock)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200"
              >
                Create Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcurementPage;