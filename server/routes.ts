import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDocumentSchema, insertGoalSchema, insertAiInsightSchema, insertConversationSchema, insertMessageSchema, insertTaskSchema, insertCalendarEventSchema, insertFinancialRecordSchema } from "@shared/schema";
import { upload, extractTextFromFile, cleanupFile } from "./services/fileProcessor";
import { summarizeDocument, generateChatResponse } from "./services/openai";
import { z } from "zod";
import path from "path";

const updateGoalSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  status: z.enum(['active', 'completed', 'paused']).optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Documents routes
  app.get('/api/documents', async (req: Request, res: Response) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  app.get('/api/documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      res.json(document);
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ message: 'Failed to fetch document' });
    }
  });

  app.post('/api/documents/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const document = await storage.createDocument({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        content: null,
        summary: null,
        status: 'pending'
      });

      res.json(document);

      // Process the document asynchronously
      processDocumentAsync(document.id, req.file.path, req.file.mimetype);
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ message: 'Failed to upload document' });
    }
  });

  app.delete('/api/documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDocument(id);
      if (!success) {
        return res.status(404).json({ message: 'Document not found' });
      }
      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: 'Failed to delete document' });
    }
  });

  // Goals routes
  app.get('/api/goals', async (req: Request, res: Response) => {
    try {
      const goals = await storage.getGoals();
      res.json(goals);
    } catch (error) {
      console.error('Error fetching goals:', error);
      res.status(500).json({ message: 'Failed to fetch goals' });
    }
  });

  app.post('/api/goals', async (req: Request, res: Response) => {
    try {
      const validatedData = insertGoalSchema.parse(req.body);
      // Convert targetDate string to Date object if provided
      const goalData = {
        ...validatedData,
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : null
      };
      const goal = await storage.createGoal(goalData);
      res.json(goal);
    } catch (error) {
      console.error('Error creating goal:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid goal data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create goal' });
      }
    }
  });

  app.patch('/api/goals/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateGoalSchema.parse(req.body);
      
      // Convert string targetDate to Date if provided
      const updateData = {
        ...validatedData,
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : undefined
      };
      
      const updatedGoal = await storage.updateGoal(id, updateData);
      if (!updatedGoal) {
        return res.status(404).json({ message: 'Goal not found' });
      }
      
      res.json(updatedGoal);
    } catch (error) {
      console.error('Error updating goal:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid goal data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to update goal' });
      }
    }
  });

  app.delete('/api/goals/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteGoal(id);
      if (!success) {
        return res.status(404).json({ message: 'Goal not found' });
      }
      res.json({ message: 'Goal deleted successfully' });
    } catch (error) {
      console.error('Error deleting goal:', error);
      res.status(500).json({ message: 'Failed to delete goal' });
    }
  });

  // AI Insights routes
  app.get('/api/insights', async (req: Request, res: Response) => {
    try {
      const insights = await storage.getAiInsights();
      res.json(insights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      res.status(500).json({ message: 'Failed to fetch insights' });
    }
  });

  app.get('/api/insights/document/:documentId', async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const insights = await storage.getAiInsightsByDocument(documentId);
      res.json(insights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      res.status(500).json({ message: 'Failed to fetch insights' });
    }
  });

  // Stats route
  app.get('/api/stats', async (req: Request, res: Response) => {
    try {
      const documents = await storage.getDocuments();
      const goals = await storage.getGoals();
      const insights = await storage.getAiInsights();

      const stats = {
        documentsProcessed: documents.filter(doc => doc.status === 'completed').length,
        activeGoals: goals.filter(goal => goal.status === 'active').length,
        insightsGenerated: insights.length,
        totalDocuments: documents.length,
        completedGoals: goals.filter(goal => goal.status === 'completed').length,
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Conversations routes
  app.get('/api/conversations', async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getConversations();
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.post('/api/conversations', async (req: Request, res: Response) => {
    try {
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid conversation data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create conversation' });
      }
    }
  });

  // Messages routes
  app.get('/api/messages/:conversationId', async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/messages', async (req: Request, res: Response) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      const userMessage = await storage.createMessage(validatedData);
      
      // If it's a user message, generate an AI response
      if (validatedData.role === 'user' && validatedData.conversationId) {
        // Get conversation history
        const conversationMessages = await storage.getMessagesByConversation(validatedData.conversationId);
        
        // Convert to format expected by OpenAI
        const chatHistory = conversationMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        try {
          // Fetch context data for AI
          const [tasks, goals, documents, insights, calendarEvents] = await Promise.all([
            storage.getTasks(),
            storage.getGoals(),
            storage.getDocuments(),
            storage.getAiInsights(),
            storage.getCalendarEvents()
          ]);
          
          const contextData = {
            tasks,
            goals,
            documents,
            insights,
            calendarEvents
          };
          
          // Generate AI response with context
          const aiResult = await generateChatResponse(chatHistory, contextData);
          
          // Execute any actions the AI requested
          if (aiResult.actions && aiResult.actions.length > 0) {
            for (const action of aiResult.actions) {
              try {
                if (action.type === 'update_task_status') {
                  await storage.updateTask(action.parameters.taskId, { status: action.parameters.status });
                } else if (action.type === 'update_goal_progress') {
                  await storage.updateGoal(action.parameters.goalId, { progress: action.parameters.progress });
                }
              } catch (actionError) {
                console.error('Error executing AI action:', actionError);
              }
            }
          }
          
          // Save AI response
          const aiMessage = await storage.createMessage({
            conversationId: validatedData.conversationId,
            role: 'assistant',
            content: aiResult.response
          });
          
          // Update conversation title if this is the first message
          if (conversationMessages.length === 0) {
            const conversation = await storage.getConversation(validatedData.conversationId);
            if (conversation && conversation.title === 'New Conversation') {
              // Generate a title from the first message
              const title = validatedData.content.length > 50 
                ? validatedData.content.substring(0, 50) + '...'
                : validatedData.content;
              await storage.updateConversation(validatedData.conversationId, { title });
            }
          }
          
          res.json({ userMessage, aiMessage });
        } catch (aiError) {
          console.error('Error generating AI response:', aiError);
          res.json({ userMessage, aiMessage: null, error: 'Failed to generate AI response' });
        }
      } else {
        res.json({ userMessage });
      }
    } catch (error) {
      console.error('Error creating message:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid message data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create message' });
      }
    }
  });

  // Tasks routes
  app.get('/api/tasks', async (req: Request, res: Response) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks' });
    }
  });

  app.post('/api/tasks', async (req: Request, res: Response) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      // Convert dueDate string to Date object if provided
      const taskData = {
        ...validatedData,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null
      };
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid task data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create task' });
      }
    }
  });

  app.patch('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const task = await storage.updateTask(id, updates);
      if (!task) {
        res.status(404).json({ message: 'Task not found' });
      } else {
        res.json(task);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ message: 'Failed to update task' });
    }
  });

  app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteTask(id);
      if (!success) {
        res.status(404).json({ message: 'Task not found' });
      } else {
        res.status(204).send();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ message: 'Failed to delete task' });
    }
  });

  // Calendar Events routes
  app.get('/api/calendar-events', async (req: Request, res: Response) => {
    try {
      const events = await storage.getCalendarEvents();
      res.json(events);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({ message: 'Failed to fetch calendar events' });
    }
  });

  app.post('/api/calendar-events', async (req: Request, res: Response) => {
    try {
      const validatedData = insertCalendarEventSchema.parse(req.body);
      const event = await storage.createCalendarEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid input', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create calendar event' });
      }
    }
  });

  app.patch('/api/calendar-events/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.updateCalendarEvent(id, req.body);
      if (!event) {
        res.status(404).json({ message: 'Calendar event not found' });
      } else {
        res.json(event);
      }
    } catch (error) {
      console.error('Error updating calendar event:', error);
      res.status(500).json({ message: 'Failed to update calendar event' });
    }
  });

  app.delete('/api/calendar-events/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCalendarEvent(id);
      if (!success) {
        res.status(404).json({ message: 'Calendar event not found' });
      } else {
        res.status(204).send();
      }
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      res.status(500).json({ message: 'Failed to delete calendar event' });
    }
  });

  // Financial Records routes
  app.get('/api/financial-records', async (req: Request, res: Response) => {
    try {
      const records = await storage.getFinancialRecords();
      res.json(records);
    } catch (error) {
      console.error('Error fetching financial records:', error);
      res.status(500).json({ message: 'Failed to fetch financial records' });
    }
  });

  app.get('/api/financial-records/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const record = await storage.getFinancialRecord(id);
      if (!record) {
        res.status(404).json({ message: 'Financial record not found' });
      } else {
        res.json(record);
      }
    } catch (error) {
      console.error('Error fetching financial record:', error);
      res.status(500).json({ message: 'Failed to fetch financial record' });
    }
  });

  app.post('/api/financial-records', async (req: Request, res: Response) => {
    try {
      const validatedData = insertFinancialRecordSchema.parse(req.body);
      const record = await storage.createFinancialRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      console.error('Error creating financial record:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid input', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create financial record' });
      }
    }
  });

  app.patch('/api/financial-records/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const record = await storage.updateFinancialRecord(id, req.body);
      if (!record) {
        res.status(404).json({ message: 'Financial record not found' });
      } else {
        res.json(record);
      }
    } catch (error) {
      console.error('Error updating financial record:', error);
      res.status(500).json({ message: 'Failed to update financial record' });
    }
  });

  app.delete('/api/financial-records/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteFinancialRecord(id);
      if (!success) {
        res.status(404).json({ message: 'Financial record not found' });
      } else {
        res.status(204).send();
      }
    } catch (error) {
      console.error('Error deleting financial record:', error);
      res.status(500).json({ message: 'Failed to delete financial record' });
    }
  });

  // AI Action endpoints for task and goal management
  app.post('/api/ai/update-task-status', async (req: Request, res: Response) => {
    try {
      const { taskId, status } = req.body;
      
      if (!taskId || !status) {
        return res.status(400).json({ message: 'Task ID and status are required' });
      }
      
      const validStatuses = ['pending', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be: pending, in_progress, or completed' });
      }
      
      const task = await storage.updateTask(taskId, { status });
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      res.json({ message: 'Task status updated successfully', task });
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ message: 'Failed to update task status' });
    }
  });

  app.post('/api/ai/update-goal-progress', async (req: Request, res: Response) => {
    try {
      const { goalId, progress } = req.body;
      
      if (!goalId || progress === undefined) {
        return res.status(400).json({ message: 'Goal ID and progress are required' });
      }
      
      if (progress < 0) {
        return res.status(400).json({ message: 'Progress cannot be negative' });
      }
      
      // Cap progress at 100%
      const cappedProgress = Math.min(progress, 100);
      
      const goal = await storage.updateGoal(goalId, { progress: cappedProgress });
      if (!goal) {
        return res.status(404).json({ message: 'Goal not found' });
      }
      
      res.json({ message: 'Goal progress updated successfully', goal });
    } catch (error) {
      console.error('Error updating goal progress:', error);
      res.status(500).json({ message: 'Failed to update goal progress' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Async function to process documents
async function processDocumentAsync(documentId: number, filePath: string, mimeType: string) {
  try {
    // Update status to processing
    await storage.updateDocument(documentId, { status: 'processing' });

    // Extract text from file
    const content = await extractTextFromFile(filePath, mimeType);
    
    // Get document info for filename
    const document = await storage.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Summarize document with AI
    const analysis = await summarizeDocument(content, document.originalName);

    // Update document with content and summary
    await storage.updateDocument(documentId, {
      content,
      summary: analysis.summary,
      insights: analysis.keyPoints,
      status: 'completed',
      processedAt: new Date()
    });

    // Create AI insights
    for (const insight of analysis.insights) {
      await storage.createAiInsight({
        documentId,
        type: insight.type,
        title: insight.title,
        content: insight.content,
        confidence: insight.confidence
      });
    }

    // Clean up the uploaded file
    await cleanupFile(filePath);
  } catch (error) {
    console.error('Error processing document:', error);
    await storage.updateDocument(documentId, { status: 'error' });
    await cleanupFile(filePath);
  }
}
