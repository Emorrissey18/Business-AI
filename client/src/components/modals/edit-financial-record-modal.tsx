import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FinancialRecord } from "@shared/schema";
import { z } from "zod";
import { FINANCIAL_CATEGORIES, FINANCIAL_TYPES } from "@shared/constants";
import { useState } from "react";

const editFinancialRecordSchema = z.object({
  type: z.enum(["revenue", "expense", "other"]),
  category: z.string().optional(), // Make optional to handle custom categories
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});

type EditFinancialRecordForm = z.infer<typeof editFinancialRecordSchema>;

interface EditFinancialRecordModalProps {
  record: FinancialRecord;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditFinancialRecordModal({ record, isOpen, onClose }: EditFinancialRecordModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const form = useForm<EditFinancialRecordForm>({
    resolver: zodResolver(editFinancialRecordSchema),
    defaultValues: {
      type: record.type as "revenue" | "expense" | "other",
      category: record.category,
      amount: record.amount / 100, // Convert from cents
      description: record.description || "",
      date: new Date(record.date).toISOString().split('T')[0],
    },
  });

  const editRecordMutation = useMutation({
    mutationFn: async (data: EditFinancialRecordForm) => {
      const finalCategory = showCustomCategory ? customCategory : data.category;
      const payload = {
        ...data,
        category: finalCategory,
        amount: Math.round(data.amount * 100), // Convert to cents
        date: data.date, // Keep as string for backend to transform
      };
      await apiRequest('PATCH', `/api/financial-records/${record.id}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Record updated",
        description: "Your financial record has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-records'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/financial-analysis'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditFinancialRecordForm) => {
    const finalCategory = showCustomCategory ? customCategory : data.category;
    
    // Validate custom category if needed
    if (showCustomCategory && !customCategory.trim()) {
      form.setError("category", { message: "Category is required" });
      return;
    }
    
    // Validate that we have a category
    if (!finalCategory?.trim()) {
      form.setError("category", { message: "Category is required" });
      return;
    }
    
    form.clearErrors("category");
    editRecordMutation.mutate(data);
  };

  const handleCategoryChange = (value: string) => {
    if (value === "Other") {
      setShowCustomCategory(true);
      form.setValue("category", "custom");
      form.clearErrors("category");
    } else {
      setShowCustomCategory(false);
      form.setValue("category", value);
      form.clearErrors("category");
    }
  };

  const selectedType = form.watch('type');
  const availableCategories = FINANCIAL_CATEGORIES[selectedType] || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Financial Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="type">Type</Label>
            <Select 
              value={form.watch("type")} 
              onValueChange={(value) => {
                form.setValue("type", value as "revenue" | "expense" | "other");
                form.setValue("category", ""); // Reset category when type changes
                setShowCustomCategory(false);
                setCustomCategory("");
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
            {form.formState.errors.type && (
              <p className="text-sm text-red-600">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            {!showCustomCategory ? (
              <Select 
                value={form.watch("category")} 
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
                      form.clearErrors("category");
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
            {(form.formState.errors.category || (showCustomCategory && !customCategory.trim())) && (
              <p className="text-sm text-red-600">
                {form.formState.errors.category?.message || "Category is required"}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              {...form.register("amount", { valueAsNumber: true })}
              placeholder="0.00"
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...form.register("date")}
            />
            {form.formState.errors.date && (
              <p className="text-sm text-red-600">{form.formState.errors.date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Enter description"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={editRecordMutation.isPending}>
              {editRecordMutation.isPending ? "Updating..." : "Update Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}