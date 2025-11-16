import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
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
  HardDrive,
  Settings,
  Zap,
  Shield,
  ClipboardList
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  updateDoc,
  addDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/services/firebase';

interface MaintenanceTask {
  id: string;
  equipment_name: string;
  equipment_code: string;
  task_type: 'preventive' | 'corrective' | 'predictive' | 'emergency';
  description: string;
  assigned_to: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduled_date: Timestamp;
  due_date: Timestamp;
  completed_date?: Timestamp;
  estimated_duration: number;
  actual_duration?: number;
  parts_required: string[];
  safety_instructions: string;
  notes?: string;
  created_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
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
  last_maintenance: Timestamp;
  next_maintenance: Timestamp;
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

  // Load data from Firebase
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load maintenance tasks
        const tasksQuery = query(
          collection(db, 'maintenanceTasks'),
          orderBy('created_at', 'desc')
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksData = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MaintenanceTask[];

        // Load equipment
        const equipmentQuery = query(collection(db, 'equipment'));
        const equipmentSnapshot = await getDocs(equipmentQuery);
        const equipmentData = equipmentSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Equipment[];

        setTasks(tasksData);
        setFilteredTasks(tasksData);
        setEquipment(equipmentData);
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to empty arrays if Firebase fails
        setTasks([]);
        setEquipment([]);
        setFilteredTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter tasks based on search and filters
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

  // Calculate maintenance statistics
  const maintenanceStats: MaintenanceStats = {
    total_tasks: tasks.length,
    completed_this_week: tasks.filter(t => {
      if (t.status !== 'completed' || !t.completed_date) return false;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return t.completed_date.toDate() > oneWeekAgo;
    }).length,
    overdue_tasks: tasks.filter(t => t.status === 'overdue').length,
    preventive_maintenance: tasks.filter(t => t.task_type === 'preventive').length,
    equipment_uptime: calculateEquipmentUptime(),
    maintenance_cost: calculateMaintenanceCost()
  };

  function calculateEquipmentUptime(): number {
    if (equipment.length === 0) return 0;
    const operationalCount = equipment.filter(eq => eq.status === 'operational').length;
    return Math.round((operationalCount / equipment.length) * 100);
  }

  function calculateMaintenanceCost(): number {
    // Simple calculation - in real app, this would come from actual cost data
    return tasks.filter(t => t.status === 'completed').length * 250;
  }

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

  const updateTaskStatus = async (taskId: string, newStatus: MaintenanceTask['status']) => {
    try {
      const taskRef = doc(db, 'maintenanceTasks', taskId);
      const updateData: any = {
        status: newStatus,
        updated_at: Timestamp.now()
      };

      if (newStatus === 'completed' && !selectedTask?.completed_date) {
        updateData.completed_date = Timestamp.now();
      }

      await updateDoc(taskRef, updateData);

      // Update local state
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { 
          ...task, 
          ...updateData
        } : task
      ));

      // Update selected task if it's the one being modified
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, ...updateData } : null);
      }

    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const viewTaskDetails = (task: MaintenanceTask) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const exportMaintenanceReport = () => {
    // Implement export functionality
    const reportData = {
      generated: new Date().toISOString(),
      stats: maintenanceStats,
      tasks: filteredTasks,
      equipment: equipment
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `maintenance-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isTaskOverdue = (dueDate: Timestamp) => {
    return dueDate.toDate() < new Date();
  };

  const createNewTask = async () => {
    try {
      const newTask = {
        equipment_name: 'New Equipment',
        equipment_code: 'EQP-NEW',
        task_type: 'preventive' as const,
        description: 'New maintenance task',
        assigned_to: 'Current User',
        status: 'scheduled' as const,
        priority: 'medium' as const,
        scheduled_date: Timestamp.now(),
        due_date: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
        estimated_duration: 2,
        parts_required: [],
        safety_instructions: 'Follow standard safety procedures',
        created_by: 'current-user-id',
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'maintenanceTasks'), newTask);
      
      // Update local state
      setTasks(prev => [...prev, { id: docRef.id, ...newTask }]);
      
    } catch (error) {
      console.error('Error creating new task:', error);
    }
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
                onClick={createNewTask}
                className="px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 group"
              >
                <ClipboardList className="w-4 h-4 group-hover:scale-110 transition-transform" />
                New Task
              </button>
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
                      Next Maintenance: {item.next_maintenance.toDate().toLocaleDateString()}
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
                          <span>Due: {task.due_date.toDate().toLocaleDateString()}</span>
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
                        {selectedTask.scheduled_date.toDate().toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Due Date:</span>
                      <span className={`font-semibold ${isTaskOverdue(selectedTask.due_date) ? 'text-red-600' : 'text-slate-900'}`}>
                        {selectedTask.due_date.toDate().toLocaleString()}
                      </span>
                    </div>
                    {selectedTask.completed_date && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Completed:</span>
                        <span className="font-semibold text-slate-900">
                          {selectedTask.completed_date.toDate().toLocaleString()}
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
                    <Settings className="w-4 h-4" />
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