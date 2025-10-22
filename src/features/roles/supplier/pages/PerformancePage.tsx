import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  Target,
  Award,
  Calendar,
  Download,
  Users,
  Package,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Filter,
  Eye
} from 'lucide-react';

interface PerformanceMetric {
  id: string;
  metric: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease';
  target: number;
  progress: number;
  icon: React.ReactNode;
  color: string;
}

interface OrderTrend {
  month: string;
  orders: number;
  revenue: number;
  returns: number;
}

interface TopProduct {
  id: string;
  name: string;
  item_code: string;
  total_orders: number;
  total_revenue: number;
  growth: number;
  rating: number;
}

interface SupplierStats {
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  total_revenue: number;
  avg_delivery_time: number;
  satisfaction_rate: number;
  return_rate: number;
}

const PerformancePage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<string>('revenue');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsLoading(false);
    };

    loadData();
  }, [timeRange]);

  const performanceMetrics: PerformanceMetric[] = [
    {
      id: '1',
      metric: 'Total Revenue',
      value: 125400,
      change: 12.5,
      changeType: 'increase',
      target: 150000,
      progress: 83.6,
      icon: <DollarSign className="w-5 h-5" />,
      color: 'emerald'
    },
    {
      id: '2',
      metric: 'Order Volume',
      value: 156,
      change: 8.2,
      changeType: 'increase',
      target: 200,
      progress: 78,
      icon: <Package className="w-5 h-5" />,
      color: 'blue'
    },
    {
      id: '3',
      metric: 'On-Time Delivery',
      value: 94.2,
      change: 2.1,
      changeType: 'increase',
      target: 95,
      progress: 99.2,
      icon: <Clock className="w-5 h-5" />,
      color: 'green'
    },
    {
      id: '4',
      metric: 'Satisfaction Rate',
      value: 4.8,
      change: 0.3,
      changeType: 'increase',
      target: 4.9,
      progress: 98,
      icon: <Star className="w-5 h-5" />,
      color: 'amber'
    },
    {
      id: '5',
      metric: 'Return Rate',
      value: 2.4,
      change: -0.8,
      changeType: 'decrease',
      target: 1.5,
      progress: 62.5,
      icon: <XCircle className="w-5 h-5" />,
      color: 'red'
    },
    {
      id: '6',
      metric: 'Avg Order Value',
      value: 804,
      change: 5.7,
      changeType: 'increase',
      target: 850,
      progress: 94.6,
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'purple'
    }
  ];

  const orderTrends: OrderTrend[] = [
    { month: 'Jan', orders: 45, revenue: 35400, returns: 2 },
    { month: 'Feb', orders: 52, revenue: 41200, returns: 1 },
    { month: 'Mar', orders: 48, revenue: 38500, returns: 3 },
    { month: 'Apr', orders: 61, revenue: 48800, returns: 2 },
    { month: 'May', orders: 55, revenue: 44200, returns: 1 },
    { month: 'Jun', orders: 68, revenue: 55400, returns: 4 },
    { month: 'Jul', orders: 72, revenue: 59800, returns: 2 },
    { month: 'Aug', orders: 65, revenue: 52400, returns: 3 },
    { month: 'Sep', orders: 78, revenue: 63400, returns: 1 },
    { month: 'Oct', orders: 82, revenue: 67800, returns: 2 },
    { month: 'Nov', orders: 76, revenue: 61200, returns: 3 },
    { month: 'Dec', orders: 89, revenue: 72500, returns: 2 }
  ];

  const topProducts: TopProduct[] = [
    {
      id: '1',
      name: 'Premium Perfume Glass 50ml',
      item_code: 'PG-50-PREM',
      total_orders: 45,
      total_revenue: 67500,
      growth: 15.2,
      rating: 4.9
    },
    {
      id: '2',
      name: 'Luxury Bottle 100ml',
      item_code: 'LB-100-LUX',
      total_orders: 32,
      total_revenue: 89600,
      growth: 8.7,
      rating: 4.8
    },
    {
      id: '3',
      name: 'Spray Pump Gold',
      item_code: 'SP-GOLD-01',
      total_orders: 28,
      total_revenue: 28000,
      growth: 12.4,
      rating: 4.7
    },
    {
      id: '4',
      name: 'Premium Cap Gold',
      item_code: 'CAP-GOLD-PREM',
      total_orders: 24,
      total_revenue: 19200,
      growth: 5.3,
      rating: 4.6
    },
    {
      id: '5',
      name: 'Spray Pump Silver',
      item_code: 'SP-SILVER-02',
      total_orders: 19,
      total_revenue: 19000,
      growth: -2.1,
      rating: 4.5
    }
  ];

  const supplierStats: SupplierStats = {
    total_orders: 156,
    completed_orders: 142,
    pending_orders: 14,
    total_revenue: 125400,
    avg_delivery_time: 2.4,
    satisfaction_rate: 4.8,
    return_rate: 2.4
  };

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: string } = {
      emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      blue: 'bg-blue-500/10 text-blue-600 border-blue-200',
      green: 'bg-green-500/10 text-green-600 border-green-200',
      amber: 'bg-amber-500/10 text-amber-600 border-amber-200',
      red: 'bg-red-500/10 text-red-600 border-red-200',
      purple: 'bg-purple-500/10 text-purple-600 border-purple-200'
    };
    return colors[color] || colors.blue;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
    if (progress >= 75) return 'bg-gradient-to-r from-blue-500 to-blue-600';
    if (progress >= 60) return 'bg-gradient-to-r from-amber-500 to-amber-600';
    return 'bg-gradient-to-r from-red-500 to-red-600';
  };

  const exportReport = () => {
    // Implement export functionality
    console.log('Exporting performance report...');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <TrendingUp className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Performance Data</h3>
          <p className="text-slate-600">Crunching your supplier numbers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/25">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-purple-400/20 rounded-2xl blur-sm -z-10"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Performance Dashboard
                </h1>
                <p className="text-slate-600 mt-1">Track your supplier performance and growth metrics</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-4 py-3 bg-white/80 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm backdrop-blur-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              <button
                onClick={exportReport}
                className="px-6 py-3 bg-white/80 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 group backdrop-blur-sm"
              >
                <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Export Report
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {performanceMetrics.map((metric) => (
            <div
              key={metric.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group cursor-pointer"
              onClick={() => setSelectedMetric(metric.metric.toLowerCase())}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${getColorClasses(metric.color)}`}>
                  {metric.icon}
                </div>
                <div className="flex items-center gap-1">
                  {metric.changeType === 'increase' ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${
                    metric.changeType === 'increase' ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </span>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {typeof metric.value === 'number' && metric.metric.includes('Rate') 
                  ? metric.value.toFixed(1)
                  : metric.value.toLocaleString()}
                {metric.metric.includes('Rate') && !metric.metric.includes('Satisfaction') && '%'}
                {metric.metric.includes('Satisfaction') && '/5'}
              </h3>
              <p className="text-slate-600 mb-4">{metric.metric}</p>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Progress</span>
                  <span className="font-semibold text-slate-900">{metric.progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(metric.progress)}`}
                    style={{ width: `${metric.progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Target: {metric.target.toLocaleString()}</span>
                  <span>{metric.progress}% achieved</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts and Detailed Metrics */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Revenue Trend Chart */}
          <div className="xl:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Revenue Trend</h2>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select className="text-sm border-0 bg-transparent focus:ring-0">
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>Yearly</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-4">
              {orderTrends.slice(-6).map((trend, index) => (
                <div key={trend.month} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{trend.month}</p>
                      <p className="text-sm text-slate-600">{trend.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">${trend.revenue.toLocaleString()}</p>
                    <div className="flex items-center gap-1 text-sm">
                      <Package className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-600">{trend.returns} returns</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Top Products</h2>
              <Eye className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{product.name}</p>
                      <p className="text-sm text-slate-600">{product.item_code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">${(product.total_revenue / 1000).toFixed(0)}K</p>
                    <div className="flex items-center gap-1 text-sm">
                      {product.growth > 0 ? (
                        <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-red-600" />
                      )}
                      <span className={product.growth > 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {product.growth > 0 ? '+' : ''}{product.growth}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Statistics */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Order Performance</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50/50 rounded-xl">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{supplierStats.completed_orders}</p>
                <p className="text-sm text-slate-600">Completed</p>
              </div>
              <div className="text-center p-4 bg-amber-50/50 rounded-xl">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{supplierStats.pending_orders}</p>
                <p className="text-sm text-slate-600">Pending</p>
              </div>
              <div className="text-center p-4 bg-emerald-50/50 rounded-xl">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Target className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{supplierStats.avg_delivery_time}d</p>
                <p className="text-sm text-slate-600">Avg Delivery</p>
              </div>
              <div className="text-center p-4 bg-red-50/50 rounded-xl">
                <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{supplierStats.return_rate}%</p>
                <p className="text-sm text-slate-600">Return Rate</p>
              </div>
            </div>
          </div>

          {/* Achievement Badges */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">Achievements</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl border border-amber-200">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Top Performer</p>
                  <p className="text-sm text-slate-600">Consistent 95%+ delivery rate</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl border border-blue-200">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Growth Champion</p>
                  <p className="text-sm text-slate-600">12.5% revenue growth this quarter</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Quality Excellence</p>
                  <p className="text-sm text-slate-600">4.8/5 customer satisfaction</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="mt-6 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl p-6 border border-blue-200/50">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">Performance Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-white/50 rounded-xl">
              <p className="font-semibold text-slate-900">On track for</p>
              <p className="text-blue-600 font-bold">Q1 Target</p>
            </div>
            <div className="text-center p-3 bg-white/50 rounded-xl">
              <p className="font-semibold text-slate-900">Top product</p>
              <p className="text-emerald-600 font-bold">PG-50-PREM</p>
            </div>
            <div className="text-center p-3 bg-white/50 rounded-xl">
              <p className="font-semibold text-slate-900">Best month</p>
              <p className="text-amber-600 font-bold">December</p>
            </div>
            <div className="text-center p-3 bg-white/50 rounded-xl">
              <p className="font-semibold text-slate-900">Growth area</p>
              <p className="text-purple-600 font-bold">Luxury Line</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformancePage;