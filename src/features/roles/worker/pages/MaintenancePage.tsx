import React, { useState, useEffect } from 'react';
import {
  Wrench,
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
  Award,
  Tool,
  HardDrive,
  Settings,
  Zap,
  Shield
} from 'lucide-react';

interface MaintenanceTask {
  id: string;
  uuid: string;
  equipment_name: string;
  equipment_code: string;
  task_type: 'preventive' | 'corrective' | 'predictive' | 'emergency';
  description: string;
  assigned_to: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduled_date: string;
  due_date: string;
  completed_date?: string;
  estimated_duration: number; // in hours
  actual_duration?: number;
  parts_required: string[];
  safety_instructions: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface MaintenanceStats {
  total_tasks: number;
  completed_this_week: number;
  overdue_tasks: number;
  preventive_maintenance: number;
  equipment_uptime: number;
  maintenance_cost: number;
}

interface Equipment {
  id: string;
  name: string;
  code: string;
  type: string;
  status: 'operational' | 'maintenance' | 'down' | 'idle';
  last_maintenance: string;
  next_maintenance: string;
  utilization: number;
  health_score: number;
}

const MaintenancePage: React.FC = () => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<MaintenanceTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1200));

      const mockTasks: MaintenanceTask[] = [
        {
          id: '1',
          uuid: 'task-uuid-1',
          equipment_name: 'Automatic Filling Machine',
          equipment_code: 'AFM-001',
          task_type: 'preventive',
          description: 'Monthly calibration and lubrication of filling nozzles',
          assigned_to: 'Current User',
          status: 'in_progress',
          priority: 'high',
          scheduled_date: '2024-01-15 08:00:00',
          due_date: '2024-01-15 16:00:00',
          estimated_duration: 4,
          actual_duration: 2,
          parts_required: ['Lubricant Oil', 'Calibration Tools', 'Cleaning Cloths'],
          safety_instructions: 'Ensure machine is powered off and locked out before starting maintenance',
          notes: 'Check nozzle alignment and pressure settings',
          created_by: 3,
          created_at: '2024-01-10 14:00:00',
          updated_at: '2024-01-15 10:30:00'
        },
        {
          id: '2',
          uuid: 'task-uuid-2',
          equipment_name: 'Conveyor System',
          equipment_code: 'CVS-003',
          task_type: 'corrective',
          description: 'Replace worn-out belt and tensioner assembly',
          assigned_to: 'Current User',
          status: 'scheduled',
          priority: 'critical',
          scheduled_date: '2024-01-16 09:00:00',
          due_date: '2024-01-16 13:00:00',
          estimated_duration: 3,
          parts_required: ['Conveyor Belt', 'Tensioner Assembly', 'Bearings'],
          safety_instructions: 'Lock out conveyor power source. Use proper lifting equipment for belt replacement.',
          notes: 'Urgent - affecting production line efficiency',
          created_by: 2,
          created_at: '2024-01-14 16:30:00',
          updated_at: '2024-01-14 16:30:00'
        },
        {
          id: '3',
          uuid: 'task-uuid-3',
          equipment_name: 'Packaging Sealer',
          equipment_code: 'PKS-002',
          task_type: 'preventive',
          description: 'Weekly inspection and cleaning of heating elements',
          assigned_to: 'Current User',
          status: 'completed',
          priority: 'medium',
          scheduled_date: '2024-01-12 10:00:00',
          due_date: '2024-01-12 12:00:00',
          completed_date: '2024-01-12 11:30:00',
          estimated_duration: 2,
          actual_duration: 1.5,
          parts_required: ['Cleaning Solution', 'Replacement Filters'],
          safety_instructions: 'Allow machine to cool completely before inspection. Wear heat-resistant gloves.',
          notes: 'Heating elements in good condition. Replaced air filters.',
          created_by: 3,
          created_at: '2024-01-08 09:00:00',
          updated_at: '2024-01-12 11:30:00'
        },
        {
          id: '4',
          uuid: 'task-uuid-4',
          equipment_name: 'Cooling System',
          equipment_code: 'CLS-001',
          task_type: 'predictive',
          description: 'Vibration analysis and temperature monitoring',
          assigned_to: 'Current User',
          status: 'overdue',
          priority: 'high',
          scheduled_date: '2024-01-10 14:00:00',
          due_date: '2024-01-13 18:00:00',
          estimated_duration: 2,
          parts_required: ['Vibration Sensor', 'Thermal Camera'],
          safety_instructions: 'Monitor system while operational. Maintain safe distance from moving parts.',
          notes: 'Delayed due to sensor calibration issues',
          created_by: 2,
          created_at: '2024-01-05 11:00:00',
          updated_at: '2024-01-14 08:00:00'
        },
        {
          id: '5',
          uuid: 'task-uuid-5',
          equipment_name: 'Mixing Tank Agitator',
          equipment_code: 'MTA-004',
          task_type: 'emergency',
          description: 'Emergency repair of agitator motor coupling',
          assigned_to: 'Current User',
          status: 'scheduled',
          priority: 'critical',
          scheduled_date: '2024-01-15 13:00:00',
          due_date: '2024-01-15 17:00:00',
          estimated_duration: 3,
          parts_required: ['Motor Coupling', 'Alignment Tools', 'Seal Kit'],
          safety_instructions: 'EMERGENCY: Full lockout/tagout required. Electrical hazard present.',
          notes: 'Production line halted until repair completed',
          created_by: 1,
          created_at: '2024-01-15 11:15:00',
          updated_at: '2024-01-15 11:15:00'
        }
      ];

      const mockEquipment: Equipment[] = [
        {
          id: '1',
          name: 'Automatic Filling Machine',
          code: 'AFM-001',
          type: 'Filling',
          status: 'maintenance',
          last_maintenance: '2024-01-15 10:30:00',
          next_maintenance: '2024-02-15 08:00:00',
          utilization: 85,
          health_score: 92
        },
        {
          id: '2',
          name: 'Conveyor System',
          code: 'CVS-003',
          type: 'Transport',
          status: 'operational',
          last_maintenance: '2024-01-10 14:00:00',
          next_maintenance: '2024-01-24 09:00:00',
          utilization: 78,
          health_score: 88
        },
        {
          id: '3',
          name: 'Packaging Sealer',
          code: 'PKS-002',
          type: 'Packaging',
          status: 'operational',
          last_maintenance: '2024-01-12 11:30:00',
          next_maintenance: '2024-01-19 10:00:00',
          utilization: 92,
          health_score: 95
        },
        {
          id: '4',
          name: 'Cooling System',
          code: 'CLS-001',
          type: 'Utilities',
          status: 'down',
          last_maintenance: '2023-12-20 16:00:00',
          next_maintenance: '2024-01-20 14:00:00',
          utilization: 65,
          health_score: 72
        },
        {
          id: '5',
          name: 'Mixing Tank Agitator',
          code: 'MTA-004',
          type: 'Mixing',
          status: 'down',
          last_maintenance: '2024-01-08 09:00:00',
          next_maintenance: '2024-01-22 11:00:00',
          utilization: 88,
          health_score: 85
        }
      ];

      setTasks(mockTasks);
      setFilteredTasks(mockTasks);
      setEquipment(mockEquipment);
      setIsLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    let filtered = tasks;

    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.equipment_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(task => task.task_type === typeFilter);
    }

    setFilteredTasks(filtered);
  }, [searchTerm, statusFilter, priorityFilter, typeFilter, tasks]);

  const maintenanceStats: MaintenanceStats = {
    total_tasks: tasks.length,
    completed_this_week: tasks.filter(t => t.status === 'completed' && new Date(t.completed_date!).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length,
    overdue_tasks: tasks.filter(t => t.status === 'overdue').length,
    preventive_maintenance: tasks.filter(t => t.task_type === 'preventive').length,
    equipment_uptime: 94.2,
    maintenance_cost: 12500
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'scheduled':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'overdue':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'cancelled':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500/10 text-red-600 border-red-200';
      case 'high':
        return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'medium':
        return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'low':
        return 'bg-blue-500/10 text-blue-600 border-blue-200';
      default:
        return 'bg-slate-500/10 text-slate-600 border-slate-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'preventive':
        return 'bg-green-500/10 text-green-600';
      case 'corrective':
        return 'bg-blue-500/10 text-blue-600';
      case 'predictive':
        return 'bg-purple-500/10 text-purple-600';
      case 'emergency':
        return 'bg-red-500/10 text-red-600';
      default:
        return 'bg-slate-500/10 text-slate-600';
    }
  };

  const getEquipmentStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-emerald-100 text-emerald-700';
      case 'maintenance':
        return 'bg-amber-100 text-amber-700';
      case 'down':
        return 'bg-red-100 text-red-700';
      case 'idle':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-amber-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const updateTaskStatus = (taskId: string, newStatus: MaintenanceTask['status']) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { 
        ...task, 
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'completed' && !task.completed_date ? { completed_date: new Date().toISOString() } : {})
      } : task
    ));
  };

  const viewTaskDetails = (task: MaintenanceTask) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const exportMaintenanceReport = () => {
    // Implement export functionality
    console.log('Exporting maintenance report...');
  };

  const isTaskOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <Wrench className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading Maintenance Data</h3>
          <p className="text-slate-600">Checking equipment status and maintenance schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/25">
                  <Wrench className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-blue-400/20 rounded-2xl blur-sm -z-10"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Maintenance Hub
                </h1>
                <p className="text-slate-600 mt-1">Manage equipment maintenance and ensure operational excellence</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportMaintenanceReport}
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
                <p className="text-sm font-medium text-slate-600">Active Tasks</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{maintenanceStats.total_tasks}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Completed This Week</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{maintenanceStats.completed_this_week}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Overdue Tasks</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{maintenanceStats.overdue_tasks}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Equipment Uptime</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{maintenanceStats.equipment_uptime}%</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Equipment Status */}
          <div className="xl:col-span-1 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-900">Equipment Status</h2>
              <HardDrive className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-4">
              {equipment.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{item.name}</h3>
                      <p className="text-sm text-slate-600">{item.code} • {item.type}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEquipmentStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600">Health Score</p>
                      <p className={`font-semibold ${getHealthScoreColor(item.health_score)}`}>
                        {item.health_score}%
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600">Utilization</p>
                      <p className="font-semibold text-slate-900">{item.utilization}%</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/60">
                    <p className="text-xs text-slate-600">
                      Next Maintenance: {new Date(item.next_maintenance).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance Tasks */}
          <div className="xl:col-span-2">
            {/* Filters */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-slate-200/60 mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search equipment, tasks, descriptions..."
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
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                  >
                    <option value="all">All Priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="preventive">Preventive</option>
                    <option value="corrective">Corrective</option>
                    <option value="predictive">Predictive</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tasks Grid */}
            <div className="grid grid-cols-1 gap-6">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden group cursor-pointer"
                  onClick={() => viewTaskDetails(task)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                            {task.equipment_name}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(task.task_type)}`}>
                            {task.task_type}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm mb-2">{task.description}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>{task.equipment_code}</span>
                          <span>Est. {task.estimated_duration}h</span>
                          {task.actual_duration && (
                            <span>Actual: {task.actual_duration}h</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(task.status)}`}>
                          {task.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                          {task.status === 'in_progress' && <Play className="w-4 h-4" />}
                          {task.status === 'scheduled' && <Clock className="w-4 h-4" />}
                          {task.status === 'overdue' && <AlertTriangle className="w-4 h-4" />}
                          <span className="text-sm font-medium capitalize">
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(task.priority)}`}>
                          {task.priority} Priority
                        </span>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                          {isTaskOverdue(task.due_date) && task.status !== 'completed' && (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-slate-600">
                        Assigned to: <span className="font-semibold text-slate-900">{task.assigned_to}</span>
                      </div>
                    </div>

                    {/* Parts Required */}
                    {task.parts_required.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-slate-700 mb-2">Parts Required:</p>
                        <div className="flex flex-wrap gap-2">
                          {task.parts_required.map((part, index) => (
                            <span key={index} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                              {part}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200/60">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm">Safety instructions included</span>
                      </div>
                      <div className="flex gap-2">
                        {task.status !== 'completed' && task.status !== 'cancelled' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTaskStatus(task.id, task.status === 'in_progress' ? 'completed' : 'in_progress');
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              task.status === 'in_progress'
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {task.status === 'in_progress' ? 'Mark Complete' : 'Start Task'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredTasks.length === 0 && (
              <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60">
                <div className="p-4 bg-slate-100 rounded-2xl inline-block mb-4">
                  <Wrench className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No maintenance tasks found</h3>
                <p className="text-slate-600">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">{selectedTask.equipment_name}</h2>
                  <p className="text-slate-600 mt-2">{selectedTask.equipment_code} • {selectedTask.task_type} Maintenance</p>
                </div>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                  <AlertTriangle className="w-6 h-6 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-8">
              {/* Task Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Task Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Status:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedTask.status)}`}>
                        {selectedTask.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Priority:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(selectedTask.priority)}`}>
                        {selectedTask.priority}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Scheduled:</span>
                      <span className="font-semibold text-slate-900">
                        {new Date(selectedTask.scheduled_date).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Due Date:</span>
                      <span className={`font-semibold ${isTaskOverdue(selectedTask.due_date) ? 'text-red-600' : 'text-slate-900'}`}>
                        {new Date(selectedTask.due_date).toLocaleString()}
                      </span>
                    </div>
                    {selectedTask.completed_date && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Completed:</span>
                        <span className="font-semibold text-slate-900">
                          {new Date(selectedTask.completed_date).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Time & Resources</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Estimated Duration:</span>
                      <span className="font-semibold text-slate-900">{selectedTask.estimated_duration} hours</span>
                    </div>
                    {selectedTask.actual_duration && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Actual Duration:</span>
                        <span className="font-semibold text-slate-900">{selectedTask.actual_duration} hours</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600">Assigned To:</span>
                      <span className="font-semibold text-slate-900">{selectedTask.assigned_to}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description and Instructions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Tool className="w-4 h-4" />
                    Task Description
                  </h3>
                  <p className="text-blue-800">{selectedTask.description}</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Safety Instructions
                  </h3>
                  <p className="text-red-800">{selectedTask.safety_instructions}</p>
                </div>
              </div>

              {/* Parts Required */}
              {selectedTask.parts_required.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-6 mb-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Required Parts</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedTask.parts_required.map((part, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-slate-700">{part}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedTask.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
                  <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Additional Notes
                  </h3>
                  <p className="text-amber-800">{selectedTask.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button className="px-6 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition-all duration-200">
                  <RotateCcw className="w-4 h-4 inline mr-2" />
                  Update Progress
                </button>
                {selectedTask.status !== 'completed' && selectedTask.status !== 'cancelled' && (
                  <button 
                    onClick={() => updateTaskStatus(selectedTask.id, selectedTask.status === 'in_progress' ? 'completed' : 'in_progress')}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200"
                  >
                    {selectedTask.status === 'in_progress' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 inline mr-2" />
                        Mark Complete
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 inline mr-2" />
                        Start Task
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;