import OpenAI from "openai";
import { storage } from "../storage";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "sk-placeholder"
});

export interface RelevantContext {
  topic: string;
  relevantData: {
    tasks: Array<any>;
    goals: Array<any>;
    financialRecords: Array<any>;
    documents: Array<any>;
    insights: Array<any>;
    calendarEvents: Array<any>;
    conversationMessages: Array<any>;
  };
  fallbackData: {
    tasks: Array<any>;
    goals: Array<any>;
    financialRecords: Array<any>;
    documents: Array<any>;
    insights: Array<any>;
    calendarEvents: Array<any>;
    conversationMessages: Array<any>;
  };
}

export async function extractTopic(userMessage: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Extract the main topic or keyword from the user message. Return only a single word or short phrase that captures the core subject. Examples: 'revenue', 'tasks', 'goals', 'team', 'growth', 'expenses', 'calendar', 'documents'."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 20,
      temperature: 0.1
    });

    const topic = response.choices[0].message.content?.trim().toLowerCase() || "general";
    return topic;
  } catch (error) {
    console.error('Error extracting topic:', error);
    return "general";
  }
}

function containsTopic(text: string, topic: string): boolean {
  if (!text || !topic) return false;
  const lowerText = text.toLowerCase();
  const lowerTopic = topic.toLowerCase();
  return lowerText.includes(lowerTopic);
}

export async function buildRelevantContext(userMessage: string, conversationId: number): Promise<RelevantContext> {
  const topic = await extractTopic(userMessage);
  
  // Get all data from database
  const [allTasks, allGoals, allFinancialRecords, allDocuments, allInsights, allCalendarEvents, allMessages] = await Promise.all([
    storage.getTasks(),
    storage.getGoals(),
    storage.getFinancialRecords(),
    storage.getDocuments(),
    storage.getAiInsights(),
    storage.getCalendarEvents(),
    storage.getMessagesByConversation(conversationId)
  ]);

  // Filter relevant data based on topic
  const relevantTasks = allTasks.filter(task => 
    containsTopic(task.title, topic) || 
    containsTopic(task.description, topic)
  );

  const relevantGoals = allGoals.filter(goal => 
    containsTopic(goal.title, topic) || 
    containsTopic(goal.description, topic)
  );

  const relevantFinancialRecords = allFinancialRecords.filter(record => 
    containsTopic(record.category, topic) || 
    containsTopic(record.description, topic)
  );

  const relevantDocuments = allDocuments.filter(doc => 
    containsTopic(doc.filename, topic) || 
    containsTopic(doc.summary, topic)
  );

  const relevantInsights = allInsights.filter(insight => 
    containsTopic(insight.title, topic) || 
    containsTopic(insight.content, topic)
  );

  const relevantCalendarEvents = allCalendarEvents.filter(event => 
    containsTopic(event.title, topic) || 
    containsTopic(event.description, topic)
  );

  const relevantMessages = allMessages.filter(msg => 
    containsTopic(msg.content, topic)
  );

  // Build fallback data (top 5 most relevant/recent)
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const fallbackTasks = allTasks
    .filter(task => !relevantTasks.some(rt => rt.id === task.id))
    .sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, 5);

  const fallbackGoals = allGoals
    .filter(goal => !relevantGoals.some(rg => rg.id === goal.id))
    .filter(goal => goal.status === 'active')
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);

  const fallbackFinancialRecords = allFinancialRecords
    .filter(record => !relevantFinancialRecords.some(rf => rf.id === record.id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const fallbackDocuments = allDocuments
    .filter(doc => !relevantDocuments.some(rd => rd.id === doc.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const fallbackInsights = allInsights
    .filter(insight => !relevantInsights.some(ri => ri.id === insight.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const fallbackCalendarEvents = allCalendarEvents
    .filter(event => !relevantCalendarEvents.some(re => re.id === event.id))
    .filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate >= today && eventDate <= nextWeek;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  const fallbackMessages = allMessages
    .filter(msg => !relevantMessages.some(rm => rm.id === msg.id))
    .slice(-5); // Last 5 messages

  return {
    topic,
    relevantData: {
      tasks: relevantTasks,
      goals: relevantGoals,
      financialRecords: relevantFinancialRecords,
      documents: relevantDocuments,
      insights: relevantInsights,
      calendarEvents: relevantCalendarEvents,
      conversationMessages: relevantMessages
    },
    fallbackData: {
      tasks: fallbackTasks,
      goals: fallbackGoals,
      financialRecords: fallbackFinancialRecords,
      documents: fallbackDocuments,
      insights: fallbackInsights,
      calendarEvents: fallbackCalendarEvents,
      conversationMessages: fallbackMessages
    }
  };
}

export function buildContextualSystemMessage(context: RelevantContext): string {
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

  // Add context summary
  const relevantCount = Object.values(context.relevantData).reduce((sum, arr) => sum + arr.length, 0);
  const fallbackCount = Object.values(context.fallbackData).reduce((sum, arr) => sum + arr.length, 0);
  
  systemMessage += `\n\n## CONTEXT SUMMARY
Topic detected: "${context.topic}"
Relevant data items found: ${relevantCount}
Fallback data items included: ${fallbackCount}

You have access to the following business data organized by relevance:`;

  // Add relevant data sections
  systemMessage += `\n\n## RELEVANT DATA (Topic: ${context.topic})`;
  
  if (context.relevantData.tasks.length > 0) {
    systemMessage += `\n\n### Relevant Tasks (${context.relevantData.tasks.length}):\n`;
    context.relevantData.tasks.forEach((task, index) => {
      systemMessage += `${index + 1}. ID: ${task.id} - "${task.title}" - ${task.status} (Priority: ${task.priority})`;
      if (task.description) systemMessage += ` - ${task.description}`;
      if (task.dueDate) systemMessage += ` - Due: ${new Date(task.dueDate).toLocaleDateString()}`;
      systemMessage += "\n";
    });
  }

  if (context.relevantData.goals.length > 0) {
    systemMessage += `\n\n### Relevant Goals (${context.relevantData.goals.length}):\n`;
    context.relevantData.goals.forEach((goal, index) => {
      systemMessage += `${index + 1}. ID: ${goal.id} - "${goal.title}" - ${goal.status} (Progress: ${goal.progress}%, Target: ${goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'Not set'})`;
      if (goal.description) systemMessage += ` - ${goal.description}`;
      systemMessage += "\n";
    });
  }

  if (context.relevantData.financialRecords.length > 0) {
    systemMessage += `\n\n### Relevant Financial Records (${context.relevantData.financialRecords.length}):\n`;
    context.relevantData.financialRecords.forEach((record, index) => {
      systemMessage += `${index + 1}. ${record.type} - ${record.category} - $${record.amount} (${new Date(record.date).toLocaleDateString()})`;
      if (record.description) systemMessage += ` - ${record.description}`;
      systemMessage += "\n";
    });
  }

  if (context.relevantData.documents.length > 0) {
    systemMessage += `\n\n### Relevant Documents (${context.relevantData.documents.length}):\n`;
    context.relevantData.documents.forEach((doc, index) => {
      systemMessage += `${index + 1}. ${doc.filename} - ${doc.status} (${new Date(doc.createdAt).toLocaleDateString()})`;
      if (doc.summary) systemMessage += ` - ${doc.summary.substring(0, 100)}...`;
      systemMessage += "\n";
    });
  }

  if (context.relevantData.insights.length > 0) {
    systemMessage += `\n\n### Relevant AI Insights (${context.relevantData.insights.length}):\n`;
    context.relevantData.insights.forEach((insight, index) => {
      systemMessage += `${index + 1}. ${insight.type}: ${insight.title} - ${insight.content.substring(0, 100)}...`;
      systemMessage += "\n";
    });
  }

  if (context.relevantData.calendarEvents.length > 0) {
    systemMessage += `\n\n### Relevant Calendar Events (${context.relevantData.calendarEvents.length}):\n`;
    context.relevantData.calendarEvents.forEach((event, index) => {
      systemMessage += `${index + 1}. ${event.title} - ${new Date(event.startDate).toLocaleDateString()} to ${new Date(event.endDate).toLocaleDateString()}`;
      if (event.description) systemMessage += ` - ${event.description}`;
      systemMessage += "\n";
    });
  }

  // Add fallback data sections
  systemMessage += `\n\n## FALLBACK DATA (Additional Context)`;

  if (context.fallbackData.tasks.length > 0) {
    systemMessage += `\n\n### Top Priority Tasks (${context.fallbackData.tasks.length}):\n`;
    context.fallbackData.tasks.forEach((task, index) => {
      systemMessage += `${index + 1}. ID: ${task.id} - "${task.title}" - ${task.status} (Priority: ${task.priority})`;
      if (task.description) systemMessage += ` - ${task.description}`;
      if (task.dueDate) systemMessage += ` - Due: ${new Date(task.dueDate).toLocaleDateString()}`;
      systemMessage += "\n";
    });
  }

  if (context.fallbackData.goals.length > 0) {
    systemMessage += `\n\n### Active Goals (${context.fallbackData.goals.length}):\n`;
    context.fallbackData.goals.forEach((goal, index) => {
      systemMessage += `${index + 1}. ID: ${goal.id} - "${goal.title}" - ${goal.status} (Progress: ${goal.progress}%, Target: ${goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'Not set'})`;
      if (goal.description) systemMessage += ` - ${goal.description}`;
      systemMessage += "\n";
    });
  }

  if (context.fallbackData.financialRecords.length > 0) {
    systemMessage += `\n\n### Recent Financial Records (${context.fallbackData.financialRecords.length}):\n`;
    context.fallbackData.financialRecords.forEach((record, index) => {
      systemMessage += `${index + 1}. ${record.type} - ${record.category} - $${record.amount} (${new Date(record.date).toLocaleDateString()})`;
      if (record.description) systemMessage += ` - ${record.description}`;
      systemMessage += "\n";
    });
  }

  if (context.fallbackData.documents.length > 0) {
    systemMessage += `\n\n### Recent Documents (${context.fallbackData.documents.length}):\n`;
    context.fallbackData.documents.forEach((doc, index) => {
      systemMessage += `${index + 1}. ${doc.filename} - ${doc.status} (${new Date(doc.createdAt).toLocaleDateString()})`;
      if (doc.summary) systemMessage += ` - ${doc.summary.substring(0, 100)}...`;
      systemMessage += "\n";
    });
  }

  if (context.fallbackData.insights.length > 0) {
    systemMessage += `\n\n### Recent AI Insights (${context.fallbackData.insights.length}):\n`;
    context.fallbackData.insights.forEach((insight, index) => {
      systemMessage += `${index + 1}. ${insight.type}: ${insight.title} - ${insight.content.substring(0, 100)}...`;
      systemMessage += "\n";
    });
  }

  if (context.fallbackData.calendarEvents.length > 0) {
    systemMessage += `\n\n### Upcoming Calendar Events (${context.fallbackData.calendarEvents.length}):\n`;
    context.fallbackData.calendarEvents.forEach((event, index) => {
      systemMessage += `${index + 1}. ${event.title} - ${new Date(event.startDate).toLocaleDateString()} to ${new Date(event.endDate).toLocaleDateString()}`;
      if (event.description) systemMessage += ` - ${event.description}`;
      systemMessage += "\n";
    });
  }

  systemMessage += "\n\nUse this context to provide more relevant and helpful responses. Reference specific tasks, goals, documents, or calendar events when appropriate.";

  return systemMessage;
}