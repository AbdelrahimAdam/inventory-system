import React, { useState, useEffect } from 'react';
import {
  Factory,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Filter,
  Search,
  Users,
  TrendingUp,
  BarChart3,
  MoreVertical,
  Eye,
  Download,
  Calendar,
  Target,
  Award
} from 'lucide-react';

interface ProductionBatch {
  id: string;
  uuid: string;
  inventory_item_id: number;
  item_name: string;
  item_code: string;
  color: string;
  quantity_dispensed: number;
  packaging_quantity: number;
  finishing_quantity: number;
  shipping_quantity: number;
  breakage_quantity: number;
  shortage_reason?: string;
  notes?: string;
  created_by: number;
  movement_date: string;
  created_at: string;
  status: 'in_progress' | 'packaging' | 'finishing' | 'shipping' | 'completed' | 'on_hold';
  progress: number;
  assigned_workers: string[];
  target_completion: string;
}

interface ProductionStats {
  total_batches: number;
  in_progress: number;
  completed_today: number;
  efficiency_rate: number;
  breakage_rate: number;
  on_time_delivery: number;
}

interface WorkerTask {
  id: string;
  batch_id: string;
  task_type: 'dispensing' | 'packaging' | 'finishing' | 'quality_check';
  item_name: string;
  item_code: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
}

const ProductionTrackingPage: React.FC = () => {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [tasks, setTasks] = useState<WorkerTask[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<ProductionBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFrame, setTimeFrame] = useState<'today' | 'week' | 'month'>('today');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1200));

      const mockBatches: ProductionBatch[] = [
        {
          id: '1',
          uuid: 'batch-uuid-1',
          inventory_item_id: 1,
          item_name: 'Premium Perfume Glass 50ml',
          item_code: 'PG-50-PREM',
          color: 'Clear',
          quantity_dispensed: 1000,
          packaging_quantity: 850,
          finishing_quantity: 800,
          shipping_quantity: 780,
          breakage_quantity: 15,
          shortage_reason: 'Handling damage during packaging',
          notes: 'High priority - luxury client order',
          created_by: 3,
          movement_date: '2024-01-15 08:00:00',
          created_at: '2024-01-15 08:00:00',
          status: 'finishing',
          progress: 75,
          assigned_workers: ['Ahmed', 'Sara', 'Mohamed'],
          target_completion: '2024-01-15 18:00:00'
        },
        {
          id: '2',
          uuid: 'batch-uuid-2',
          inventory_item_id: 2,
          item_name: 'Luxury Bottle 100ml',
          item_code: 'LB-100-LUX',
          color: 'Amber',
          quantity_dispensed: 500,
          packaging_quantity: 480,
          finishing_quantity: 450,
          shipping_quantity: 0,
          breakage_quantity: 8,
          notes: 'Standard production batch',
          created_by: 3,
          movement_date: '2024-01-15 09:30:00',
          created_at: '2024-01-15 09:30:00',
          status: 'packaging',
          progress: 45,
          assigned_workers: ['Fatima', 'Hassan'],
          target_completion: '2024-01-16 12:00:00'
        },
        {
          id: '3',
          uuid: 'batch-uuid-3',
          inventory_item_id: 3,
          item_name: 'Spray Pump Gold',
          item_code: 'SP-GOLD-01',
          color: 'Gold',
          quantity_dispensed: 2000,
          packaging_quantity: 1950,
          finishing_quantity: 1900,
          shipping_quantity: 1850,
          breakage_quantity: 25,
          shortage_reason: 'Mechanical failure in assembly line',
          notes: 'Completed - ready for dispatch',
          created_by: 4,
          movement_date: '2024-01-14 07:00:00',
          created_at: '2024-01-14 07:00:00',
          status: 'completed',
          progress: 100,
          assigned_workers: ['Ali', 'Noura', 'Khalid'],
          target_completion: '2024-01-14 20:00:00'
        },
        {
          id: '4',
          uuid: 'batch-uuid-4',
          inventory_item_id: 4,
          item_name: 'Premium Cap Gold',
          item_code: 'CAP-GOLD-PREM',
          color: 'Gold',
          quantity_dispensed: 800,
          packaging_quantity: 0,
          finishing_quantity: 0,
          shipping_quantity: 0,
          breakage_quantity: 5,
          notes: 'Waiting for material delivery',
          created_by: 3,
          movement_date: '2024-01-15 10:00:00',
          created_at: '2024-01-15 10:00:00',
          status: 'on_hold',
          progress: 15,
          assigned_workers: ['Samir'],
          target_completion: '2024-01-17 15:00:00'
        }
      ];

      const mockTasks: WorkerTask[] = [
        {
          id: '1',
          batch_id: '1',
          task_type: 'finishing',
          item_name: 'Premium Perfume Glass 50ml',
          item_code: 'PG-50-PREM',
          quantity: 800,
          status: 'in_progress',
          assigned_to: 'Current User',
          deadline: '2024-01-15 18:00:00',
          priority: 'high'
        },
        {
          id: '2',
          batch_id: '2',
          task_type: 'packaging',
          item_name: 'Luxury Bottle 100ml',
          item_code: 'LB-100-LUX',
          quantity: 480,
          status: 'pending',
          assigned_to: 'Current User',
          deadline: '2024-01-16 12:00:00',
          priority: 'medium'
        },
        {
          id: '3',
          batch_id: '1',
          task_type: 'quality_check',
          item_name: 'Premium Perfume Glass 50ml',
          item_code: 'PG-50-PREM',
          quantity: 800,
          status: 'pending',
          assigned_to: 'Current User',
          deadline: '2024-01-15 16:00:00',
          priority: 'high'
        }
      ];

      setBatches(mockBatches);
      setFilteredBatches(mockBatches);
      setTasks(mockTasks);
      setIsLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    let filtered = batches;

    if (searchTerm) {
      filtered = filtered.filter(batch =>
        batch.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.color.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(batch => batch.status === statusFilter);
    }

    setFilteredBatches(filtered);
  }, [searchTerm, statusFilter, batches]);

  const productionStats: ProductionStats = {
    total_batches: batches.length,
    in_progress: batches.filter(b => b.status === 'in_progress' || b.status === 'packaging' || b.status === 'finishing').length,
    completed_today: batches.filter(b => b.status === 'completed' && new Date(b.movement_date).toDateString() === new Date().toDateString()).length,
    efficiency_rate: 87.5,
    breakage_rate: 2.1,
    on_time_delivery: 94.3
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'packaging':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'finishing':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'shipping':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'on_hold':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'in_progress':
        return <Play className="w-4 h-4" />;
      case 'packaging':
      case 'finishing':
        return <Package className="w-4 h-4" />;
      case 'shipping':
        return <TrendingUp className="w-4 h-4" />;
      case 'on_hold':
        return <Pause className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
    if (progress >= 70) return 'bg-gradient-to-r from-blue-500 to-blue-600';
    if (progress >= 50) return 'bg-gradient-to-r from-amber-500 to-amber-600';
    return 'bg-gradient-to-r from-red-500 to-red-600';
  };

  const updateBatchStatus = (batchId: string, newStatus: ProductionBatch['status']) => {
    setBatches(prev => prev.map(batch =>
      batch.id === batchId ? { ...batch, status: newStatus } : batch
    ));
  };

  const updateTaskStatus = (taskId: string, newStatus: WorkerTask['status']) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const viewBatchDetails = (batch: ProductionBatch) => {
    setSelectedBatch(batch);
    setShowBatchModal(true);
  };

  const exportProductionReport = () => {
    // Implement export functionality
    console.log('Exporting production report...');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin mx-auto mb-6"></div>
            <Factory className="w-8 h-8 text-orange-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Production Data</h3>
          <p className="text-slate-600">Tracking factory movements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50/20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg shadow-orange-500/25">
                  <Factory className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-orange-400/20 rounded-2xl blur-sm -z-10"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Production Tracking
                </h1>
                <p className="text-slate-600 mt-1">Monitor and manage factory production batches</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value as any)}
                className="px-4 py-3 bg-white/80 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm backdrop-blur-sm"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              <button
                onClick={exportProductionReport}
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
                <p className="text-sm font-medium text-slate-600">Active Batches</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{productionStats.in_progress}</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Factory className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Completed Today</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{productionStats.completed_today}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Efficiency Rate</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{productionStats.efficiency_rate}%</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Breakage Rate</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{productionStats.breakage_rate}%</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* My Tasks */}
          <div className="xl:col-span-1 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">My Tasks</h2>
              <Users className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="p-4 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{task.item_name}</h3>
                      <p className="text-sm text-slate-600">{task.item_code}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.priority === 'high' ? 'bg-red-100 text-red-700' :
                      task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {task.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
                    <span className="capitalize">{task.task_type.replace('_', ' ')}</span>
                    <span>{task.quantity} units</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => updateTaskStatus(task.id, task.status === 'completed' ? 'in_progress' : 'completed')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                        task.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {task.status === 'completed' ? 'Completed' : 'Mark Complete'}
                    </button>
                    <span className="text-xs text-slate-500">
                      {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Production Batches */}
          <div className="xl:col-span-2">
            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search batches, items, codes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm"
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 shadow-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="in_progress">In Progress</option>
                    <option value="packaging">Packaging</option>
                    <option value="finishing">Finishing</option>
                    <option value="shipping">Shipping</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Batches Grid */}
            <div className="grid grid-cols-1 gap-6">
              {filteredBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden group cursor-pointer"
                  onClick={() => viewBatchDetails(batch)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-lg group-hover:text-orange-600 transition-colors">
                          {batch.item_name}
                        </h3>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-slate-600">{batch.item_code}</span>
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                            {batch.color}
                          </span>
                          <span className="text-sm text-slate-600">
                            Batch: {batch.quantity_dispensed} units
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(batch.status)}`}>
                          {getStatusIcon(batch.status)}
                          <span className="text-sm font-medium capitalize">
                            {batch.status.replace('_', ' ')}
                          </span>
                        </div>
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">Production Progress</span>
                        <span className="font-semibold text-slate-900">{batch.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(batch.progress)}`}
                          style={{ width: `${batch.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Production Stages */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[
                        { stage: 'Dispensed', value: batch.quantity_dispensed },
                        { stage: 'Packaging', value: batch.packaging_quantity },
                        { stage: 'Finishing', value: batch.finishing_quantity },
                        { stage: 'Shipping', value: batch.shipping_quantity }
                      ].map((stage, index) => (
                        <div key={stage.stage} className="text-center">
                          <div className={`p-2 rounded-lg ${
                            index <= 
                            (batch.status === 'in_progress' ? 0 :
                             batch.status === 'packaging' ? 1 :
                             batch.status === 'finishing' ? 2 :
                             batch.status === 'shipping' ? 3 : 3)
                              ? 'bg-orange-500/10 text-orange-600' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <Package className="w-4 h-4 mx-auto mb-1" />
                            <p className="text-xs font-medium">{stage.stage}</p>
                            <p className="text-sm font-bold">{stage.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/60">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">{batch.assigned_workers.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        {batch.breakage_quantity > 0 && (
                          <span className="text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {batch.breakage_quantity} breakage
                          </span>
                        )}
                        <span>
                          Target: {new Date(batch.target_completion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredBatches.length === 0 && (
              <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60">
                <div className="p-4 bg-slate-100 rounded-2xl inline-block mb-4">
                  <Factory className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No batches found</h3>
                <p className="text-slate-600">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch Details Modal */}
      {showBatchModal && selectedBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">{selectedBatch.item_name}</h2>
                  <p className="text-slate-600 mt-2">{selectedBatch.item_code} • {selectedBatch.color}</p>
                </div>
                <button
                  onClick={() => setShowBatchModal(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  <AlertTriangle className="w-6 h-6 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-8">
              {/* Production Progress */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Production Progress</h3>
                <div className="bg-slate-50 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-slate-900">{selectedBatch.progress}% Complete</span>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(selectedBatch.status)}`}>
                      {getStatusIcon(selectedBatch.status)}
                      <span className="font-medium capitalize">{selectedBatch.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all duration-500 ${getProgressColor(selectedBatch.progress)}`}
                      style={{ width: `${selectedBatch.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Production Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Production Stages</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Dispensed', value: selectedBatch.quantity_dispensed, completed: true },
                      { label: 'Packaging', value: selectedBatch.packaging_quantity, completed: selectedBatch.packaging_quantity > 0 },
                      { label: 'Finishing', value: selectedBatch.finishing_quantity, completed: selectedBatch.finishing_quantity > 0 },
                      { label: 'Shipping', value: selectedBatch.shipping_quantity, completed: selectedBatch.shipping_quantity > 0 }
                    ].map((stage) => (
                      <div key={stage.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${stage.completed ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                          <span className="font-medium text-slate-700">{stage.label}</span>
                        </div>
                        <span className="font-semibold text-slate-900">{stage.value} units</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Batch Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Breakage Quantity:</span>
                      <span className="font-semibold text-red-600">{selectedBatch.breakage_quantity} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Assigned Workers:</span>
                      <span className="font-semibold text-slate-900">{selectedBatch.assigned_workers.join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Target Completion:</span>
                      <span className="font-semibold text-slate-900">
                        {new Date(selectedBatch.target_completion).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Started:</span>
                      <span className="font-semibold text-slate-900">
                        {new Date(selectedBatch.movement_date).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes and Actions */}
              {selectedBatch.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
                  <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Batch Notes
                  </h3>
                  <p className="text-amber-800">{selectedBatch.notes}</p>
                </div>
              )}

              {selectedBatch.shortage_reason && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Shortage Reason
                  </h3>
                  <p className="text-red-800">{selectedBatch.shortage_reason}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button className="px-6 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition-all duration-200">
                  <RotateCcw className="w-4 h-4 inline mr-2" />
                  Update Progress
                </button>
                <button className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/25 transition-all duration-200">
                  <CheckCircle2 className="w-4 h-4 inline mr-2" />
                  Complete Stage
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionTrackingPage;