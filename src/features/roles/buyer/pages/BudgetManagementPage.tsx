import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  PieChart,
  Download,
  Plus,
  Filter,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MoreVertical,
  BarChart3,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface BudgetCategory {
  id: string;
  uuid: string;
  category_name: string;
  category_code: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  utilization_rate: number;
  fiscal_year: number;
  quarter: number;
  status: 'on_track' | 'over_budget' | 'under_utilized' | 'at_risk';
  department: string;
  last_updated: string;
}

interface BudgetTransaction {
  id: string;
  uuid: string;
  transaction_date: string;
  description: string;
  category_id: string;
  category_name: string;
  amount: number;
  transaction_type: 'expense' | 'allocation' | 'adjustment';
  supplier: string;
  invoice_number?: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  approved_by?: string;
  notes?: string;
}

interface BudgetStats {
  total_budget: number;
  total_spent: number;
  total_remaining: number;
  utilization_rate: number;
  categories_count: number;
  pending_approvals: number;
  avg_spend_per_day: number;
}

const BudgetManagementPage: React.FC = () => {
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<BudgetCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [timeFrame, setTimeFrame] = useState<'month' | 'quarter' | 'year'>('quarter');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1200));

      const mockCategories: BudgetCategory[] = [
        {
          id: '1',
          uuid: 'category-uuid-1',
          category_name: 'Raw Materials Procurement',
          category_code: 'RM-001',
          allocated_amount: 150000,
          spent_amount: 112500,
          remaining_amount: 37500,
          utilization_rate: 75,
          fiscal_year: 2024,
          quarter: 1,
          status: 'on_track',
          department: 'Procurement',
          last_updated: '2024-01-15 14:30:00'
        },
        {
          id: '2',
          uuid: 'category-uuid-2',
          category_name: 'Packaging Materials',
          category_code: 'PM-002',
          allocated_amount: 80000,
          spent_amount: 72000,
          remaining_amount: 8000,
          utilization_rate: 90,
          status: 'at_risk',
          fiscal_year: 2024,
          quarter: 1,
          department: 'Packaging',
          last_updated: '2024-01-15 16:45:00'
        },
        {
          id: '3',
          uuid: 'category-uuid-3',
          category_name: 'Equipment Maintenance',
          category_code: 'EM-003',
          allocated_amount: 50000,
          spent_amount: 25000,
          remaining_amount: 25000,
          utilization_rate: 50,
          status: 'under_utilized',
          fiscal_year: 2024,
          quarter: 1,
          department: 'Maintenance',
          last_updated: '2024-01-14 09:15:00'
        },
        {
          id: '4',
          uuid: 'category-uuid-4',
          category_name: 'Marketing & Promotion',
          category_code: 'MP-004',
          allocated_amount: 120000,
          spent_amount: 135000,
          remaining_amount: -15000,
          utilization_rate: 112.5,
          status: 'over_budget',
          fiscal_year: 2024,
          quarter: 1,
          department: 'Marketing',
          last_updated: '2024-01-15 11:20:00'
        },
        {
          id: '5',
          uuid: 'category-uuid-5',
          category_name: 'Research & Development',
          category_code: 'RD-005',
          allocated_amount: 200000,
          spent_amount: 95000,
          remaining_amount: 105000,
          utilization_rate: 47.5,
          status: 'under_utilized',
          fiscal_year: 2024,
          quarter: 1,
          department: 'R&D',
          last_updated: '2024-01-13 15:30:00'
        }
      ];

      const mockTransactions: BudgetTransaction[] = [
        {
          id: '1',
          uuid: 'txn-uuid-1',
          transaction_date: '2024-01-15',
          description: 'Glass bottles purchase - GlassCo International',
          category_id: '1',
          category_name: 'Raw Materials Procurement',
          amount: 25000,
          transaction_type: 'expense',
          supplier: 'GlassCo International',
          invoice_number: 'INV-GC-2024-001',
          status: 'processed',
          approved_by: 'Finance Manager'
        },
        {
          id: '2',
          uuid: 'txn-uuid-2',
          transaction_date: '2024-01-14',
          description: 'Packaging design and printing',
          category_id: '2',
          category_name: 'Packaging Materials',
          amount: 18000,
          transaction_type: 'expense',
          supplier: 'PrintMaster Ltd',
          invoice_number: 'INV-PM-2024-015',
          status: 'approved',
          approved_by: 'Procurement Head'
        },
        {
          id: '3',
          uuid: 'txn-uuid-3',
          transaction_date: '2024-01-12',
          description: 'Q1 Budget Allocation Adjustment',
          category_id: '4',
          category_name: 'Marketing & Promotion',
          amount: 20000,
          transaction_type: 'allocation',
          supplier: 'N/A',
          status: 'approved',
          approved_by: 'CFO'
        },
        {
          id: '4',
          uuid: 'txn-uuid-4',
          transaction_date: '2024-01-10',
          description: 'Filling machine maintenance',
          category_id: '3',
          category_name: 'Equipment Maintenance',
          amount: 8500,
          transaction_type: 'expense',
          supplier: 'TechMaintenance Inc',
          invoice_number: 'INV-TM-2024-008',
          status: 'processed',
          approved_by: 'Operations Manager'
        },
        {
          id: '5',
          uuid: 'txn-uuid-5',
          transaction_date: '2024-01-08',
          description: 'New fragrance R&D materials',
          category_id: '5',
          category_name: 'Research & Development',
          amount: 35000,
          transaction_type: 'expense',
          supplier: 'ChemSupply Corp',
          invoice_number: 'INV-CS-2024-003',
          status: 'pending'
        }
      ];

      setBudgetCategories(mockCategories);
      setFilteredCategories(mockCategories);
      setTransactions(mockTransactions);
      setIsLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    let filtered = budgetCategories;

    if (searchTerm) {
      filtered = filtered.filter(category =>
        category.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.category_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.department.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(category => category.status === statusFilter);
    }

    if (departmentFilter !== 'all') {
      filtered = filtered.filter(category => category.department === departmentFilter);
    }

    setFilteredCategories(filtered);
  }, [searchTerm, statusFilter, departmentFilter, budgetCategories]);

  const budgetStats: BudgetStats = {
    total_budget: budgetCategories.reduce((sum, cat) => sum + cat.allocated_amount, 0),
    total_spent: budgetCategories.reduce((sum, cat) => sum + cat.spent_amount, 0),
    total_remaining: budgetCategories.reduce((sum, cat) => sum + cat.remaining_amount, 0),
    utilization_rate: (budgetCategories.reduce((sum, cat) => sum + cat.spent_amount, 0) / budgetCategories.reduce((sum, cat) => sum + cat.allocated_amount, 0)) * 100,
    categories_count: budgetCategories.length,
    pending_approvals: transactions.filter(t => t.status === 'pending').length,
    avg_spend_per_day: 12500
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'at_risk':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'over_budget':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'under_utilized':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'at_risk':
        return <AlertTriangle className="w-4 h-4" />;
      case 'over_budget':
        return <TrendingUp className="w-4 h-4" />;
      case 'under_utilized':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 100) return 'text-red-600';
    if (rate >= 90) return 'text-amber-600';
    if (rate >= 70) return 'text-emerald-600';
    if (rate >= 50) return 'text-blue-600';
    return 'text-slate-600';
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 100) return 'bg-red-500';
    if (rate >= 90) return 'bg-amber-500';
    if (rate >= 70) return 'bg-emerald-500';
    if (rate >= 50) return 'bg-blue-500';
    return 'bg-slate-500';
  };

  const getDepartments = () => {
    return [...new Set(budgetCategories.map(cat => cat.department))];
  };

  const exportBudgetReport = () => {
    // Implement export functionality
    console.log('Exporting budget report...');
  };

  const allocateBudget = (categoryId: string, amount: number) => {
    setBudgetCategories(prev => prev.map(cat =>
      cat.id === categoryId ? {
        ...cat,
        allocated_amount: cat.allocated_amount + amount,
        remaining_amount: cat.remaining_amount + amount,
        utilization_rate: (cat.spent_amount / (cat.allocated_amount + amount)) * 100,
        last_updated: new Date().toISOString()
      } : cat
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin mx-auto mb-6"></div>
            <PieChart className="w-8 h-8 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Budget Data</h3>
          <p className="text-slate-600">Analyzing financial allocations and spending patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/25">
                  <PieChart className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-purple-400/20 rounded-2xl blur-sm -z-10"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Budget Management
                </h1>
                <p className="text-slate-600 mt-1">Monitor and control departmental budgets and spending</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value as any)}
                className="px-4 py-3 bg-white/80 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm backdrop-blur-sm"
              >
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
                <option value="year">Yearly</option>
              </select>
              <button
                onClick={exportBudgetReport}
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
                <p className="text-sm font-medium text-slate-600">Total Budget</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  ${(budgetStats.total_budget / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Wallet className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Spent</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  ${(budgetStats.total_spent / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Utilization Rate</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{budgetStats.utilization_rate.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Approvals</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{budgetStats.pending_approvals}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="xl:col-span-1 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Recent Transactions</h2>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-4">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="p-4 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-sm">{transaction.description}</h3>
                      <p className="text-xs text-slate-600 mt-1">{transaction.category_name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.status === 'processed' ? 'bg-emerald-100 text-emerald-700' :
                      transaction.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                      transaction.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {transaction.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-semibold ${
                      transaction.transaction_type === 'expense' ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {transaction.transaction_type === 'expense' ? '-' : '+'}${transaction.amount.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget Categories */}
          <div className="xl:col-span-2">
            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search categories, departments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm"
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="on_track">On Track</option>
                    <option value="at_risk">At Risk</option>
                    <option value="over_budget">Over Budget</option>
                    <option value="under_utilized">Under Utilized</option>
                  </select>

                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm"
                  >
                    <option value="all">All Departments</option>
                    {getDepartments().map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 gap-6">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden group cursor-pointer"
                  onClick={() => setSelectedCategory(category)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-lg group-hover:text-purple-600 transition-colors">
                          {category.category_name}
                        </h3>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-slate-600">{category.category_code}</span>
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                            {category.department}
                          </span>
                          <span className="text-sm text-slate-600">
                            Q{category.quarter} {category.fiscal_year}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(category.status)}`}>
                          {getStatusIcon(category.status)}
                          <span className="text-sm font-medium capitalize">
                            {category.status.replace('_', ' ')}
                          </span>
                        </div>
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    {/* Budget Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">Budget Utilization</span>
                        <span className={`font-semibold ${getUtilizationColor(category.utilization_rate)}`}>
                          {category.utilization_rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(category.utilization_rate)}`}
                          style={{ width: `${Math.min(category.utilization_rate, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Financial Details */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-slate-600">Allocated</p>
                        <p className="text-lg font-bold text-slate-900">
                          ${(category.allocated_amount / 1000).toFixed(0)}K
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Spent</p>
                        <p className="text-lg font-bold text-slate-900">
                          ${(category.spent_amount / 1000).toFixed(0)}K
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Remaining</p>
                        <p className={`text-lg font-bold ${
                          category.remaining_amount < 0 ? 'text-red-600' : 'text-slate-900'
                        }`}>
                          ${(category.remaining_amount / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/60">
                      <div className="text-sm text-slate-600">
                        Updated: {new Date(category.last_updated).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        {category.status === 'at_risk' || category.status === 'over_budget' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategory(category);
                              setShowAllocationModal(true);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-medium shadow-lg shadow-purple-500/25 transition-all duration-200 flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Allocate More
                          </button>
                        ) : (
                          <button className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition-all duration-200">
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredCategories.length === 0 && (
              <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60">
                <div className="p-4 bg-slate-100 rounded-2xl inline-block mb-4">
                  <PiggyBank className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No budget categories found</h3>
                <p className="text-slate-600">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Allocation Modal */}
      {showAllocationModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Additional Budget Allocation</h2>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-slate-900 mb-2">{selectedCategory.category_name}</h3>
                <p className="text-slate-600">{selectedCategory.category_code} • {selectedCategory.department}</p>
                
                <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Current Allocation</p>
                      <p className="font-semibold text-slate-900">${selectedCategory.allocated_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Remaining</p>
                      <p className={`font-semibold ${
                        selectedCategory.remaining_amount < 0 ? 'text-red-600' : 'text-slate-900'
                      }`}>
                        ${selectedCategory.remaining_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Additional Allocation Amount
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      placeholder="Enter amount"
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Justification
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explain why additional budget is needed..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Approval Required</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    This allocation requires finance department approval before being processed.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAllocationModal(false)}
                className="px-6 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  allocateBudget(selectedCategory.id, 10000); // Example amount
                  setShowAllocationModal(false);
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/25 transition-all duration-200"
              >
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetManagementPage;