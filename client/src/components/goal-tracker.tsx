import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Plus, Edit, Trash2 } from "lucide-react";
import { Goal } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import NewGoalModal from "./modals/new-goal-modal";

interface GoalTrackerProps {
  title?: string;
  showAddButton?: boolean;
  limit?: number;
}

export default function GoalTracker({ title = "Goal Tracking", showAddButton = true, limit }: GoalTrackerProps) {
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goals, isLoading } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/goals/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Goal deleted",
        description: "Goal has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-primary";
    if (progress >= 50) return "bg-warning";
    return "bg-gray-400";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="status-badge bg-success text-white">Completed</Badge>;
      case 'paused':
        return <Badge className="status-badge bg-gray-400 text-white">Paused</Badge>;
      default:
        return <Badge className="status-badge bg-primary text-white">Active</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayGoals = limit ? goals?.slice(0, limit) : goals;

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Target className="text-primary mr-2" />
              {title}
            </h2>
            {showAddButton && (
              <Button
                onClick={() => setShowNewGoalModal(true)}
                className="bg-primary hover:bg-blue-700 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Goal
              </Button>
            )}
          </div>
          
          {!goals || goals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No goals set yet</p>
              <p className="text-sm text-gray-400">Create your first goal to start tracking progress</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayGoals?.map((goal) => (
                <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{goal.title}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{goal.progress}%</span>
                      {getStatusBadge(goal.status)}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={cn("h-2 rounded-full transition-all", getProgressColor(goal.progress))}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  {goal.description && (
                    <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Updated {formatDistanceToNow(new Date(goal.updatedAt), { addSuffix: true })}
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-error hover:text-red-700"
                        onClick={() => deleteGoalMutation.mutate(goal.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NewGoalModal
        isOpen={showNewGoalModal}
        onClose={() => setShowNewGoalModal(false)}
      />
    </>
  );
}
