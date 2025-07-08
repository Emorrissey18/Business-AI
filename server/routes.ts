import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDocumentSchema, insertGoalSchema, insertAiInsightSchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
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
        insights: [] as string[],
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
      const goal = await storage.createGoal(validatedData);
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
          // Generate AI response
          const aiResponse = await generateChatResponse(chatHistory);
          
          // Save AI response
          const aiMessage = await storage.createMessage({
            conversationId: validatedData.conversationId,
            role: 'assistant',
            content: aiResponse
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
