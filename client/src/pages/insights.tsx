import AIInsightsDashboard from '@/components/ai-insights-dashboard';
import Navigation from '@/components/navigation';

export default function InsightsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Navigation />
      <AIInsightsDashboard />
    </div>
  );
}