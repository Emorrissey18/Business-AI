import OpenAI from "openai";
import { FinancialRecord } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface FinancialAnalysis {
  adjustedRevenue: number;
  adjustedExpenses: number;
  adjustedInvestments: number;
  adjustedNet: number;
  insights: string[];
  performanceMetrics: {
    revenueGrowth: number; // percentage
    expenseEfficiency: number; // percentage
    profitMargin: number; // percentage
  };
}

export interface PerformanceIndicators {
  salesPerformance: number; // e.g., 200% = sold 200% of target
  marketGrowth: number; // percentage market expansion
  operationalEfficiency: number; // cost reduction percentage
  customerAcquisition: number; // new customers acquired
}

export async function analyzeFinancialRecords(records: FinancialRecord[]): Promise<FinancialAnalysis> {
  try {
    // Calculate base totals
    const baseRevenue = records.filter(r => r.type === 'revenue').reduce((sum, r) => sum + r.amount, 0);
    const baseExpenses = records.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
    const baseInvestments = records.filter(r => r.type === 'other').reduce((sum, r) => sum + r.amount, 0);
    
    // Prepare data for AI analysis
    const financialData = {
      records: records.map(r => ({
        type: r.type,
        category: r.category,
        amount: r.amount / 100, // Convert cents to dollars for AI
        description: r.description,
        date: r.date
      })),
      baseTotals: {
        revenue: baseRevenue / 100,
        expenses: baseExpenses / 100,
        investments: baseInvestments / 100
      }
    };

    const prompt = `
    Analyze the following financial records and provide intelligent adjustments based on performance indicators:

    Financial Data: ${JSON.stringify(financialData, null, 2)}

    Please analyze the records and look for:
    1. Performance indicators (e.g., "sold 200% of target", "exceeded expectations by 50%")
    2. Efficiency improvements (e.g., "reduced costs by 30%", "optimized operations")
    3. Market expansion (e.g., "new market entry", "customer growth")
    4. Investment returns (e.g., "ROI of 150%", "asset appreciation")

    Based on your analysis, provide adjustments to the financial totals and key insights.
    Consider descriptions that indicate over/under performance and adjust totals accordingly.

    Return your analysis in the following JSON format:
    {
      "adjustedRevenue": number,
      "adjustedExpenses": number,
      "adjustedInvestments": number,
      "adjustedNet": number,
      "insights": ["insight1", "insight2", "insight3"],
      "performanceMetrics": {
        "revenueGrowth": number,
        "expenseEfficiency": number,
        "profitMargin": number
      }
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a financial analyst AI. Analyze financial records and provide intelligent adjustments based on performance indicators found in transaction descriptions. Focus on realistic business scenarios and performance metrics."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const analysis = JSON.parse(response.choices[0].message.content || "{}");

    // Convert dollar amounts back to cents and ensure valid numbers
    return {
      adjustedRevenue: Math.round((analysis.adjustedRevenue || baseRevenue / 100) * 100),
      adjustedExpenses: Math.round((analysis.adjustedExpenses || baseExpenses / 100) * 100),
      adjustedInvestments: Math.round((analysis.adjustedInvestments || baseInvestments / 100) * 100),
      adjustedNet: Math.round((analysis.adjustedNet || (baseRevenue - baseExpenses - baseInvestments) / 100) * 100),
      insights: analysis.insights || [],
      performanceMetrics: {
        revenueGrowth: analysis.performanceMetrics?.revenueGrowth || 0,
        expenseEfficiency: analysis.performanceMetrics?.expenseEfficiency || 0,
        profitMargin: analysis.performanceMetrics?.profitMargin || 0
      }
    };

  } catch (error) {
    console.error('Error analyzing financial records:', error);
    
    // Return fallback analysis
    const baseRevenue = records.filter(r => r.type === 'revenue').reduce((sum, r) => sum + r.amount, 0);
    const baseExpenses = records.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
    const baseInvestments = records.filter(r => r.type === 'other').reduce((sum, r) => sum + r.amount, 0);
    
    return {
      adjustedRevenue: baseRevenue,
      adjustedExpenses: baseExpenses,
      adjustedInvestments: baseInvestments,
      adjustedNet: baseRevenue - baseExpenses - baseInvestments,
      insights: ["Financial analysis temporarily unavailable"],
      performanceMetrics: {
        revenueGrowth: 0,
        expenseEfficiency: 0,
        profitMargin: baseRevenue > 0 ? ((baseRevenue - baseExpenses) / baseRevenue) * 100 : 0
      }
    };
  }
}

export function extractPerformanceIndicators(description: string): PerformanceIndicators {
  const indicators: PerformanceIndicators = {
    salesPerformance: 100,
    marketGrowth: 0,
    operationalEfficiency: 0,
    customerAcquisition: 0
  };

  if (!description) return indicators;

  const text = description.toLowerCase();
  
  // Sales performance patterns
  const salesMatch = text.match(/sold (\d+)%|(\d+)% of target|exceeded by (\d+)%/);
  if (salesMatch) {
    indicators.salesPerformance = parseInt(salesMatch[1] || salesMatch[2] || salesMatch[3]) || 100;
  }
  
  // Market growth patterns
  const growthMatch = text.match(/growth of (\d+)%|expanded by (\d+)%/);
  if (growthMatch) {
    indicators.marketGrowth = parseInt(growthMatch[1] || growthMatch[2]) || 0;
  }
  
  // Efficiency patterns
  const efficiencyMatch = text.match(/reduced costs by (\d+)%|saved (\d+)%/);
  if (efficiencyMatch) {
    indicators.operationalEfficiency = parseInt(efficiencyMatch[1] || efficiencyMatch[2]) || 0;
  }
  
  return indicators;
}