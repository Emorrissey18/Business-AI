import { storage } from "../storage.js";
import { FinancialRecord, Goal } from "../../shared/schema.js";

export async function calculateRevenueProgress(goalId: number): Promise<number> {
  try {
    const goal = await storage.getGoal(goalId);
    if (!goal) return 0;

    const financialRecords = await storage.getFinancialRecords();
    const totalRevenue = financialRecords
      .filter(r => r.type === 'revenue')
      .reduce((sum, r) => sum + r.amount, 0);

    // Parse target amounts from goal descriptions
    const targetAmount = extractTargetAmount(goal.title, goal.description);
    
    if (targetAmount <= 0) return goal.progress; // Return current progress if no target found

    const progress = Math.min(100, Math.round((totalRevenue / targetAmount) * 100));
    return progress;
  } catch (error) {
    console.error('Error calculating revenue progress:', error);
    return 0;
  }
}

function extractTargetAmount(title: string, description?: string): number {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  // Look for dollar amounts in various formats
  const patterns = [
    /\$?([\d,]+),?000/g,      // $100,000 or 100,000 or 100000
    /\$?([\d,]+)/g,           // Any dollar amount
    /target.*?\$?([\d,]+)/g,  // "target $100,000"
    /revenue.*?\$?([\d,]+)/g, // "revenue $100,000"
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const numberStr = match[0].replace(/[^\d]/g, '');
      const number = parseInt(numberStr);
      
      // Convert to cents (our storage format)
      if (number >= 1000) {
        return number * 100; // Already in dollars, convert to cents
      }
    }
  }

  // Default targets based on goal type
  if (text.includes('q1') && text.includes('revenue')) {
    return 10000000; // $100,000 in cents
  }
  if (text.includes('monthly') && text.includes('revenue')) {
    return 2000000; // $20,000 in cents (monthly target)
  }

  return 0;
}

export async function updateRevenueBasedGoals(): Promise<void> {
  try {
    const goals = await storage.getGoals();
    const revenueGoals = goals.filter(g => 
      g.title.toLowerCase().includes('revenue') || 
      g.description?.toLowerCase().includes('revenue')
    );

    for (const goal of revenueGoals) {
      const newProgress = await calculateRevenueProgress(goal.id);
      if (newProgress !== goal.progress) {
        await storage.updateGoal(goal.id, { progress: newProgress });
        console.log(`Updated goal "${goal.title}" progress to ${newProgress}% based on revenue calculation`);
      }
    }
  } catch (error) {
    console.error('Error updating revenue-based goals:', error);
  }
}