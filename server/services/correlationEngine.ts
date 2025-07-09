import OpenAI from "openai";
import { storage } from "../storage.js";
import { FinancialRecord, Goal, Task } from "../../shared/schema.js";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DataCorrelation {
  financialRecordId: number;
  relatedGoals: number[];
  relatedTasks: number[];
  confidence: number;
  reasoning: string;
  suggestedActions: string[];
}

export interface CorrelationAnalysis {
  correlations: DataCorrelation[];
  businessInsights: string[];
  recommendedActions: string[];
  progressUpdates: {
    goalId: number;
    newProgress: number;
    reason: string;
  }[];
  taskUpdates: {
    taskId: number;
    newStatus: 'pending' | 'in_progress' | 'completed';
    reason: string;
  }[];
}

export async function analyzeDataCorrelations(
  financialRecord: FinancialRecord,
  allGoals: Goal[],
  allTasks: Task[],
  existingFinancialRecords: FinancialRecord[]
): Promise<CorrelationAnalysis> {
  try {
    const prompt = `
You are an AI business intelligence agent that analyzes financial data to correlate it with business goals and tasks. 

FINANCIAL RECORD TO ANALYZE:
- ID: ${financialRecord.id}
- Type: ${financialRecord.type}
- Category: ${financialRecord.category}
- Amount: $${(financialRecord.amount / 100).toFixed(2)}
- Description: ${financialRecord.description || 'No description'}
- Date: ${financialRecord.date}

EXISTING GOALS:
${allGoals.map(g => `- ID: ${g.id}, Title: "${g.title}", Type: ${g.type}, Category: ${g.category}, Progress: ${g.progress}%, Target Amount: ${g.targetAmount ? '$' + (g.targetAmount / 100).toFixed(2) : 'Not set'}, Target Date: ${g.targetDate}, Status: ${g.status}, Description: ${g.description || 'No description'}`).join('\n')}

TOTAL REVENUE ANALYSIS:
- Total Revenue: $${(existingFinancialRecords.filter(r => r.type === 'revenue').reduce((sum, r) => sum + r.amount, 0) / 100).toFixed(2)}
- Total Expenses: $${(existingFinancialRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0) / 100).toFixed(2)}
- Net Revenue: $${((existingFinancialRecords.filter(r => r.type === 'revenue').reduce((sum, r) => sum + r.amount, 0) - existingFinancialRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0)) / 100).toFixed(2)}

EXISTING TASKS:
${allTasks.map(t => `- ID: ${t.id}, Title: "${t.title}", Status: ${t.status}, Priority: ${t.priority}, Due: ${t.dueDate || 'No due date'}`).join('\n')}

RECENT FINANCIAL CONTEXT:
${existingFinancialRecords.slice(-5).map(r => `- ${r.type}: ${r.category} $${(r.amount / 100).toFixed(2)} - ${r.description || 'No description'}`).join('\n')}

ANALYSIS REQUIREMENTS:
1. Identify which goals and tasks are directly related to this financial record
2. For revenue-related goals, calculate accurate progress based on actual revenue targets:
   - If goal has targetAmount field set, calculate progress = (current_total_revenue / targetAmount) * 100
   - For goals like "Reach $100,000 revenue", extract target from title/description if targetAmount not set
   - Only update progress if you can determine a clear target amount
3. Only suggest progress updates that are mathematically accurate based on financial data
4. Suggest task status changes based on financial evidence
5. Provide business insights about spending patterns and goal alignment
6. Be conservative with progress updates - only update if there's clear evidence

IMPORTANT: When updating goal progress, calculate it based on actual revenue targets, not arbitrary percentages. For example:
- If goal is "Target $100,000 in Q1 revenue" and current total income is $27,000, progress should be 27%
- If goal is "Increase Monthly Revenue by 20%" analyze monthly revenue patterns to calculate accurate progress

Respond with a JSON object in this exact format:
{
  "correlations": [
    {
      "financialRecordId": ${financialRecord.id},
      "relatedGoals": [goal_id_array],
      "relatedTasks": [task_id_array],
      "confidence": 0.0-1.0,
      "reasoning": "explanation of why these are related",
      "suggestedActions": ["action1", "action2"]
    }
  ],
  "businessInsights": ["insight1", "insight2"],
  "recommendedActions": ["action1", "action2"],
  "progressUpdates": [
    {
      "goalId": goal_id,
      "newProgress": percentage,
      "reason": "explanation"
    }
  ],
  "taskUpdates": [
    {
      "taskId": task_id,
      "newStatus": "completed|in_progress|pending",
      "reason": "explanation"
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert business intelligence AI that analyzes financial data to find correlations with business goals and tasks. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const analysis: CorrelationAnalysis = JSON.parse(response.choices[0].message.content!);
    return analysis;
  } catch (error) {
    console.error('Error analyzing data correlations:', error);
    return {
      correlations: [],
      businessInsights: [],
      recommendedActions: [],
      progressUpdates: [],
      taskUpdates: []
    };
  }
}

export async function executeCorrelationActions(analysis: CorrelationAnalysis): Promise<void> {
  try {
    // Execute goal progress updates
    for (const update of analysis.progressUpdates) {
      // Cap progress at 100% and ensure it's a valid integer
      const cappedProgress = Math.floor(Math.min(100, Math.max(0, update.newProgress)));
      await storage.updateGoal(update.goalId, { progress: cappedProgress });
      console.log(`Updated goal ${update.goalId} progress to ${cappedProgress}%: ${update.reason}`);
    }

    // Execute task status updates
    for (const update of analysis.taskUpdates) {
      await storage.updateTask(update.taskId, { status: update.newStatus });
      console.log(`Updated task ${update.taskId} status to ${update.newStatus}: ${update.reason}`);
    }
  } catch (error) {
    console.error('Error executing correlation actions:', error);
  }
}

export async function generateBusinessInsights(): Promise<{
  insights: string[];
  financialTrends: string[];
  goalAlignment: string[];
  recommendations: string[];
}> {
  try {
    const [goals, tasks, financialRecords] = await Promise.all([
      storage.getGoals(),
      storage.getTasks(),
      storage.getFinancialRecords()
    ]);

    const totalRevenue = financialRecords
      .filter(r => r.type === 'revenue')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalExpenses = financialRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalOther = financialRecords
      .filter(r => r.type === 'other')
      .reduce((sum, r) => sum + r.amount, 0);

    const prompt = `
Analyze this business data to provide comprehensive insights:

FINANCIAL SUMMARY:
- Total Revenue: $${(totalRevenue / 100).toFixed(2)}
- Total Expenses: $${(totalExpenses / 100).toFixed(2)}
- Total Other: $${(totalOther / 100).toFixed(2)}
- Net Profit: $${((totalRevenue - totalExpenses) / 100).toFixed(2)}

GOALS STATUS:
${goals.map(g => `- "${g.title}": ${g.progress}% complete, Status: ${g.status}, Target: ${g.targetDate}`).join('\n')}

TASKS STATUS:
${tasks.map(t => `- "${t.title}": ${t.status}, Priority: ${t.priority}`).join('\n')}

RECENT FINANCIAL RECORDS:
${financialRecords.slice(-10).map(r => `- ${r.type}: ${r.category} $${(r.amount / 100).toFixed(2)} - ${r.description || 'No description'}`).join('\n')}

Provide analysis in JSON format:
{
  "insights": ["business insight 1", "business insight 2"],
  "financialTrends": ["trend 1", "trend 2"],
  "goalAlignment": ["alignment insight 1", "alignment insight 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a business intelligence expert analyzing financial data, goals, and tasks to provide actionable insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content!);
  } catch (error) {
    console.error('Error generating business insights:', error);
    return {
      insights: [],
      financialTrends: [],
      goalAlignment: [],
      recommendations: []
    };
  }
}