import { useState } from "react";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Clock, AlertCircle, Calendar, Trash2, Edit, Play, Square, RotateCcw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Task } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import NewTaskModal from "@/components/modals/new-task-modal";
import { EditTaskModal } from "@/components/modals/edit-task-modal";
import { format } from "date-fns";

export default function Tasks() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Task> }) => {
      return apiRequest('PATCH', `/api/tasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Task updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/tasks/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Task deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const updateTaskStatus = (task: Task, newStatus: string) => {
    if (task.status === newStatus) return; // Prevent unnecessary updates
    updateTaskMutation.mutate({ id: task.id, updates: { status: newStatus } });
  };

  const markAsCompleted = (task: Task) => {
    updateTaskStatus(task, 'completed');
  };

  const markAsInProgress = (task: Task) => {
    updateTaskStatus(task, 'in_progress');
  };

  const markAsPending = (task: Task) => {
    updateTaskStatus(task, 'pending');
  };

  const pendingTasks = tasks?.filter(task => task.status === 'pending') || [];
  const inProgressTasks = tasks?.filter(task => task.status === 'in_progress') || [];
  const completedTasks = tasks?.filter(task => task.status === 'completed') || [];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Loading tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Navigation />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <Button 
            className="bg-primary hover:bg-blue-700"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pending Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <span>Pending ({pendingTasks.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                {pendingTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No pending tasks</p>
                    <p className="text-sm text-gray-400">Create your first task to get started</p>
                  </div>
                ) : (
                  pendingTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onMarkCompleted={markAsCompleted}
                      onMarkInProgress={markAsInProgress}
                      onMarkPending={markAsPending}
                      onDelete={(id) => deleteTaskMutation.mutate(id)}
                      getPriorityColor={getPriorityColor}
                      isUpdating={updateTaskMutation.isPending}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* In Progress Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span>In Progress ({inProgressTasks.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                {inProgressTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No tasks in progress</p>
                    <p className="text-sm text-gray-400">Start working on tasks to see them here</p>
                  </div>
                ) : (
                  inProgressTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onMarkCompleted={markAsCompleted}
                      onMarkInProgress={markAsInProgress}
                      onMarkPending={markAsPending}
                      onDelete={(id) => deleteTaskMutation.mutate(id)}
                      getPriorityColor={getPriorityColor}
                      isUpdating={updateTaskMutation.isPending}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Completed Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Completed ({completedTasks.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                {completedTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No completed tasks</p>
                    <p className="text-sm text-gray-400">Complete tasks to see them here</p>
                  </div>
                ) : (
                  completedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onMarkCompleted={markAsCompleted}
                      onMarkInProgress={markAsInProgress}
                      onMarkPending={markAsPending}
                      onDelete={(id) => deleteTaskMutation.mutate(id)}
                      getPriorityColor={getPriorityColor}
                      isUpdating={updateTaskMutation.isPending}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <NewTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onMarkCompleted: (task: Task) => void;
  onMarkInProgress: (task: Task) => void;
  onMarkPending: (task: Task) => void;
  onDelete: (id: number) => void;
  getPriorityColor: (priority: string) => string;
  isUpdating: boolean;
}

function TaskCard({ task, onMarkCompleted, onMarkInProgress, onMarkPending, onDelete, getPriorityColor, isUpdating }: TaskCardProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);

  const getStatusButtons = () => {
    const buttons = [];
    
    // Show relevant action buttons based on current status
    if (task.status !== 'completed') {
      buttons.push(
        <Button
          key="complete"
          variant="ghost"
          size="sm"
          onClick={() => onMarkCompleted(task)}
          disabled={isUpdating}
          className="p-1 h-8 w-8 text-green-600 hover:text-green-700"
          title="Mark as completed"
        >
          <CheckCircle className="h-4 w-4" />
        </Button>
      );
    }
    
    if (task.status !== 'in_progress') {
      buttons.push(
        <Button
          key="progress"
          variant="ghost"
          size="sm"
          onClick={() => onMarkInProgress(task)}
          disabled={isUpdating}
          className="p-1 h-8 w-8 text-yellow-600 hover:text-yellow-700"
          title="Mark as in progress"
        >
          <Play className="h-4 w-4" />
        </Button>
      );
    }
    
    if (task.status !== 'pending') {
      buttons.push(
        <Button
          key="pending"
          variant="ghost"
          size="sm"
          onClick={() => onMarkPending(task)}
          disabled={isUpdating}
          className="p-1 h-8 w-8 text-gray-600 hover:text-gray-700"
          title="Mark as pending"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      );
    }
    
    return buttons;
  };

  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 flex-1">{task.title}</h3>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            className="p-1 h-8 w-8 text-blue-600 hover:text-blue-700"
            title="Edit task"
          >
            <Edit className="h-4 w-4" />
          </Button>
          {getStatusButtons()}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(task.id)}
            className="p-1 h-8 w-8 text-red-500 hover:text-red-700"
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {task.description && (
        <p className="text-sm text-gray-600 mb-3">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {task.status.replace('_', ' ')}
          </Badge>
        </div>
        
        {task.dueDate && (
          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="h-3 w-3 mr-1" />
            {format(new Date(task.dueDate), 'MMM d')}
          </div>
        )}
      </div>

      <EditTaskModal 
        task={task}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />
    </div>
  );
}