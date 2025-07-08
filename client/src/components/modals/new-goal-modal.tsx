import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { insertGoalSchema } from "@shared/schema";
import { FINANCIAL_CATEGORIES, FINANCIAL_TYPES } from "@shared/constants";
import { z } from "zod";

interface NewGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const goalFormSchema = insertGoalSchema.extend({
  targetDate: z.string().optional(),
});

export default function NewGoalModal({ isOpen, onClose }: NewGoalModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "revenue" as "revenue" | "expense" | "other",
    category: "",
    targetDate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createGoalMutation = useMutation({
    mutationFn: async (data: z.infer<typeof goalFormSchema>) => {
      const goalData = {
        ...data,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      };
      const response = await apiRequest('POST', '/api/goals', goalData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Goal created",
        description: "Your goal has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to create goal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const finalCategory = showCustomCategory ? customCategory : formData.category;
      
      // Validate custom category if needed
      if (showCustomCategory && !customCategory.trim()) {
        setErrors({ category: "Category is required" });
        return;
      }
      
      // Validate that we have a category
      if (!finalCategory.trim()) {
        setErrors({ category: "Category is required" });
        return;
      }
      
      const finalData = {
        ...formData,
        category: finalCategory,
      };
      const validatedData = goalFormSchema.parse(finalData);
      createGoalMutation.mutate(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  const handleClose = () => {
    setFormData({ title: "", description: "", type: "revenue", category: "", targetDate: "" });
    setErrors({});
    setCustomCategory("");
    setShowCustomCategory(false);
    onClose();
  };

  const availableCategories = FINANCIAL_CATEGORIES[formData.type] || [];

  const handleCategoryChange = (value: string) => {
    if (value === "Other") {
      setShowCustomCategory(true);
      setFormData({ ...formData, category: "" });
      setErrors({ ...errors, category: "" });
    } else {
      setShowCustomCategory(false);
      setFormData({ ...formData, category: value });
      setErrors({ ...errors, category: "" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Goal Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter goal title"
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your goal..."
              rows={3}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
          </div>
          
          <div>
            <Label htmlFor="type">Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => {
                setFormData({ ...formData, type: value as "revenue" | "expense" | "other", category: "" });
                setShowCustomCategory(false);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINANCIAL_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type}</p>}
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            {!showCustomCategory ? (
              <Select 
                value={formData.category} 
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map(category => (
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
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    if (e.target.value.trim()) {
                      setErrors({ ...errors, category: "" });
                    }
                  }}
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
            {(errors.category || (showCustomCategory && !customCategory.trim())) && (
              <p className="text-sm text-red-500 mt-1">
                {errors.category || "Category is required"}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              className={errors.targetDate ? "border-red-500" : ""}
            />
            {errors.targetDate && <p className="text-sm text-red-500 mt-1">{errors.targetDate}</p>}
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-primary hover:bg-blue-700"
              disabled={createGoalMutation.isPending}
            >
              {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
