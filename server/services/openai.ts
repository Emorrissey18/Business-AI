import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "sk-placeholder"
});

export interface DocumentSummary {
  summary: string;
  keyPoints: string[];
  insights: BusinessInsight[];
}

export interface BusinessInsight {
  type: 'opportunity' | 'warning' | 'suggestion';
  title: string;
  content: string;
  confidence: number;
}

export async function summarizeDocument(content: string, filename: string): Promise<DocumentSummary> {
  const prompt = `
    Analyze the following business document and provide a comprehensive summary with insights.
    
    Document filename: ${filename}
    
    Please provide your analysis in JSON format with the following structure:
    {
      "summary": "A concise summary of the document (2-3 sentences)",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
      "insights": [
        {
          "type": "opportunity|warning|suggestion",
          "title": "Insight title",
          "content": "Detailed insight content",
          "confidence": 85
        }
      ]
    }
    
    Focus on business-relevant insights such as:
    - Revenue opportunities
    - Cost optimization
    - Risk factors
    - Market positioning
    - Strategic recommendations
    - Operational improvements
    
    Document content:
    ${content}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // using gpt-4o-mini as requested by user
      messages: [
        {
          role: "system",
          content: "You are a business analysis expert. Analyze documents and provide actionable business insights in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      summary: result.summary || "Unable to generate summary",
      keyPoints: result.keyPoints || [],
      insights: result.insights || []
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed to analyze document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateGoalRecommendations(goals: string[], documentContent?: string): Promise<string[]> {
  const prompt = `
    Based on the following business goals${documentContent ? ' and document content' : ''}, provide 3-5 specific, actionable recommendations.
    
    Goals: ${goals.join(', ')}
    
    ${documentContent ? `Recent document content for context:\n${documentContent.slice(0, 2000)}` : ''}
    
    Please provide your recommendations in JSON format:
    {
      "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
    }
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // using gpt-4o-mini as requested by user
      messages: [
        {
          role: "system",
          content: "You are a business strategy consultant. Provide specific, actionable recommendations based on goals and context."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.recommendations || [];
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed to generate recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateChatResponse(
  messages: Array<{role: string; content: string}>,
  contextData?: {
    tasks?: Array<any>;
    goals?: Array<any>;
    documents?: Array<any>;
    insights?: Array<any>;
    calendarEvents?: Array<any>;
    financialRecords?: Array<any>;
    businessContexts?: Array<any>;
  }
): Promise<{ response: string; actions?: any[] }> {
  try {
    let systemMessage = `You are an AI business assistant with the ability to update tasks and goals. Help users with business analysis, planning, and decision-making. Provide clear, actionable advice based on their questions and any document context they provide.

CRITICAL: When the user provides data that would change goal progress or task status, you MUST call the appropriate function to update it. Do not just calculate or mention the change - actually execute it using the available functions.

IMPORTANT: You must call the function IN THE SAME RESPONSE as your calculation. Do not say "updating now" or "executing update" - just call the function directly.

FORMATTING GUIDELINES:
- Use proper markdown formatting for better readability
- Use **bold** for important items, headings, and emphasis
- Use bullet points with proper spacing between items
- Use numbered lists for step-by-step processes
- Add line breaks between sections for better organization
- Use ### for subheadings to organize content
- When listing items, add a blank line between each item for readability
- Format dates consistently and clearly
- Use tables when comparing multiple items with similar attributes

FUNCTION CALLING REQUIREMENTS:
- You have access to update_task_status and update_goal_progress functions
- You MUST call these functions whenever the user provides information that changes task status or goal progress
- NEVER say you're updating something without calling the actual function
- NEVER say "updating now", "executing update", or "changes have been applied" without calling the function
- If you calculate a new progress percentage, immediately call update_goal_progress with that percentage
- If you determine a task status should change, immediately call update_task_status with the new status

EXAMPLES OF REQUIRED FUNCTION CALLS:
- User: "my revenue went from 1000 to 1200" → You MUST call update_goal_progress with calculated percentage
- User: "I completed the client calls task" → You MUST call update_task_status with "completed"
- User: "mark my goal as 75% complete" → You MUST call update_goal_progress with 75

PROGRESS CALCULATION RULES:
- Goal progress must be between 0 and 100 (never exceed 100%)
- If calculated progress exceeds 100%, cap it at 100%
- When goals are exceeded, show 100% completion (goal achieved)
- Always call the function immediately after calculating progress

GOAL IDENTIFICATION:
- Use the exact goal ID number from the goals list above
- Match goals by their title text to find the correct ID`;
    
    // Add context data to system message if available
    if (contextData) {
      systemMessage += "\n\nYou have access to the following business data:";
      
      if (contextData.tasks?.length) {
        systemMessage += `\n\nTasks (${contextData.tasks.length} total):\n`;
        contextData.tasks.forEach((task, index) => {
          systemMessage += `${index + 1}. ID: ${task.id} - "${task.title}" - ${task.status} (Priority: ${task.priority})`;
          if (task.description) systemMessage += ` - ${task.description}`;
          if (task.dueDate) systemMessage += ` - Due: ${new Date(task.dueDate).toLocaleDateString()}`;
          systemMessage += "\n";
        });
      }
      
      if (contextData.goals?.length) {
        systemMessage += `\n\nGoals (${contextData.goals.length} total):\n`;
        contextData.goals.forEach((goal, index) => {
          systemMessage += `${index + 1}. ID: ${goal.id} - "${goal.title}" - ${goal.status} (Progress: ${goal.progress}%, Target: ${goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'Not set'})`;
          if (goal.description) systemMessage += ` - ${goal.description}`;
          systemMessage += "\n";
        });
        
        // Check for revenue-related goals
        const revenueGoals = contextData.goals.filter(goal => 
          goal.title.toLowerCase().includes('revenue') || 
          goal.title.toLowerCase().includes('sales') ||
          goal.title.toLowerCase().includes('income') ||
          goal.title.toLowerCase().includes('400k') ||
          goal.description?.toLowerCase().includes('revenue') ||
          goal.description?.toLowerCase().includes('sales')
        );
        
        if (revenueGoals.length > 0) {
          systemMessage += `\nRevenue-Related Goals Found:\n`;
          revenueGoals.forEach((goal, index) => {
            systemMessage += `${index + 1}. "${goal.title}" - Target: ${goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'Not set'}, Progress: ${goal.progress}%\n`;
            if (goal.description) systemMessage += `   Description: ${goal.description}\n`;
          });
        }
      }
      
      if (contextData.documents?.length) {
        systemMessage += `\n\nRecent Documents (${contextData.documents.length} total):\n`;
        contextData.documents.forEach((doc, index) => {
          systemMessage += `${index + 1}. ${doc.filename} - ${doc.status} (${new Date(doc.createdAt).toLocaleDateString()})`;
          if (doc.summary) systemMessage += ` - ${doc.summary.substring(0, 100)}...`;
          systemMessage += "\n";
        });
      }
      
      if (contextData.insights?.length) {
        systemMessage += `\n\nAI Insights (${contextData.insights.length} total):\n`;
        contextData.insights.forEach((insight, index) => {
          systemMessage += `${index + 1}. ${insight.type}: ${insight.title} - ${insight.content.substring(0, 100)}...`;
          systemMessage += "\n";
        });
      }
      
      if (contextData.calendarEvents?.length) {
        systemMessage += `\n\nCalendar Events (${contextData.calendarEvents.length} total):\n`;
        contextData.calendarEvents.forEach((event, index) => {
          systemMessage += `${index + 1}. ${event.title} - ${new Date(event.startDate).toLocaleDateString()} to ${new Date(event.endDate).toLocaleDateString()}`;
          if (event.description) systemMessage += ` - ${event.description}`;
          systemMessage += "\n";
        });
      }
      
      if (contextData.financialRecords?.length) {
        systemMessage += `\n\nFinancial Records (${contextData.financialRecords.length} total):\n`;
        
        // Calculate totals for context
        const revenueRecords = contextData.financialRecords.filter(record => record.type === 'revenue');
        const expenseRecords = contextData.financialRecords.filter(record => record.type === 'expense');
        const otherRecords = contextData.financialRecords.filter(record => record.type === 'other');
        
        // Financial amounts are stored in cents in the database, convert to dollars
        const totalRevenue = revenueRecords.reduce((sum, record) => sum + (record.amount / 100), 0);
        const totalExpenses = expenseRecords.reduce((sum, record) => sum + (record.amount / 100), 0);
        const totalOther = otherRecords.reduce((sum, record) => sum + (record.amount / 100), 0);
        const netProfit = totalRevenue - totalExpenses;
        
        systemMessage += `\nFinancial Summary:\n`;
        systemMessage += `- Total Revenue: $${totalRevenue.toLocaleString()}\n`;
        systemMessage += `- Total Expenses: $${totalExpenses.toLocaleString()}\n`;
        systemMessage += `- Other (Investments/Funding): $${totalOther.toLocaleString()}\n`;
        systemMessage += `- Net Profit: $${netProfit.toLocaleString()}\n`;
        
        systemMessage += `\nRecent Financial Records:\n`;
        contextData.financialRecords
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10)
          .forEach((record, index) => {
            // Convert cents to dollars for display
            const amountInDollars = record.amount / 100;
            systemMessage += `${index + 1}. ${record.type.toUpperCase()} - ${record.category} - $${amountInDollars.toLocaleString()} (${new Date(record.date).toLocaleDateString()})`;
            if (record.description) systemMessage += ` - ${record.description}`;
            systemMessage += "\n";
          });
      }
      
      systemMessage += "\n\nIMPORTANT: You have access to complete financial records data and goals above. When users ask about revenue, growth rates, or financial performance:\n";
      systemMessage += "1. Use the financial data provided above for current revenue totals\n";
      systemMessage += "2. Reference revenue-related goals for target amounts and dates\n";
      systemMessage += "3. Calculate growth rates using both current financial data and goal targets\n";
      systemMessage += "4. For monthly growth calculations, break down quarterly goals into monthly targets\n";
      systemMessage += "5. Never ask for information that is already available in the context data\n";
      systemMessage += "6. ABSOLUTELY NO LaTeX or mathematical markup (no \\[, \\], \\(, \\), \\text{}, \\left, \\right, \\frac, etc.)\n";
      systemMessage += "7. Use ONLY plain text for calculations - Example: 'Required Growth = $400,000 - $700 = $399,300'\n";
      systemMessage += "8. For percentages use: 'Growth Rate = (399,300 ÷ 700) × 100 = 57,043%'\n";
      systemMessage += "9. Use bullet points, simple formatting, and readable math expressions\n";
      systemMessage += "Always cross-reference goals with financial data to provide complete answers.";
    }

    if (contextData?.businessContexts?.length) {
      systemMessage += `\n\nBusiness Context (Critical Business Information):\n`;
      systemMessage += `IMPORTANT: Use this business context to make informed recommendations and decisions. This is long-term business information that should always be considered.\n\n`;
      
      const contextBySection: Record<string, any[]> = {};
      contextData.businessContexts.forEach(context => {
        if (!contextBySection[context.section]) {
          contextBySection[context.section] = [];
        }
        contextBySection[context.section].push(context);
      });

      Object.entries(contextBySection).forEach(([section, contexts]) => {
        const sectionTitle = section.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        systemMessage += `**${sectionTitle}:**\n`;
        contexts.forEach((context, index) => {
          systemMessage += `${index + 1}. ${context.title} (${context.priority} priority)\n   ${context.content}\n`;
        });
        systemMessage += `\n`;
      });
      
      systemMessage += `\nWhen providing business advice, recommendations, or making decisions, ALWAYS consider this business context. Reference relevant context items in your responses and tailor your advice to the specific business situation.\n`;
    }
    
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "update_task_status",
          description: "Update the status of a specific task",
          parameters: {
            type: "object",
            properties: {
              taskId: {
                type: "number",
                description: "The ID of the task to update"
              },
              status: {
                type: "string",
                enum: ["pending", "in_progress", "completed"],
                description: "The new status for the task"
              }
            },
            required: ["taskId", "status"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "update_goal_progress",
          description: "Update the progress percentage of a specific goal",
          parameters: {
            type: "object",
            properties: {
              goalId: {
                type: "number",
                description: "The ID of the goal to update"
              },
              progress: {
                type: "number",
                minimum: 0,
                maximum: 100,
                description: "The new progress percentage (0-100)"
              }
            },
            required: ["goalId", "progress"]
          }
        }
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        ...messages.map(msg => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content
        }))
      ],
      max_tokens: 1000,
      tools: tools,
      tool_choice: "auto"
    });

    console.log('OpenAI API Response:', JSON.stringify(response, null, 2));

    const choice = response.choices[0];
    const actions: any[] = [];
    
    if (choice.message.tool_calls) {
      console.log('Tool calls detected:', choice.message.tool_calls);
      for (const toolCall of choice.message.tool_calls) {
        if (toolCall.type === "function") {
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          actions.push({
            type: toolCall.function.name,
            parameters: functionArgs
          });
        }
      }
    }

    let responseText = choice.message.content || "";
    
    // If there were tool calls but no text response, generate a helpful message
    if (actions.length > 0 && !responseText.trim()) {
      const actionDescriptions = actions.map(action => {
        if (action.type === 'update_goal_progress') {
          return `Updated goal progress to ${action.parameters.progress}%`;
        } else if (action.type === 'update_task_status') {
          return `Updated task status to ${action.parameters.status}`;
        }
        return 'Completed action';
      });
      
      responseText = `I've successfully completed the following actions:\n\n${actionDescriptions.map(desc => `✓ ${desc}`).join('\n')}\n\nThe changes have been applied to your data. Is there anything else you'd like me to help you with?`;
    } else if (!responseText.trim()) {
      responseText = "I apologize, but I couldn't generate a response. Please try again.";
    }
    
    console.log('AI Response:', responseText);

    return {
      response: responseText,
      actions
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed to generate chat response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
