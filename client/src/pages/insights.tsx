import AIInsightsDashboard from '@/components/ai-insights-dashboard';
import Navigation from '@/components/navigation';

export default function InsightsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Navigation />
      <AIInsightsDashboard />
    </div>
  );
}