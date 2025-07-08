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
  systemMessage: string
): Promise<{ response: string; actions?: any[] }> {
  try {
    
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
