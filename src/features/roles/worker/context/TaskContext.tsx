import React, { createContext, useContext, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';

interface Task {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

interface TaskContextType {
  tasks: Task[];
  currentTask: Task | null;
  startTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  fetchTasks: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | null>(null);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    // Simulate API call
    setTasks([
      { id: '1', name: 'Inventory Count Aisle 3', status: 'pending', priority: 'medium' },
      { id: '2', name: 'Restock Shelves', status: 'pending', priority: 'high' }
    ]);
  };

  const startTask = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'in-progress' } : t
    ));
    setCurrentTask(tasks.find(t => t.id === taskId) || null);
  };

  const completeTask = (taskId: string) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'completed' } : t
    ));
    setCurrentTask(null);
  };

  return (
    <TaskContext.Provider value={{ tasks, currentTask, startTask, completeTask, fetchTasks }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};