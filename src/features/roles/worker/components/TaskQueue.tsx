import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  dueDate?: string;
}

interface TaskQueueProps {
  initialTasks?: Task[];
  onTaskStatusChange?: (taskId: string, newStatus: Task["status"]) => void;
}

const statusLabels: Record<Task["status"], string> = {
  pending: "قيد الانتظار",
  "in-progress": "قيد التنفيذ",
  completed: "مكتملة",
};

const statusColors = {
  pending: "bg-yellow-200 text-yellow-800",
  "in-progress": "bg-blue-200 text-blue-800",
  completed: "bg-green-200 text-green-800",
};

const TaskQueue: React.FC<TaskQueueProps> = ({
  initialTasks = [],
  onTaskStatusChange,
}) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      if (initialTasks.length === 0) {
        setTasks([
          {
            id: "1",
            title: "فحص شحنة الزجاجات الفارغة",
            description: "تحقق من الجودة وعدد الزجاجات الفارغة الجديدة.",
            status: "pending",
            dueDate: "2025-06-01",
          },
          {
            id: "2",
            title: "إعادة تعبئة مواد التغليف",
            description: "إعادة تخزين مواد التغليف بالقرب من محطة التعبئة.",
            status: "in-progress",
            dueDate: "2025-05-28",
          },
          {
            id: "3",
            title: "تنظيف محطة العمل",
            description: "تنظيف وتعقيم منطقة محطة العمل يومياً.",
            status: "completed",
            dueDate: "2025-05-23",
          },
        ]);
      }
      setLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [initialTasks]);

  const handleStatusToggle = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        let newStatus: Task["status"];
        if (task.status === "pending") newStatus = "in-progress";
        else if (task.status === "in-progress") newStatus = "completed";
        else newStatus = "pending";
        onTaskStatusChange?.(taskId, newStatus);
        return { ...task, status: newStatus };
      })
    );
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-48 text-gray-400 select-none">
        جاري تحميل المهام...
      </div>
    );

  if (tasks.length === 0)
    return (
      <div className="flex justify-center items-center h-48 text-gray-400 select-none">
        لا توجد مهام حالياً
      </div>
    );

  return (
    <section
      dir="rtl"
      aria-label="قائمة المهام للعامل"
      className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-lg"
    >
      <h2 className="text-2xl font-semibold mb-6 text-gray-900 text-center">
        قائمة المهام اليومية
      </h2>

      <ul className="space-y-4">
        <AnimatePresence>
          {tasks.map(({ id, title, description, status, dueDate }) => (
            <motion.li
              key={id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              layout
              className="bg-gray-50 rounded-xl shadow-md p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between
                hover:shadow-lg transition-shadow duration-300 ease-in-out"
              onClick={() => handleStatusToggle(id)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleStatusToggle(id);
                }
              }}
              role="button"
              aria-pressed={status === "completed"}
              aria-label={`المهمة: ${title}، الحالة: ${statusLabels[status]}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 flex-grow">
                <h3 className="text-lg font-medium text-gray-900">{title}</h3>
                <p className="mt-1 sm:mt-0 text-gray-600 flex-grow">{description}</p>
              </div>
              <div className="mt-3 sm:mt-0 flex items-center space-x-4">
                {dueDate && (
                  <time
                    dateTime={dueDate}
                    className="text-sm text-gray-400 whitespace-nowrap"
                  >
                    {new Date(dueDate).toLocaleDateString("ar-EG", {
                      day: "numeric",
                      month: "short",
                    })}
                  </time>
                )}
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold select-none
                  ${statusColors[status]}`}
                >
                  {statusLabels[status]}
                </span>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <p className="mt-6 text-center text-gray-500 text-xs select-none">
        اضغط على المهمة لتغيير حالتها
      </p>
    </section>
  );
};

export default TaskQueue;
