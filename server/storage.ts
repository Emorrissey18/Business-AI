import { 
  users, documents, goals, aiInsights, conversations, messages, tasks, calendarEvents, financialRecords, businessContext,
  type User, type InsertUser, type Document, type InsertDocument, type Goal, type InsertGoal, 
  type AiInsight, type InsertAiInsight, type Conversation, type InsertConversation, 
  type Message, type InsertMessage, type Task, type InsertTask, type CalendarEvent, 
  type InsertCalendarEvent, type FinancialRecord, type InsertFinancialRecord,
  type BusinessContext, type InsertBusinessContext
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Documents
  getDocument(id: number): Promise<Document | undefined>;
  getDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  
  // Goals
  getGoal(id: number): Promise<Goal | undefined>;
  getGoals(): Promise<Goal[]>;
  createGoal(goal: any): Promise<Goal>;
  updateGoal(id: number, updates: Partial<Goal>): Promise<Goal | undefined>;
  deleteGoal(id: number): Promise<boolean>;
  
  // AI Insights
  getAiInsight(id: number): Promise<AiInsight | undefined>;
  getAiInsights(): Promise<AiInsight[]>;
  getAiInsightsByDocument(documentId: number): Promise<AiInsight[]>;
  createAiInsight(insight: InsertAiInsight): Promise<AiInsight>;
  deleteAiInsight(id: number): Promise<boolean>;
  
  // Conversations
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversations(): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<boolean>;
  
  // Messages
  getMessage(id: number): Promise<Message | undefined>;
  getMessages(): Promise<Message[]>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  deleteMessage(id: number): Promise<boolean>;
  
  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  getTasks(): Promise<Task[]>;
  createTask(task: any): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Calendar Events
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  getCalendarEvents(): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, updates: Partial<CalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number): Promise<boolean>;
  
  // Financial Records
  getFinancialRecord(id: number): Promise<FinancialRecord | undefined>;
  getFinancialRecords(): Promise<FinancialRecord[]>;
  createFinancialRecord(record: InsertFinancialRecord): Promise<FinancialRecord>;
  updateFinancialRecord(id: number, updates: Partial<FinancialRecord>): Promise<FinancialRecord | undefined>;
  deleteFinancialRecord(id: number): Promise<boolean>;
  
  // Business Context
  getBusinessContext(id: number): Promise<BusinessContext | undefined>;
  getBusinessContexts(): Promise<BusinessContext[]>;
  getBusinessContextsBySection(section: string): Promise<BusinessContext[]>;
  createBusinessContext(context: InsertBusinessContext): Promise<BusinessContext>;
  updateBusinessContext(id: number, updates: Partial<BusinessContext>): Promise<BusinessContext | undefined>;
  deleteBusinessContext(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private goals: Map<number, Goal>;
  private aiInsights: Map<number, AiInsight>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private tasks: Map<number, Task>;
  private calendarEvents: Map<number, CalendarEvent>;
  private currentUserId: number;
  private currentDocumentId: number;
  private currentGoalId: number;
  private currentInsightId: number;
  private currentConversationId: number;
  private currentMessageId: number;
  private currentTaskId: number;
  private currentCalendarEventId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.goals = new Map();
    this.aiInsights = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.tasks = new Map();
    this.calendarEvents = new Map();
    this.currentUserId = 1;
    this.currentDocumentId = 1;
    this.currentGoalId = 1;
    this.currentInsightId = 1;
    this.currentConversationId = 1;
    this.currentMessageId = 1;
    this.currentTaskId = 1;
    this.currentCalendarEventId = 1;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Documents
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.currentDocumentId++;
    const document: Document = {
      ...insertDocument,
      id,
      uploadedAt: new Date(),
      processedAt: null,
      content: insertDocument.content || null,
      summary: insertDocument.summary || null,
      insights: [],
      status: insertDocument.status || 'pending',
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    const document = this.documents.get(id);
    if (!document) return undefined;
    
    const updatedDocument = { ...document, ...updates };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Goals
  async getGoal(id: number): Promise<Goal | undefined> {
    return this.goals.get(id);
  }

  async getGoals(): Promise<Goal[]> {
    return Array.from(this.goals.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createGoal(insertGoal: any): Promise<Goal> {
    const id = this.currentGoalId++;
    const goal: Goal = {
      ...insertGoal,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: insertGoal.progress || 0,
      description: insertGoal.description || null,
      status: insertGoal.status || 'active',
      targetDate: insertGoal.targetDate || null,
    };
    this.goals.set(id, goal);
    return goal;
  }

  async updateGoal(id: number, updates: Partial<Goal>): Promise<Goal | undefined> {
    const goal = this.goals.get(id);
    if (!goal) return undefined;
    
    const updatedGoal = { ...goal, ...updates, updatedAt: new Date() };
    this.goals.set(id, updatedGoal);
    return updatedGoal;
  }

  async deleteGoal(id: number): Promise<boolean> {
    return this.goals.delete(id);
  }

  // AI Insights
  async getAiInsight(id: number): Promise<AiInsight | undefined> {
    return this.aiInsights.get(id);
  }

  async getAiInsights(): Promise<AiInsight[]> {
    return Array.from(this.aiInsights.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getAiInsightsByDocument(documentId: number): Promise<AiInsight[]> {
    return Array.from(this.aiInsights.values())
      .filter(insight => insight.documentId === documentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createAiInsight(insertInsight: InsertAiInsight): Promise<AiInsight> {
    const id = this.currentInsightId++;
    const insight: AiInsight = {
      ...insertInsight,
      id,
      createdAt: new Date(),
      documentId: insertInsight.documentId || null,
    };
    this.aiInsights.set(id, insight);
    return insight;
  }

  async deleteAiInsight(id: number): Promise<boolean> {
    return this.aiInsights.delete(id);
  }

  // Conversations
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationId++;
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updatedConversation = {
      ...conversation,
      ...updates,
      updatedAt: new Date(),
    };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }

  async deleteConversation(id: number): Promise<boolean> {
    return this.conversations.delete(id);
  }

  // Messages
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = {
      ...insertMessage,
      id,
      createdAt: new Date(),
      documentId: insertMessage.documentId || null,
      conversationId: insertMessage.conversationId || null,
    };
    this.messages.set(id, message);
    
    // Update conversation's updatedAt
    if (insertMessage.conversationId) {
      const conversation = this.conversations.get(insertMessage.conversationId);
      if (conversation) {
        conversation.updatedAt = new Date();
        this.conversations.set(insertMessage.conversationId, conversation);
      }
    }
    
    return message;
  }

  async deleteMessage(id: number): Promise<boolean> {
    return this.messages.delete(id);
  }

  // Tasks
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createTask(insertTask: any): Promise<Task> {
    const id = this.currentTaskId++;
    const task: Task = {
      ...insertTask,
      id,
      priority: insertTask.priority || 'medium',
      status: insertTask.status || 'pending',
      description: insertTask.description || null,
      dueDate: insertTask.dueDate || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask: Task = {
      ...task,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    return this.calendarEvents.get(id);
  }

  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values()).sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = this.currentCalendarEventId++;
    const event: CalendarEvent = {
      ...insertEvent,
      id,
      description: insertEvent.description || null,
      allDay: insertEvent.allDay || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.calendarEvents.set(id, event);
    return event;
  }

  async updateCalendarEvent(id: number, updates: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    const event = this.calendarEvents.get(id);
    if (!event) return undefined;
    
    const updatedEvent: CalendarEvent = {
      ...event,
      ...updates,
      updatedAt: new Date(),
    };
    this.calendarEvents.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteCalendarEvent(id: number): Promise<boolean> {
    const deleted = this.calendarEvents.delete(id);
    return deleted;
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.uploadedAt));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values([insertDocument])
      .returning();
    return document;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return document || undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal || undefined;
  }

  async getGoals(): Promise<Goal[]> {
    return await db.select().from(goals).orderBy(desc(goals.createdAt));
  }

  async createGoal(insertGoal: any): Promise<Goal> {
    const [goal] = await db
      .insert(goals)
      .values(insertGoal)
      .returning();
    return goal;
  }

  async updateGoal(id: number, updates: Partial<Goal>): Promise<Goal | undefined> {
    const [goal] = await db
      .update(goals)
      .set(updates)
      .where(eq(goals.id, id))
      .returning();
    return goal || undefined;
  }

  async deleteGoal(id: number): Promise<boolean> {
    const result = await db.delete(goals).where(eq(goals.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAiInsight(id: number): Promise<AiInsight | undefined> {
    const [insight] = await db.select().from(aiInsights).where(eq(aiInsights.id, id));
    return insight || undefined;
  }

  async getAiInsights(): Promise<AiInsight[]> {
    return await db.select().from(aiInsights).orderBy(desc(aiInsights.createdAt));
  }

  async getAiInsightsByDocument(documentId: number): Promise<AiInsight[]> {
    return await db.select().from(aiInsights).where(eq(aiInsights.documentId, documentId));
  }

  async createAiInsight(insertInsight: InsertAiInsight): Promise<AiInsight> {
    const [insight] = await db
      .insert(aiInsights)
      .values(insertInsight)
      .returning();
    return insight;
  }

  async deleteAiInsight(id: number): Promise<boolean> {
    const result = await db.delete(aiInsights).where(eq(aiInsights.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversations(): Promise<Conversation[]> {
    return await db.select().from(conversations).orderBy(desc(conversations.updatedAt));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async updateConversation(id: number, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();
    return conversation || undefined;
  }

  async deleteConversation(id: number): Promise<boolean> {
    const result = await db.delete(conversations).where(eq(conversations.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getMessages(): Promise<Message[]> {
    return await db.select().from(messages).orderBy(desc(messages.createdAt));
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async deleteMessage(id: number): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Tasks
  async getTask(id: number): Promise<Task | undefined> {
    try {
      const result = await db.select().from(tasks).where(eq(tasks.id, id));
      return result[0];
    } catch (error) {
      console.error('Error fetching task:', error);
      return undefined;
    }
  }

  async getTasks(): Promise<Task[]> {
    try {
      return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  async createTask(insertTask: any): Promise<Task> {
    try {
      const result = await db.insert(tasks).values(insertTask).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    try {
      const result = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
      return result[0];
    } catch (error) {
      console.error('Error updating task:', error);
      return undefined;
    }
  }

  async deleteTask(id: number): Promise<boolean> {
    try {
      await db.delete(tasks).where(eq(tasks.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }

  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return event || undefined;
  }

  async getCalendarEvents(): Promise<CalendarEvent[]> {
    try {
      const events = await db.select().from(calendarEvents).orderBy(calendarEvents.startDate);
      return events;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }

  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    try {
      const [event] = await db.insert(calendarEvents).values(insertEvent).returning();
      return event;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  async updateCalendarEvent(id: number, updates: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    try {
      const [event] = await db.update(calendarEvents)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(calendarEvents.id, id))
        .returning();
      return event || undefined;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return undefined;
    }
  }

  async deleteCalendarEvent(id: number): Promise<boolean> {
    try {
      await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  }

  // Financial Records
  async getFinancialRecord(id: number): Promise<FinancialRecord | undefined> {
    try {
      const [record] = await db.select().from(financialRecords)
        .where(eq(financialRecords.id, id));
      return record || undefined;
    } catch (error) {
      console.error('Error fetching financial record:', error);
      return undefined;
    }
  }

  async getFinancialRecords(): Promise<FinancialRecord[]> {
    try {
      return await db.select().from(financialRecords)
        .orderBy(desc(financialRecords.date));
    } catch (error) {
      console.error('Error fetching financial records:', error);
      return [];
    }
  }

  async createFinancialRecord(insertRecord: InsertFinancialRecord): Promise<FinancialRecord> {
    try {
      const [record] = await db.insert(financialRecords)
        .values(insertRecord)
        .returning();
      return record;
    } catch (error) {
      console.error('Error creating financial record:', error);
      throw new Error('Failed to create financial record');
    }
  }

  async updateFinancialRecord(id: number, updates: Partial<FinancialRecord>): Promise<FinancialRecord | undefined> {
    try {
      // Ensure date is a Date object if provided
      const processedUpdates = { ...updates };
      if (processedUpdates.date && typeof processedUpdates.date === 'string') {
        processedUpdates.date = new Date(processedUpdates.date);
      }
      
      const [record] = await db.update(financialRecords)
        .set({ ...processedUpdates, updatedAt: new Date() })
        .where(eq(financialRecords.id, id))
        .returning();
      return record || undefined;
    } catch (error) {
      console.error('Error updating financial record:', error);
      return undefined;
    }
  }

  async deleteFinancialRecord(id: number): Promise<boolean> {
    try {
      await db.delete(financialRecords).where(eq(financialRecords.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting financial record:', error);
      return false;
    }
  }

  // Business Context methods
  async getBusinessContext(id: number): Promise<BusinessContext | undefined> {
    try {
      const [context] = await db.select().from(businessContext).where(eq(businessContext.id, id));
      return context || undefined;
    } catch (error) {
      console.error('Error fetching business context:', error);
      return undefined;
    }
  }

  async getBusinessContexts(): Promise<BusinessContext[]> {
    try {
      return await db.select().from(businessContext).orderBy(desc(businessContext.createdAt));
    } catch (error) {
      console.error('Error fetching business contexts:', error);
      return [];
    }
  }

  async getBusinessContextsBySection(section: string): Promise<BusinessContext[]> {
    try {
      return await db.select().from(businessContext)
        .where(eq(businessContext.section, section))
        .orderBy(desc(businessContext.createdAt));
    } catch (error) {
      console.error('Error fetching business contexts by section:', error);
      return [];
    }
  }

  async createBusinessContext(insertContext: InsertBusinessContext): Promise<BusinessContext> {
    try {
      const [context] = await db.insert(businessContext).values(insertContext).returning();
      return context;
    } catch (error) {
      console.error('Error creating business context:', error);
      throw error;
    }
  }

  async updateBusinessContext(id: number, updates: Partial<BusinessContext>): Promise<BusinessContext | undefined> {
    try {
      const [context] = await db.update(businessContext)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(businessContext.id, id))
        .returning();
      return context || undefined;
    } catch (error) {
      console.error('Error updating business context:', error);
      return undefined;
    }
  }

  async deleteBusinessContext(id: number): Promise<boolean> {
    try {
      await db.delete(businessContext).where(eq(businessContext.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting business context:', error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();
