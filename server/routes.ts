import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { setupSimpleAuth, isAuthenticatedSimple } from "./simpleAuth";
import { getSimpleSession } from "./sessionStore";
import { insertDocumentSchema, insertGoalSchema, insertAiInsightSchema, insertConversationSchema, insertMessageSchema, insertTaskSchema, insertCalendarEventSchema, insertFinancialRecordSchema, insertBusinessContextSchema } from "@shared/schema";
import { upload, extractTextFromFile, cleanupFile } from "./services/fileProcessor";
import { summarizeDocument, generateChatResponse } from "./services/openai";
import { analyzeDataCorrelations, executeCorrelationActions, generateBusinessInsights } from "./services/correlationEngine";
import { updateRevenueBasedGoals } from "./services/revenueCalculator";
import { analyzeFinancialRecords } from "./services/financialAnalyzer";
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
  // Setup session store
  app.use(getSimpleSession());
  
  // Setup simple authentication for testing
  setupSimpleAuth(app);

  // Use simple auth middleware
  const authMiddleware = isAuthenticatedSimple;

  // Auth routes
  app.get('/api/auth/user', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Documents routes
  app.get('/api/documents', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  app.get('/api/documents/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(userId, id);
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      res.json(document);
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ message: 'Failed to fetch document' });
    }
  });

  app.post('/api/documents/upload', authMiddleware, upload.single('file'), async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const document = await storage.createDocument(userId, {
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
      processDocumentAsync(userId, document.id, req.file.path, req.file.mimetype);
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ message: 'Failed to upload document' });
    }
  });

  app.delete('/api/documents/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteDocument(userId, id);
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
  app.get('/api/goals', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const goals = await storage.getGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error('Error fetching goals:', error);
      res.status(500).json({ message: 'Failed to fetch goals' });
    }
  });

  app.post('/api/goals', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertGoalSchema.parse(req.body);
      // Convert targetDate string to Date object if provided
      const goalData = {
        ...validatedData,
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : null
      };
      const goal = await storage.createGoal(userId, goalData);
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

  app.patch('/api/goals/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const validatedData = updateGoalSchema.parse(req.body);
      
      // Convert string targetDate to Date if provided
      const updateData = {
        ...validatedData,
        targetDate: validatedData.targetDate ? new Date(validatedData.targetDate) : undefined
      };
      
      const updatedGoal = await storage.updateGoal(userId, id, updateData);
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

  app.delete('/api/goals/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteGoal(userId, id);
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
  app.get('/api/insights', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const insights = await storage.getAiInsights(userId);
      res.json(insights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      res.status(500).json({ message: 'Failed to fetch insights' });
    }
  });

  app.get('/api/insights/document/:documentId', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const documentId = parseInt(req.params.documentId);
      const insights = await storage.getAiInsightsByDocument(userId, documentId);
      res.json(insights);
    } catch (error) {
      console.error('Error fetching insights:', error);
      res.status(500).json({ message: 'Failed to fetch insights' });
    }
  });

  // Stats route
  app.get('/api/stats', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getDocuments(userId);
      const goals = await storage.getGoals(userId);
      const insights = await storage.getAiInsights(userId);

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
  app.get('/api/conversations', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.post('/api/conversations', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(userId, validatedData);
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

  app.patch('/api/conversations/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      const updates = req.body;
      
      const conversation = await storage.updateConversation(userId, conversationId, updates);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error('Error updating conversation:', error);
      res.status(500).json({ message: 'Failed to update conversation' });
    }
  });

  app.delete('/api/conversations/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.id);
      
      const deleted = await storage.deleteConversation(userId, conversationId);
      
      if (!deleted) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ message: 'Failed to delete conversation' });
    }
  });

  // Messages routes
  app.get('/api/messages/:conversationId', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const conversationId = parseInt(req.params.conversationId);
      const messages = await storage.getMessagesByConversation(userId, conversationId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/messages', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertMessageSchema.parse(req.body);
      const userMessage = await storage.createMessage(userId, validatedData);
      
      // If it's a user message, generate an AI response
      if (validatedData.role === 'user' && validatedData.conversationId) {
        // Get conversation history
        const conversationMessages = await storage.getMessagesByConversation(userId, validatedData.conversationId);
        
        // Convert to format expected by OpenAI
        const chatHistory = conversationMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        
        try {
          // Fetch context data for AI
          const [tasks, goals, documents, insights, calendarEvents, financialRecords, businessContexts] = await Promise.all([
            storage.getTasks(userId),
            storage.getGoals(userId),
            storage.getDocuments(userId),
            storage.getAiInsights(userId),
            storage.getCalendarEvents(userId),
            storage.getFinancialRecords(userId),
            storage.getBusinessContexts(userId)
          ]);
          
          const contextData = {
            tasks,
            goals,
            documents,
            insights,
            calendarEvents,
            financialRecords,
            businessContexts
          };
          
          // Debug: log financial records data
          console.log('Financial records in context:', financialRecords?.length || 0);
          
          // Generate AI response with context
          const aiResult = await generateChatResponse(chatHistory, contextData);
          
          // Execute any actions the AI requested
          if (aiResult.actions && aiResult.actions.length > 0) {
            for (const action of aiResult.actions) {
              try {
                if (action.type === 'update_task_status') {
                  await storage.updateTask(userId, action.parameters.taskId, { status: action.parameters.status });
                } else if (action.type === 'create_task') {
                  const taskData = {
                    ...action.parameters,
                    dueDate: action.parameters.dueDate ? new Date(action.parameters.dueDate) : null
                  };
                  await storage.createTask(userId, taskData);
                } else if (action.type === 'update_goal_progress') {
                  await storage.updateGoal(userId, action.parameters.goalId, { progress: action.parameters.progress });
                } else if (action.type === 'create_goal') {
                  const goalData = {
                    ...action.parameters,
                    targetDate: action.parameters.targetDate ? new Date(action.parameters.targetDate) : null,
                    targetAmount: action.parameters.targetAmount ? action.parameters.targetAmount * 100 : null, // Convert to cents
                    status: 'active',
                    progress: 0
                  };
                  await storage.createGoal(userId, goalData);
                } else if (action.type === 'create_calendar_event') {
                  const eventData = {
                    ...action.parameters,
                    startDate: new Date(action.parameters.startDate),
                    endDate: new Date(action.parameters.endDate),
                    allDay: action.parameters.allDay || false,
                    completed: false
                  };
                  await storage.createCalendarEvent(userId, eventData);
                } else if (action.type === 'update_calendar_event') {
                  const { eventId, ...updateData } = action.parameters;
                  const updates: any = {};
                  if (updateData.title) updates.title = updateData.title;
                  if (updateData.description) updates.description = updateData.description;
                  if (updateData.completed !== undefined) updates.completed = updateData.completed;
                  if (updateData.startDate) updates.startDate = new Date(updateData.startDate);
                  if (updateData.endDate) updates.endDate = new Date(updateData.endDate);
                  await storage.updateCalendarEvent(userId, eventId, updates);
                } else if (action.type === 'create_financial_record') {
                  const recordData = {
                    ...action.parameters,
                    date: new Date(action.parameters.date),
                    amount: action.parameters.amount * 100 // Convert to cents
                  };
                  const record = await storage.createFinancialRecord(userId, recordData);
                  // Trigger automatic correlation analysis
                  processFinancialCorrelation(userId, record.id);
                } else if (action.type === 'update_financial_record') {
                  const { recordId, ...updateData } = action.parameters;
                  const updates: any = {};
                  if (updateData.type) updates.type = updateData.type;
                  if (updateData.category) updates.category = updateData.category;
                  if (updateData.amount !== undefined) updates.amount = updateData.amount * 100; // Convert to cents
                  if (updateData.description) updates.description = updateData.description;
                  if (updateData.date) updates.date = new Date(updateData.date);
                  const record = await storage.updateFinancialRecord(userId, recordId, updates);
                  if (record) {
                    // Trigger automatic correlation analysis
                    processFinancialCorrelation(userId, record.id);
                  }
                }
              } catch (actionError) {
                console.error('Error executing AI action:', actionError);
              }
            }
          }
          
          // Save AI response
          const aiMessage = await storage.createMessage(userId, {
            conversationId: validatedData.conversationId,
            role: 'assistant',
            content: aiResult.response
          });
          
          // Update conversation title if this is the first message
          if (conversationMessages.length === 0) {
            const conversation = await storage.getConversation(userId, validatedData.conversationId);
            if (conversation && conversation.title === 'New Conversation') {
              // Generate a title from the first message
              const title = validatedData.content.length > 50 
                ? validatedData.content.substring(0, 50) + '...'
                : validatedData.content;
              await storage.updateConversation(userId, validatedData.conversationId, { title });
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
  app.get('/api/tasks', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Failed to fetch tasks' });
    }
  });

  app.post('/api/tasks', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTaskSchema.parse(req.body);
      // Convert dueDate string to Date object if provided
      const taskData = {
        ...validatedData,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null
      };
      const task = await storage.createTask(userId, taskData);
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

  app.patch('/api/tasks/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Convert dueDate string to Date object if present
      if (updates.dueDate && typeof updates.dueDate === 'string') {
        updates.dueDate = new Date(updates.dueDate);
      }
      
      const task = await storage.updateTask(userId, id, updates);
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

  app.delete('/api/tasks/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteTask(userId, id);
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
  app.get('/api/calendar-events', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getCalendarEvents(userId);
      res.json(events);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({ message: 'Failed to fetch calendar events' });
    }
  });

  app.post('/api/calendar-events', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCalendarEventSchema.parse(req.body);
      const event = await storage.createCalendarEvent(userId, validatedData);
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

  app.patch('/api/calendar-events/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Convert date strings to Date objects if present
      if (updates.startDate) {
        updates.startDate = new Date(updates.startDate);
      }
      if (updates.endDate) {
        updates.endDate = new Date(updates.endDate);
      }
      
      const event = await storage.updateCalendarEvent(userId, id, updates);
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

  app.delete('/api/calendar-events/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteCalendarEvent(userId, id);
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
  app.get('/api/financial-records', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const records = await storage.getFinancialRecords(userId);
      res.json(records);
    } catch (error) {
      console.error('Error fetching financial records:', error);
      res.status(500).json({ message: 'Failed to fetch financial records' });
    }
  });

  app.get('/api/financial-records/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const record = await storage.getFinancialRecord(userId, id);
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

  app.post('/api/financial-records', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertFinancialRecordSchema.parse(req.body);
      const recordData = {
        ...validatedData,
        date: new Date(validatedData.date)
      };
      const record = await storage.createFinancialRecord(userId, recordData);
      
      // Trigger immediate AI correlation analysis
      try {
        await processFinancialCorrelation(userId, record.id);
        console.log(`✓ Auto-correlation completed for financial record ${record.id}`);
      } catch (correlationError) {
        console.error('Correlation analysis failed but record was saved:', correlationError);
      }
      
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

  app.patch('/api/financial-records/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Convert date string to Date object if present
      if (updates.date) {
        updates.date = new Date(updates.date);
      }
      
      const record = await storage.updateFinancialRecord(userId, id, updates);
      if (!record) {
        res.status(404).json({ message: 'Financial record not found' });
      } else {
        // Trigger correlation analysis for updated record
        try {
          await processFinancialCorrelation(userId, record.id);
          console.log(`✓ Auto-correlation completed for updated financial record ${record.id}`);
        } catch (correlationError) {
          console.error('Correlation analysis failed but record was updated:', correlationError);
        }
        
        res.json(record);
      }
    } catch (error) {
      console.error('Error updating financial record:', error);
      res.status(500).json({ message: 'Failed to update financial record' });
    }
  });

  app.delete('/api/financial-records/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteFinancialRecord(userId, id);
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

  // AI Financial Analysis endpoint
  app.get('/api/ai/financial-analysis', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const records = await storage.getFinancialRecords(userId);
      const analysis = await analyzeFinancialRecords(records);
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing financial records:', error);
      res.status(500).json({ message: 'Failed to analyze financial records' });
    }
  });

  // AI Action endpoints for comprehensive data management
  app.post('/api/ai/update-task-status', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { taskId, status } = req.body;
      
      if (!taskId || !status) {
        return res.status(400).json({ message: 'Task ID and status are required' });
      }
      
      const validStatuses = ['pending', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be: pending, in_progress, or completed' });
      }
      
      const task = await storage.updateTask(userId, taskId, { status });
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      res.json({ message: 'Task status updated successfully', task });
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ message: 'Failed to update task status' });
    }
  });

  app.post('/api/ai/create-task', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(userId, validatedData);
      res.status(201).json({ message: 'Task created successfully', task });
    } catch (error) {
      console.error('Error creating task:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid task data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create task' });
      }
    }
  });

  app.post('/api/ai/update-goal-progress', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { goalId, progress } = req.body;
      
      if (!goalId || progress === undefined) {
        return res.status(400).json({ message: 'Goal ID and progress are required' });
      }
      
      if (progress < 0) {
        return res.status(400).json({ message: 'Progress cannot be negative' });
      }
      
      // Cap progress at 100%
      const cappedProgress = Math.min(progress, 100);
      
      const goal = await storage.updateGoal(userId, goalId, { progress: cappedProgress });
      if (!goal) {
        return res.status(404).json({ message: 'Goal not found' });
      }
      
      res.json({ message: 'Goal progress updated successfully', goal });
    } catch (error) {
      console.error('Error updating goal progress:', error);
      res.status(500).json({ message: 'Failed to update goal progress' });
    }
  });

  app.post('/api/ai/create-goal', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertGoalSchema.parse(req.body);
      const goal = await storage.createGoal(userId, validatedData);
      res.status(201).json({ message: 'Goal created successfully', goal });
    } catch (error) {
      console.error('Error creating goal:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid goal data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create goal' });
      }
    }
  });

  app.post('/api/ai/create-calendar-event', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCalendarEventSchema.parse(req.body);
      const event = await storage.createCalendarEvent(userId, validatedData);
      res.status(201).json({ message: 'Calendar event created successfully', event });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid calendar event data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create calendar event' });
      }
    }
  });

  app.post('/api/ai/update-calendar-event', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { eventId, ...updateData } = req.body;
      
      if (!eventId) {
        return res.status(400).json({ message: 'Event ID is required' });
      }
      
      const event = await storage.updateCalendarEvent(userId, eventId, updateData);
      if (!event) {
        return res.status(404).json({ message: 'Calendar event not found' });
      }
      
      res.json({ message: 'Calendar event updated successfully', event });
    } catch (error) {
      console.error('Error updating calendar event:', error);
      res.status(500).json({ message: 'Failed to update calendar event' });
    }
  });

  app.post('/api/ai/create-financial-record', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertFinancialRecordSchema.parse(req.body);
      const record = await storage.createFinancialRecord(userId, validatedData);
      
      // Trigger automatic correlation analysis
      processFinancialCorrelation(userId, record.id);
      
      res.status(201).json({ message: 'Financial record created successfully', record });
    } catch (error) {
      console.error('Error creating financial record:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid financial record data', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create financial record' });
      }
    }
  });

  app.post('/api/ai/update-financial-record', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { recordId, ...updateData } = req.body;
      
      if (!recordId) {
        return res.status(400).json({ message: 'Record ID is required' });
      }
      
      const record = await storage.updateFinancialRecord(userId, recordId, updateData);
      if (!record) {
        return res.status(404).json({ message: 'Financial record not found' });
      }
      
      // Trigger automatic correlation analysis
      processFinancialCorrelation(userId, record.id);
      
      res.json({ message: 'Financial record updated successfully', record });
    } catch (error) {
      console.error('Error updating financial record:', error);
      res.status(500).json({ message: 'Failed to update financial record' });
    }
  });

  // Business Context routes
  app.get('/api/business-context', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const contexts = await storage.getBusinessContexts(userId);
      res.json(contexts);
    } catch (error) {
      console.error('Error fetching business contexts:', error);
      res.status(500).json({ message: 'Failed to fetch business contexts' });
    }
  });

  app.get('/api/business-context/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const context = await storage.getBusinessContext(userId, id);
      if (!context) {
        res.status(404).json({ message: 'Business context not found' });
      } else {
        res.json(context);
      }
    } catch (error) {
      console.error('Error fetching business context:', error);
      res.status(500).json({ message: 'Failed to fetch business context' });
    }
  });

  app.get('/api/business-context/section/:section', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const section = req.params.section;
      const contexts = await storage.getBusinessContextsBySection(userId, section);
      res.json(contexts);
    } catch (error) {
      console.error('Error fetching business contexts by section:', error);
      res.status(500).json({ message: 'Failed to fetch business contexts by section' });
    }
  });

  app.post('/api/business-context', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertBusinessContextSchema.parse(req.body);
      const context = await storage.createBusinessContext(userId, validatedData);
      res.status(201).json(context);
    } catch (error) {
      console.error('Error creating business context:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Invalid input', errors: error.errors });
      } else {
        res.status(500).json({ message: 'Failed to create business context' });
      }
    }
  });

  app.patch('/api/business-context/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const context = await storage.updateBusinessContext(userId, id, req.body);
      if (!context) {
        res.status(404).json({ message: 'Business context not found' });
      } else {
        res.json(context);
      }
    } catch (error) {
      console.error('Error updating business context:', error);
      res.status(500).json({ message: 'Failed to update business context' });
    }
  });

  app.delete('/api/business-context/:id', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteBusinessContext(userId, id);
      if (!success) {
        res.status(404).json({ message: 'Business context not found' });
      } else {
        res.status(204).send();
      }
    } catch (error) {
      console.error('Error deleting business context:', error);
      res.status(500).json({ message: 'Failed to delete business context' });
    }
  });

  // AI Correlation endpoints
  app.get('/api/ai/business-insights', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const insights = await generateBusinessInsights(userId);
      res.json(insights);
    } catch (error) {
      console.error('Error generating business insights:', error);
      res.status(500).json({ message: 'Failed to generate business insights' });
    }
  });

  app.get('/api/ai/correlations/:financialRecordId', authMiddleware, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const financialRecordId = parseInt(req.params.financialRecordId);
      const financialRecord = await storage.getFinancialRecord(userId, financialRecordId);
      
      if (!financialRecord) {
        return res.status(404).json({ message: 'Financial record not found' });
      }

      const [goals, tasks, allRecords] = await Promise.all([
        storage.getGoals(userId),
        storage.getTasks(userId),
        storage.getFinancialRecords(userId)
      ]);

      const analysis = await analyzeDataCorrelations(financialRecord, goals, tasks, allRecords);
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing correlations:', error);
      res.status(500).json({ message: 'Failed to analyze correlations' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Async function to process financial record correlations
async function processFinancialCorrelation(userId: string, financialRecordId: number) {
  try {
    const financialRecord = await storage.getFinancialRecord(userId, financialRecordId);
    if (!financialRecord) {
      console.error('Financial record not found for correlation:', financialRecordId);
      return;
    }

    const [goals, tasks, allRecords] = await Promise.all([
      storage.getGoals(userId),
      storage.getTasks(userId),
      storage.getFinancialRecords(userId)
    ]);

    const analysis = await analyzeDataCorrelations(financialRecord, goals, tasks, allRecords);
    
    // Execute correlation actions (goal progress updates, task status changes)
    await executeCorrelationActions(userId, analysis);
    
    // Update revenue-based goals with accurate calculations
    await updateRevenueBasedGoals(userId);
    
    console.log(`Processed correlations for financial record ${financialRecordId}:`, {
      correlations: analysis.correlations.length,
      progressUpdates: analysis.progressUpdates.length,
      taskUpdates: analysis.taskUpdates.length
    });
  } catch (error) {
    console.error('Error processing financial correlation:', error);
  }
}

// Function to update revenue-based goals with accurate calculations
async function updateRevenueBasedGoals(userId: string) {
  try {
    const [goals, financialRecords] = await Promise.all([
      storage.getGoals(userId),
      storage.getFinancialRecords(userId)
    ]);
    
    // Calculate current totals
    const totalRevenue = financialRecords
      .filter(r => r.type === 'revenue')
      .reduce((sum, r) => sum + r.amount, 0);
    
    const totalExpenses = financialRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);
    
    // Update revenue-based goals with target amounts
    for (const goal of goals) {
      if (goal.type === 'revenue' && goal.targetAmount) {
        const newProgress = Math.min(100, Math.floor((totalRevenue / goal.targetAmount) * 100));
        if (newProgress !== goal.progress) {
          await storage.updateGoal(userId, goal.id, { progress: newProgress });
          console.log(`✓ Updated goal "${goal.title}" progress to ${newProgress}% (${totalRevenue / 100} / ${goal.targetAmount / 100})`);
        }
      } else if (goal.type === 'expense' && goal.targetAmount) {
        // For expense goals, progress = (target - actual) / target * 100 (staying under budget)
        const newProgress = Math.max(0, Math.min(100, Math.floor(((goal.targetAmount - totalExpenses) / goal.targetAmount) * 100)));
        if (newProgress !== goal.progress) {
          await storage.updateGoal(userId, goal.id, { progress: newProgress });
          console.log(`✓ Updated expense goal "${goal.title}" progress to ${newProgress}%`);
        }
      }
    }
  } catch (error) {
    console.error('Error updating revenue-based goals:', error);
  }
}

// Async function to process documents
async function processDocumentAsync(userId: string, documentId: number, filePath: string, mimeType: string) {
  try {
    // Update status to processing
    await storage.updateDocument(userId, documentId, { status: 'processing' });

    // Extract text from file
    const content = await extractTextFromFile(filePath, mimeType);
    
    // Get document info for filename
    const document = await storage.getDocument(userId, documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Summarize document with AI
    const analysis = await summarizeDocument(content, document.originalName);

    // Update document with content and summary
    await storage.updateDocument(userId, documentId, {
      content,
      summary: analysis.summary,
      insights: analysis.keyPoints,
      status: 'completed',
      processedAt: new Date()
    });

    // Create AI insights
    for (const insight of analysis.insights) {
      await storage.createAiInsight(userId, {
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
    await storage.updateDocument(userId, documentId, { status: 'error' });
    await cleanupFile(filePath);
  }
}
