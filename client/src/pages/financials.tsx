import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, DollarSign, TrendingUp, TrendingDown, Edit, Trash2, Search, Filter, Brain } from "lucide-react";
import { FinancialRecord } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import NewFinancialRecordModal from "@/components/modals/new-financial-record-modal";
import EditFinancialRecordModal from "@/components/modals/edit-financial-record-modal";
import Navigation from "@/components/navigation";

const FINANCIAL_CATEGORIES = {
  income: ["Sales", "Services", "Consulting", "Investments", "Other Income"],
  expense: ["Office Supplies", "Marketing", "Travel", "Software & Tools", "Utilities", "Rent", "Salaries", "Other Expenses"],
  investment: ["Equipment", "Software", "Real Estate", "Stocks", "Other Investments"]
};

export default function Financials() {
  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: records, isLoading } = useQuery<FinancialRecord[]>({
    queryKey: ['/api/financial-records'],
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/financial-records/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Record deleted",
        description: "Financial record has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-records'] });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'revenue':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'expense':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'investment':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'revenue':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Revenue</Badge>;
      case 'expense':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Expense</Badge>;
      case 'investment':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Investment</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const filteredRecords = records?.filter(record => {
    const matchesType = typeFilter === "all" || record.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || record.category === categoryFilter;
    const matchesSearch = searchQuery === "" || 
      record.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesCategory && matchesSearch;
  });

  // AI Financial Analysis
  const { data: aiAnalysis, isLoading: aiLoading } = useQuery({
    queryKey: ['/api/ai/financial-analysis'],
    enabled: !!records && records.length > 0,
  });

  const calculateTotals = () => {
    if (!filteredRecords) return { revenue: 0, expenses: 0, investments: 0, net: 0 };
    
    // Use AI analysis if available, otherwise calculate normally
    if (aiAnalysis) {
      return {
        revenue: aiAnalysis.adjustedRevenue,
        expenses: aiAnalysis.adjustedExpenses,
        investments: aiAnalysis.adjustedInvestments,
        net: aiAnalysis.adjustedNetProfit
      };
    }
    
    const revenue = filteredRecords.filter(r => r.type === 'revenue').reduce((sum, r) => sum + r.amount, 0);
    const expenses = filteredRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
    const investments = filteredRecords.filter(r => r.type === 'other').reduce((sum, r) => sum + r.amount, 0);
    const net = revenue - expenses; // Net profit = revenue - expenses only
    
    return { revenue, expenses, investments, net };
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Navigation />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financial Records</h1>
        <Button
          onClick={() => setShowNewRecordModal(true)}
          className="bg-primary hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </div>

      {/* AI Insights */}
      {aiAnalysis && aiAnalysis.insights && aiAnalysis.insights.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-blue-600" />
              AI Financial Analysis
            </h3>
            <div className="space-y-2">
              {aiAnalysis.insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
            {aiAnalysis.performanceMetrics && (
              <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Revenue Growth</p>
                  <p className="text-lg font-semibold text-green-600">
                    {aiAnalysis.performanceMetrics.revenueGrowth.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Expense Efficiency</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {aiAnalysis.performanceMetrics.expenseEfficiency.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Profit Margin</p>
                  <p className="text-lg font-semibold text-purple-600">
                    {aiAnalysis.performanceMetrics.profitMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue {aiAnalysis ? '(AI Adjusted)' : ''}</p>
                <p className="text-2xl font-bold text-green-600">{formatAmount(totals.revenue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses {aiAnalysis ? '(AI Adjusted)' : ''}</p>
                <p className="text-2xl font-bold text-red-600">{formatAmount(totals.expenses)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Other {aiAnalysis ? '(AI Adjusted)' : ''}</p>
                <p className="text-2xl font-bold text-blue-600">{formatAmount(totals.investments)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Profit {aiAnalysis ? '(AI Adjusted)' : ''}</p>
                <p className={cn("text-2xl font-bold", totals.net >= 0 ? "text-green-600" : "text-red-600")}>
                  {formatAmount(totals.net)}
                </p>
              </div>
              <div className={cn("h-8 w-8", totals.net >= 0 ? "text-green-600" : "text-red-600")}>
                {totals.net >= 0 ? <TrendingUp className="h-8 w-8" /> : <TrendingDown className="h-8 w-8" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.values(FINANCIAL_CATEGORIES).flat().map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setTypeFilter("all");
                setCategoryFilter("all");
                setSearchQuery("");
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Records List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Records ({filteredRecords?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!filteredRecords || filteredRecords.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No financial records found</p>
              <p className="text-sm text-gray-400">Add your first financial record to start tracking</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(record.type)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{record.category}</span>
                          {getTypeBadge(record.type)}
                        </div>
                        {record.description && (
                          <p className="text-sm text-gray-600 mt-1">{record.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(record.date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={cn("text-lg font-bold", 
                        record.type === 'income' ? "text-green-600" : 
                        record.type === 'expense' ? "text-red-600" : "text-blue-600"
                      )}>
                        {record.type === 'income' ? '+' : '-'}{formatAmount(record.amount)}
                      </span>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingRecord(record)}
                          className="text-primary hover:text-blue-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRecordMutation.mutate(record.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NewFinancialRecordModal
        isOpen={showNewRecordModal}
        onClose={() => setShowNewRecordModal(false)}
      />
      
      {editingRecord && (
        <EditFinancialRecordModal
          record={editingRecord}
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
        />
      )}
    </div>
  );
}