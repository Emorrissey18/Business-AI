import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Goal } from "@shared/schema";
import { z } from "zod";
import { FINANCIAL_CATEGORIES, FINANCIAL_TYPES } from "@shared/constants";

const editGoalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  progress: z.number().min(0).max(100),
  status: z.enum(['active', 'completed', 'paused']),
  type: z.enum(["revenue", "expense", "other"]).optional(),
  category: z.string().optional(),
});

type EditGoalForm = z.infer<typeof editGoalSchema>;

interface EditGoalModalProps {
  goal: Goal;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditGoalModal({ goal, isOpen, onClose }: EditGoalModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(goal.progress);
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const form = useForm<EditGoalForm>({
    resolver: zodResolver(editGoalSchema),
    defaultValues: {
      title: goal.title,
      description: goal.description || "",
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : "",
      progress: goal.progress,
      status: goal.status,
      type: goal.type || "revenue",
      category: goal.category || "",
    },
  });

  const editGoalMutation = useMutation({
    mutationFn: async (data: EditGoalForm) => {
      const finalCategory = showCustomCategory ? customCategory : data.category;
      const payload = {
        ...data,
        category: finalCategory,
        progress: progress, // Use slider value
      };
      await apiRequest('PATCH', `/api/goals/${goal.id}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Goal updated",
        description: "Your goal has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/financial-analysis'] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditGoalForm) => {
    const finalCategory = showCustomCategory ? customCategory : data.category;
    const formData = {
      ...data,
      progress,
      category: finalCategory,
      targetDate: data.targetDate || undefined,
    };
    editGoalMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...form.register("title")}
              placeholder="Enter goal title"
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-600">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Enter goal description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Select 
              value={form.watch("type")} 
              onValueChange={(value) => {
                form.setValue("type", value as "revenue" | "expense" | "other");
                form.setValue("category", "");
                setShowCustomCategory(false);
                setCustomCategory("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {FINANCIAL_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            {!showCustomCategory ? (
              <Select 
                value={form.watch("category")} 
                onValueChange={(value) => {
                  if (value === "Other") {
                    setShowCustomCategory(true);
                    form.setValue("category", "");
                  } else {
                    form.setValue("category", value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {FINANCIAL_CATEGORIES[form.watch("type") || "revenue"]?.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="Enter custom category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowCustomCategory(false);
                    setCustomCategory("");
                  }}
                >
                  Choose from list
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              {...form.register("targetDate")}
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={form.watch("status")} 
              onValueChange={(value) => form.setValue("status", value as "active" | "completed" | "paused")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Progress: {progress}%</Label>
            <div className="px-2 py-4">
              <Slider
                value={[progress]}
                onValueChange={(value) => setProgress(value[0])}
                max={100}
                min={0}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={editGoalMutation.isPending}>
              {editGoalMutation.isPending ? "Updating..." : "Update Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}