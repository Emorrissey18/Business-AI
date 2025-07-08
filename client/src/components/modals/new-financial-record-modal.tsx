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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { FINANCIAL_CATEGORIES, FINANCIAL_TYPES } from "@shared/constants";

const newFinancialRecordSchema = z.object({
  type: z.enum(["revenue", "expense", "other"]),
  category: z.string().min(1, "Category is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});

type NewFinancialRecordForm = z.infer<typeof newFinancialRecordSchema>;

interface NewFinancialRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewFinancialRecordModal({ isOpen, onClose }: NewFinancialRecordModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const form = useForm<NewFinancialRecordForm>({
    resolver: zodResolver(newFinancialRecordSchema),
    defaultValues: {
      type: 'expense',
      category: '',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
    },
  });

  const createRecordMutation = useMutation({
    mutationFn: async (data: NewFinancialRecordForm) => {
      // Convert amount to cents for storage
      const recordData = {
        ...data,
        amount: Math.round(data.amount * 100),
      };
      const response = await apiRequest('POST', '/api/financial-records', recordData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Financial record created",
        description: "Your financial record has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-records'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create financial record. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NewFinancialRecordForm) => {
    const finalData = {
      ...data,
      category: showCustomCategory ? customCategory : data.category,
    };
    createRecordMutation.mutate(finalData);
  };

  const handleClose = () => {
    form.reset();
    setCustomCategory("");
    setShowCustomCategory(false);
    onClose();
  };

  const selectedType = form.watch('type');
  const availableCategories = FINANCIAL_CATEGORIES[selectedType] || [];

  const handleCategoryChange = (value: string) => {
    if (value === "Other") {
      setShowCustomCategory(true);
      form.setValue("category", "");
    } else {
      setShowCustomCategory(false);
      form.setValue("category", value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Financial Record</DialogTitle>
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
            {form.formState.errors.category && (
              <p className="text-sm text-red-600">{form.formState.errors.category.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              type="number"
              step="0.01"
              {...form.register("amount", { valueAsNumber: true })}
              className="mt-1"
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              {...form.register("description")}
              placeholder="Enter description..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              type="date"
              {...form.register("date")}
              className="mt-1"
            />
            {form.formState.errors.date && (
              <p className="text-sm text-red-600">{form.formState.errors.date.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRecordMutation.isPending}>
              {createRecordMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}