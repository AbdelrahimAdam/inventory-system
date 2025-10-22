import React, { useState, useEffect } from 'react';
import { 
  Package, 
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
  Phone,
  MapPin,
  ChevronRight,
  MoreVertical,
  FileText,
  BarChart3
} from 'lucide-react';

interface Order {
  id: string;
  uuid: string;
  invoice_number: string;
  invoice_type: 'PURCHASE' | 'SALE' | 'FACTORY_DISPATCH' | 'SALE_RETURN' | 'PURCHASE_RETURN';
  invoice_date: string;
  supplier_name: string;
  client_name: string;
  recipient: string;
  total_amount: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  notes: string;
  created_by: number;
  client_phone: string;
  approved_by: number;
  approved_at: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  item_name: string;
  item_code: string;
  color: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  unit_type: string;
  notes: string;
}

interface OrderStats {
  totalOrders: number;
  pendingApproval: number;
  completedThisMonth: number;
  totalRevenue: number;
}

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const mockOrders: Order[] = [
        {
          id: '1',
          uuid: 'order-uuid-1',
          invoice_number: 'INV-20240115-0001',
          invoice_type: 'PURCHASE',
          invoice_date: '2024-01-15 14:30:00',
          supplier_name: 'GlassCo International',
          client_name: '',
          recipient: '',
          total_amount: 12500.00,
          status: 'APPROVED',
          notes: 'Urgent delivery required for production line',
          created_by: 2,
          client_phone: '',
          approved_by: 1,
          approved_at: '2024-01-15 15:00:00',
          is_locked: true,
          created_at: '2024-01-15 14:30:00',
          updated_at: '2024-01-15 15:00:00',
          items: [
            {
              id: '1-1',
              item_name: 'Premium Perfume Glass 50ml',
              item_code: 'PG-50-PREM',
              color: 'Clear',
              quantity: 500,
              unit_price: 15.00,
              total_amount: 7500.00,
              unit_type: 'pieces',
              notes: 'First quality glass with UV protection'
            },
            {
              id: '1-2',
              item_name: 'Spray Pump Gold',
              item_code: 'SP-GOLD-01',
              color: 'Gold',
              quantity: 500,
              unit_price: 10.00,
              total_amount: 5000.00,
              unit_type: 'pieces',
              notes: 'Luxury finish with smooth mechanism'
            }
          ]
        },
        {
          id: '2',
          uuid: 'order-uuid-2',
          invoice_number: 'INV-20240114-0002',
          invoice_type: 'PURCHASE',
          invoice_date: '2024-01-14 10:15:00',
          supplier_name: 'BottleMaster Ltd',
          client_name: '',
          recipient: '',
          total_amount: 8400.00,
          status: 'SUBMITTED',
          notes: 'Standard quality bottles for regular line',
          created_by: 2,
          client_phone: '',
          approved_by: 0,
          approved_at: '',
          is_locked: false,
          created_at: '2024-01-14 10:15:00',
          updated_at: '2024-01-14 10:15:00',
          items: [
            {
              id: '2-1',
              item_name: 'Luxury Bottle 100ml',
              item_code: 'LB-100-LUX',
              color: 'Amber',
              quantity: 300,
              unit_price: 28.00,
              total_amount: 8400.00,
              unit_type: 'pieces',
              notes: 'Amber color variant with frosted finish'
            }
          ]
        },
        {
          id: '3',
          uuid: 'order-uuid-3',
          invoice_number: 'INV-20240113-0003',
          invoice_type: 'PURCHASE_RETURN',
          invoice_date: '2024-01-13 16:45:00',
          supplier_name: 'PumpTech Industries',
          client_name: '',
          recipient: '',
          total_amount: -2400.00,
          status: 'COMPLETED',
          notes: 'Defective pumps return - batch #PT-234',
          created_by: 2,
          client_phone: '',
          approved_by: 1,
          approved_at: '2024-01-13 17:00:00',
          is_locked: true,
          created_at: '2024-01-13 16:45:00',
          updated_at: '2024-01-13 17:00:00',
          items: [
            {
              id: '3-1',
              item_name: 'Spray Pump Silver',
              item_code: 'SP-SILVER-02',
              color: 'Silver',
              quantity: 120,
              unit_price: 20.00,
              total_amount: 2400.00,
              unit_type: 'pieces',
              notes: 'Defective mechanism - quality control reject'
            }
          ]
        },
        {
          id: '4',
          uuid: 'order-uuid-4',
          invoice_number: 'INV-20240112-0004',
          invoice_type: 'PURCHASE',
          invoice_date: '2024-01-12 09:20:00',
          supplier_name: 'CapManufacturers Inc',
          client_name: '',
          recipient: '',
          total_amount: 3200.00,
          status: 'REJECTED',
          notes: 'Wrong cap dimensions - does not fit bottles',
          created_by: 2,
          client_phone: '',
          approved_by: 1,
          approved_at: '2024-01-12 10:00:00',
          is_locked: true,
          created_at: '2024-01-12 09:20:00',
          updated_at: '2024-01-12 10:00:00',
          items: [
            {
              id: '4-1',
              item_name: 'Premium Cap Gold',
              item_code: 'CAP-GOLD-PREM',
              color: 'Gold',
              quantity: 400,
              unit_price: 8.00,
              total_amount: 3200.00,
              unit_type: 'pieces',
              notes: 'Thread mismatch with existing bottles'
            }
          ]
        }
      ];

      setOrders(mockOrders);
      setFilteredOrders(mockOrders);
      setIsLoading(false);
    };

    loadOrders();
  }, []);

  useEffect(() => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item => 
          item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(order => order.invoice_type === typeFilter);
    }

    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, typeFilter, orders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'SUBMITTED':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'SUBMITTED':
        return <Clock className="w-4 h-4" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4" />;
      case 'DRAFT':
        return <FileText className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'PURCHASE_RETURN':
        return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'SALE':
        return 'bg-green-500/10 text-green-600 border-green-200';
      case 'SALE_RETURN':
        return 'bg-red-500/10 text-red-600 border-red-200';
      case 'FACTORY_DISPATCH':
        return 'bg-purple-500/10 text-purple-600 border-purple-200';
      default:
        return 'bg-slate-500/10 text-slate-600 border-slate-200';
    }
  };

  const orderStats: OrderStats = {
    totalOrders: orders.length,
    pendingApproval: orders.filter(o => o.status === 'SUBMITTED').length,
    completedThisMonth: orders.filter(o => o.status === 'COMPLETED' && new Date(o.invoice_date).getMonth() === new Date().getMonth()).length,
    totalRevenue: orders.filter(o => o.invoice_type === 'PURCHASE').reduce((sum, order) => sum + order.total_amount, 0)
  };

  const exportToCSV = () => {
    const headers = ['Invoice Number', 'Type', 'Supplier', 'Total Amount', 'Status', 'Date', 'Items Count'];
    const csvData = orders.map(order => [
      order.invoice_number,
      order.invoice_type,
      order.supplier_name,
      order.total_amount.toFixed(2),
      order.status,
      new Date(order.invoice_date).toLocaleDateString(),
      order.items.length.toString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <Package className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Orders</h3>
          <p className="text-slate-600">Fetching your supplier orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-blue-400/20 rounded-2xl blur-sm -z-10"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Supplier Orders
                </h1>
                <p className="text-slate-600 mt-1">Manage your purchase orders and returns</p>
              </div>
            </div>
            <button
              onClick={exportToCSV}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 group"
            >
              <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Orders</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{orderStats.totalOrders}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Approval</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{orderStats.pendingApproval}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Completed This Month</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{orderStats.completedThisMonth}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  ${orderStats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search orders, suppliers, items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="COMPLETED">Completed</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
              >
                <option value="all">All Types</option>
                <option value="PURCHASE">Purchase</option>
                <option value="PURCHASE_RETURN">Purchase Return</option>
                <option value="SALE">Sale</option>
                <option value="SALE_RETURN">Sale Return</option>
                <option value="FACTORY_DISPATCH">Factory Dispatch</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden group cursor-pointer"
              onClick={() => viewOrderDetails(order)}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-200/60">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                      {order.invoice_number}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1">
                      {new Date(order.invoice_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(order.invoice_type)}`}>
                      {order.invoice_type.replace('_', ' ')}
                    </span>
                    <MoreVertical className="w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                    <span className="font-medium text-slate-900">{order.supplier_name}</span>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="text-sm font-medium">{order.status}</span>
                  </div>
                </div>
              </div>

              {/* Items Preview */}
              <div className="p-6">
                <div className="space-y-3">
                  {order.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{item.item_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-slate-600">{item.item_code}</span>
                          <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full">
                            {item.color}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{item.quantity} pcs</p>
                        <p className="text-sm text-slate-600">${item.unit_price}</p>
                      </div>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <div className="text-center pt-2">
                      <span className="text-sm text-slate-500">
                        +{order.items.length - 2} more items
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200/60">
                  <div className="flex items-center gap-2 text-slate-600">
                    <DollarSign className="w-4 h-4" />
                    <span className={`font-semibold ${order.total_amount < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                      ${Math.abs(order.total_amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-600 group-hover:gap-3 transition-all duration-200">
                    <span className="text-sm font-medium">View Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-16">
            <div className="p-4 bg-slate-100 rounded-2xl inline-block mb-4">
              <Package className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No orders found</h3>
            <p className="text-slate-600">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">{selectedOrder.invoice_number}</h2>
                  <p className="text-slate-600 mt-2">
                    {new Date(selectedOrder.invoice_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  <XCircle className="w-6 h-6 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-8">
              {/* Order Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Supplier Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-700">{selectedOrder.supplier_name}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Order Status</h3>
                  <div className="space-y-3">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusIcon(selectedOrder.status)}
                      <span className="font-medium">{selectedOrder.status}</span>
                    </div>
                    {selectedOrder.approved_at && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        Approved: {new Date(selectedOrder.approved_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Financial Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Amount:</span>
                      <span className={`font-bold ${selectedOrder.total_amount < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        ${Math.abs(selectedOrder.total_amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Items:</span>
                      <span className="font-semibold text-slate-900">{selectedOrder.items.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-6">Order Items</h3>
                <div className="space-y-4">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 text-lg">{item.item_name}</h4>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm text-slate-600">{item.item_code}</span>
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                              {item.color}
                            </span>
                            <span className="text-sm text-slate-600">{item.unit_type}</span>
                          </div>
                          {item.notes && (
                            <p className="text-slate-600 mt-3 text-sm">{item.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900">${item.unit_price}</p>
                          <p className="text-slate-600 mt-1">× {item.quantity} units</p>
                          <p className="text-lg font-semibold text-blue-600 mt-2">
                            ${item.total_amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                  <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Order Notes
                  </h3>
                  <p className="text-amber-800">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;