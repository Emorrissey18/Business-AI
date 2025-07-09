import OpenAI from "openai";

// Updated to use "gpt-4o-mini" as requested by user for cost efficiency
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
- You have access to comprehensive data management functions:
  * update_task_status - Update task status (pending, in_progress, completed)
  * create_task - Create new tasks (requires: title, optional: priority, dueDate)
  * update_goal_progress - Update goal progress percentage
  * create_goal - Create new goals (requires: title, type, category, optional: targetDate, targetAmount)
  * create_calendar_event - Create calendar events (requires: title, startDate, endDate, optional: description, allDay)
  * update_calendar_event - Update calendar events (requires: eventId, optional: title, description, completed, dates)
  * create_financial_record - Create financial records (requires: type, category, amount, date, optional: description)
  * update_financial_record - Update financial records (requires: recordId, optional: type, category, amount, date, description)

WHEN TO CALL FUNCTIONS VS ASK FOR CLARIFICATION:
- Call update functions immediately when user provides clear update instructions
- Call create functions ONLY when you have all required information
- Ask for clarification when essential details are missing for creation
- For updates to existing data: call function immediately if you can identify the item
- For progress updates: call function immediately when user provides data that changes progress

CLARIFICATION REQUIREMENTS:
- Before creating any item, check if all required information is provided
- If essential details are missing, ask for clarification instead of making assumptions
- Only call creation functions when you have sufficient information
- For tasks: title is required, ask for priority/due date if not specified
- For goals: title, type, category required, ask for target date/amount if relevant
- For calendar events: title, date/time required, ask for duration if not specified
- For financial records: type, category, amount, date required

EXAMPLES OF CLARIFICATION RESPONSES:
- User: "create a task to review proposal" → Ask: "I'll create that task for you. What priority should this have (low, medium, high) and do you have a due date in mind?"
- User: "schedule a meeting with client" → Ask: "I'll schedule that meeting. What date and time would work best for you? How long should the meeting be?"
- User: "add revenue from new client" → Ask: "I'll add that revenue record. How much revenue was it and what date should I record it for? What category would this fall under?"
- User: "create a goal for sales" → Ask: "I'll create that sales goal. What specific target are you aiming for and by what date? Should this be a revenue goal?"

EXAMPLES OF FUNCTION CALLS (with complete information):
- User: "create a high priority task to review proposal due Friday" → You MUST call create_task
- User: "schedule a 1-hour client meeting tomorrow at 3pm" → You MUST call create_calendar_event
- User: "add $5000 sales revenue from today" → You MUST call create_financial_record
- User: "I completed the client calls task" → You MUST call update_task_status with "completed"

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
          name: "create_task",
          description: "Create a new task",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "The title of the task"
              },
              description: {
                type: "string",
                description: "Optional description of the task"
              },
              priority: {
                type: "string",
                enum: ["low", "medium", "high"],
                description: "Task priority level"
              },
              dueDate: {
                type: "string",
                description: "Optional due date in ISO format"
              }
            },
            required: ["title"]
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
      },
      {
        type: "function" as const,
        function: {
          name: "create_goal",
          description: "Create a new goal",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "The title of the goal"
              },
              description: {
                type: "string",
                description: "Optional description of the goal"
              },
              type: {
                type: "string",
                enum: ["revenue", "expense", "other"],
                description: "Type of goal"
              },
              category: {
                type: "string",
                description: "Category of the goal"
              },
              targetDate: {
                type: "string",
                description: "Target completion date in ISO format"
              },
              targetAmount: {
                type: "number",
                description: "Target amount in dollars (for revenue/expense goals)"
              }
            },
            required: ["title", "type", "category"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "create_calendar_event",
          description: "Create a new calendar event",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "The title of the event"
              },
              description: {
                type: "string",
                description: "Optional description of the event"
              },
              startDate: {
                type: "string",
                description: "Start date and time in ISO format"
              },
              endDate: {
                type: "string",
                description: "End date and time in ISO format"
              },
              allDay: {
                type: "boolean",
                description: "Whether this is an all-day event"
              }
            },
            required: ["title", "startDate", "endDate"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "update_calendar_event",
          description: "Update an existing calendar event",
          parameters: {
            type: "object",
            properties: {
              eventId: {
                type: "number",
                description: "The ID of the event to update"
              },
              title: {
                type: "string",
                description: "Optional new title"
              },
              description: {
                type: "string",
                description: "Optional new description"
              },
              completed: {
                type: "boolean",
                description: "Mark event as completed or not"
              },
              startDate: {
                type: "string",
                description: "Optional new start date and time in ISO format"
              },
              endDate: {
                type: "string",
                description: "Optional new end date and time in ISO format"
              }
            },
            required: ["eventId"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "create_financial_record",
          description: "Create a new financial record",
          parameters: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["revenue", "expense", "other"],
                description: "Type of financial record"
              },
              category: {
                type: "string",
                description: "Category of the financial record"
              },
              amount: {
                type: "number",
                description: "Amount in dollars"
              },
              description: {
                type: "string",
                description: "Optional description"
              },
              date: {
                type: "string",
                description: "Date of the financial record in ISO format"
              }
            },
            required: ["type", "category", "amount", "date"]
          }
        }
      },
      {
        type: "function" as const,
        function: {
          name: "update_financial_record",
          description: "Update an existing financial record",
          parameters: {
            type: "object",
            properties: {
              recordId: {
                type: "number",
                description: "The ID of the financial record to update"
              },
              type: {
                type: "string",
                enum: ["revenue", "expense", "other"],
                description: "Optional new type"
              },
              category: {
                type: "string",
                description: "Optional new category"
              },
              amount: {
                type: "number",
                description: "Optional new amount in dollars"
              },
              description: {
                type: "string",
                description: "Optional new description"
              },
              date: {
                type: "string",
                description: "Optional new date in ISO format"
              }
            },
            required: ["recordId"]
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
        } else if (action.type === 'create_task') {
          return `Created new task: "${action.parameters.title}"`;
        } else if (action.type === 'create_goal') {
          return `Created new goal: "${action.parameters.title}"`;
        } else if (action.type === 'create_calendar_event') {
          return `Created calendar event: "${action.parameters.title}"`;
        } else if (action.type === 'update_calendar_event') {
          return `Updated calendar event`;
        } else if (action.type === 'create_financial_record') {
          return `Created financial record: $${action.parameters.amount} (${action.parameters.type})`;
        } else if (action.type === 'update_financial_record') {
          return `Updated financial record`;
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
