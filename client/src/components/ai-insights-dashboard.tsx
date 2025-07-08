import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Brain, TrendingUp, Target, Lightbulb, AlertCircle } from 'lucide-react';

interface BusinessInsights {
  insights: string[];
  financialTrends: string[];
  goalAlignment: string[];
  recommendations: string[];
}

interface FinancialRecord {
  id: number;
  type: 'income' | 'expense' | 'investment';
  category: string;
  amount: number;
  description?: string;
  date: string;
}

interface DataCorrelation {
  financialRecordId: number;
  relatedGoals: number[];
  relatedTasks: number[];
  confidence: number;
  reasoning: string;
  suggestedActions: string[];
}

interface CorrelationAnalysis {
  correlations: DataCorrelation[];
  businessInsights: string[];
  recommendedActions: string[];
}

export default function AIInsightsDashboard() {
  const [selectedRecord, setSelectedRecord] = useState<number | null>(null);

  const { data: businessInsights, isLoading: insightsLoading } = useQuery<BusinessInsights>({
    queryKey: ['/api/ai/business-insights'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: financialRecords } = useQuery<FinancialRecord[]>({
    queryKey: ['/api/financial-records'],
  });

  const { data: correlationAnalysis } = useQuery<CorrelationAnalysis>({
    queryKey: ['/api/ai/correlations', selectedRecord],
    enabled: !!selectedRecord,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income': return 'bg-green-500';
      case 'expense': return 'bg-red-500';
      case 'investment': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (insightsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 animate-pulse" />
          <span>AI is analyzing your business data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold">AI Business Intelligence Dashboard</h2>
      </div>

      <Tabs defaultValue="insights" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights">Business Insights</TabsTrigger>
          <TabsTrigger value="correlations">Data Correlations</TabsTrigger>
          <TabsTrigger value="trends">Financial Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Key Business Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="space-y-3">
                    {businessInsights?.insights?.map((insight, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm">{insight}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Goal Alignment Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="space-y-3">
                    {businessInsights?.goalAlignment?.map((alignment, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm">{alignment}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="space-y-3">
                    {businessInsights?.recommendations?.map((recommendation, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="correlations">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Record Correlations</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Click on a financial record to see how it connects to your goals and tasks
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {financialRecords?.slice(0, 10).map((record) => (
                    <Button
                      key={record.id}
                      variant={selectedRecord === record.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedRecord(record.id)}
                      className="w-full justify-start"
                    >
                      <div className={`w-3 h-3 rounded-full ${getTypeColor(record.type)} mr-2`}></div>
                      <span className="flex-1 text-left">
                        {record.description || record.category} - {formatCurrency(record.amount)}
                      </span>
                    </Button>
                  ))}
                </div>

                {selectedRecord && correlationAnalysis && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-semibold mb-3">Correlation Analysis</h4>
                    {correlationAnalysis.correlations.map((correlation, index) => (
                      <div key={index} className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Confidence Level:</span>
                          <Badge className={getConfidenceColor(correlation.confidence)}>
                            {Math.round(correlation.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-sm">{correlation.reasoning}</p>
                        <div className="mt-2">
                          <h5 className="text-sm font-medium mb-1">Related Goals: {correlation.relatedGoals.length}</h5>
                          <h5 className="text-sm font-medium mb-1">Related Tasks: {correlation.relatedTasks.length}</h5>
                        </div>
                        {correlation.suggestedActions.length > 0 && (
                          <div className="mt-2">
                            <h5 className="text-sm font-medium mb-1">Suggested Actions:</h5>
                            <ul className="text-sm space-y-1">
                              {correlation.suggestedActions.map((action, actionIndex) => (
                                <li key={actionIndex} className="flex items-start gap-2">
                                  <span className="text-blue-500">•</span>
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Financial Trends & Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-60">
                <div className="space-y-3">
                  {businessInsights?.financialTrends?.map((trend, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-sm">{trend}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}