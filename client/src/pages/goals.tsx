import Navigation from "@/components/navigation";
import GoalTracker from "@/components/goal-tracker";

export default function Goals() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Navigation />
      
      <div className="space-y-6">
        <GoalTracker 
          title="All Goals" 
          showAddButton={true}
        />
      </div>
    </div>
  );
}
