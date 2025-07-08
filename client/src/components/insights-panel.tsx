import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { AiInsight } from "@shared/schema";
import { cn } from "@/lib/utils";

interface InsightsPanelProps {
  title?: string;
  limit?: number;
}

export default function InsightsPanel({ title = "Latest AI Insights", limit = 5 }: InsightsPanelProps) {
  const { data: insights, isLoading } = useQuery<AiInsight[]>({
    queryKey: ['/api/insights'],
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
  );
}
