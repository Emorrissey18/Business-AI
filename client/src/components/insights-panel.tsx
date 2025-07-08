import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, AlertTriangle, Target, Brain } from "lucide-react";
import { AiInsight } from "@shared/schema";
import { cn } from "@/lib/utils";

interface BusinessInsights {
  insights: string[];
  financialTrends: string[];
  goalAlignment: string[];
  recommendations: string[];
}

interface InsightsPanelProps {
  title?: string;
  limit?: number;
}

export default function InsightsPanel({ title = "Latest AI Insights", limit = 5 }: InsightsPanelProps) {
  const { data: insights, isLoading } = useQuery<AiInsight[]>({
    queryKey: ['/api/insights'],
  });

  const { data: businessInsights, isLoading: aiLoading } = useQuery<BusinessInsights>({
    queryKey: ['/api/ai/business-insights'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="h-5 w-5 text-primary" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'suggestion':
        return <Target className="h-5 w-5 text-success" />;
      default:
        return <Lightbulb className="h-5 w-5 text-gray-400" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity':
        return 'border-primary';
      case 'warning':
        return 'border-warning';
      case 'suggestion':
        return 'border-success';
      default:
        return 'border-gray-300';
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
                <div key={i} className="border-l-4 border-gray-200 pl-4 py-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayInsights = limit ? insights?.slice(0, limit) : insights;

  return (
    <div className="space-y-4">
      {/* AI Business Intelligence Section */}
      {businessInsights && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              AI Business Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              {businessInsights.insights.slice(0, 2).map((insight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <p className="text-xs">{insight}</p>
                </div>
              ))}
              {businessInsights.recommendations.length > 0 && (
                <div className="mt-3 pt-2 border-t border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">Key Recommendation:</p>
                  <p className="text-xs text-blue-600">{businessInsights.recommendations[0]}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Traditional Document Insights */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Lightbulb className="text-primary mr-2" />
            {title}
          </h2>
          
          {!insights || insights.length === 0 ? (
            <div className="text-center py-8">
              <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No insights generated yet</p>
              <p className="text-sm text-gray-400">Upload and process documents to get AI insights</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayInsights?.map((insight) => (
                <div
                  key={insight.id}
                  className={cn(
                    "insight-card border-l-4 pl-4 py-2",
                    getInsightColor(insight.type)
                  )}
                >
                  <div className="flex items-start space-x-2">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{insight.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{insight.content}</p>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <span>Confidence: {insight.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
