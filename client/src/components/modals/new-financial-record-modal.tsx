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

const newFinancialRecordSchema = z.object({
  type: z.enum(['income', 'expense', 'investment']),
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

const FINANCIAL_CATEGORIES = {
  income: ["Sales", "Services", "Consulting", "Investments", "Other Income"],
  expense: ["Office Supplies", "Marketing", "Travel", "Software & Tools", "Utilities", "Rent", "Salaries", "Other Expenses"],
  investment: ["Equipment", "Software", "Real Estate", "Stocks", "Other Investments"]
};

export default function NewFinancialRecordModal({ isOpen, onClose }: NewFinancialRecordModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      const payload = {
        ...data,
        amount: Math.round(data.amount * 100), // Convert to cents
        date: data.date, // Keep as string for backend to transform
      };
      await apiRequest('POST', '/api/financial-records', payload);
    },
    onSuccess: () => {
      toast({
        title: "Record created",
        description: "Your financial record has been successfully created",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-records'] });
      onClose();
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NewFinancialRecordForm) => {
    createRecordMutation.mutate(data);
  };

  const selectedType = form.watch('type');
  const availableCategories = FINANCIAL_CATEGORIES[selectedType] || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                form.setValue("type", value as "income" | "expense" | "investment");
                form.setValue("category", ""); // Reset category when type changes
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-sm text-red-600">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select 
              value={form.watch("category")} 
              onValueChange={(value) => form.setValue("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.category && (
              <p className="text-sm text-red-600">{form.formState.errors.category.message}</p>
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
            <Button type="submit" disabled={createRecordMutation.isPending}>
              {createRecordMutation.isPending ? "Creating..." : "Create Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}