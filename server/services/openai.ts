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
  }
): Promise<{ response: string; actions?: any[] }> {
  try {
    let systemMessage = `You are an AI business assistant with the ability to update tasks and goals. Help users with business analysis, planning, and decision-making. Provide clear, actionable advice based on their questions and any document context they provide.

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

AVAILABLE ACTIONS:
- You can update task statuses (pending, in_progress, completed) using the update_task_status function
- You can update goal progress percentages (0-100) using the update_goal_progress function
- Use these actions when the user asks you to make changes or when it would be helpful to do so
- Always inform the user when you've made changes to their data`;
    
    // Add context data to system message if available
    if (contextData) {
      systemMessage += "\n\nYou have access to the following business data:";
      
      if (contextData.tasks?.length) {
        systemMessage += `\n\nTasks (${contextData.tasks.length} total):\n`;
        contextData.tasks.forEach((task, index) => {
          systemMessage += `${index + 1}. ${task.title} - ${task.status} (Priority: ${task.priority})`;
          if (task.description) systemMessage += ` - ${task.description}`;
          if (task.dueDate) systemMessage += ` - Due: ${new Date(task.dueDate).toLocaleDateString()}`;
          systemMessage += "\n";
        });
      }
      
      if (contextData.goals?.length) {
        systemMessage += `\n\nGoals (${contextData.goals.length} total):\n`;
        contextData.goals.forEach((goal, index) => {
          systemMessage += `${index + 1}. ${goal.title} - ${goal.status} (Target: ${goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'Not set'})`;
          if (goal.description) systemMessage += ` - ${goal.description}`;
          systemMessage += "\n";
        });
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
      
      systemMessage += "\n\nUse this context to provide more relevant and helpful responses. Reference specific tasks, goals, documents, or calendar events when appropriate.";
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
      tools,
      tool_choice: "auto",
      max_tokens: 1000,
    });

    const choice = response.choices[0];
    const actions: any[] = [];
    
    if (choice.message.tool_calls) {
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

    return {
      response: choice.message.content || "I apologize, but I couldn't generate a response. Please try again.",
      actions
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed to generate chat response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
