import {
  users,
  documents,
  goals,
  aiInsights,
  conversations,
  messages,
  tasks,
  calendarEvents,
  financialRecords,
  businessContext,
  type User,
  type UpsertUser,
  type Document,
  type InsertDocument,
  type Goal,
  type AiInsight,
  type InsertAiInsight,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Task,
  type CalendarEvent,
  type InsertCalendarEvent,
  type FinancialRecord,
  type InsertFinancialRecord,
  type BusinessContext,
  type InsertBusinessContext,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // Users - for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Documents (user-specific)
  getDocument(userId: string, id: number): Promise<Document | undefined>;
  getDocuments(userId: string): Promise<Document[]>;
  createDocument(userId: string, document: InsertDocument): Promise<Document>;
  updateDocument(userId: string, id: number, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(userId: string, id: number): Promise<boolean>;
  
  // Goals (user-specific)
  getGoal(userId: string, id: number): Promise<Goal | undefined>;
  getGoals(userId: string): Promise<Goal[]>;
  createGoal(userId: string, goal: any): Promise<Goal>;
  updateGoal(userId: string, id: number, updates: Partial<Goal>): Promise<Goal | undefined>;
  deleteGoal(userId: string, id: number): Promise<boolean>;
  
  // AI Insights (user-specific)
  getAiInsight(userId: string, id: number): Promise<AiInsight | undefined>;
  getAiInsights(userId: string): Promise<AiInsight[]>;
  getAiInsightsByDocument(userId: string, documentId: number): Promise<AiInsight[]>;
  createAiInsight(userId: string, insight: InsertAiInsight): Promise<AiInsight>;
  deleteAiInsight(userId: string, id: number): Promise<boolean>;
  
  // Conversations (user-specific)
  getConversation(userId: string, id: number): Promise<Conversation | undefined>;
  getConversations(userId: string): Promise<Conversation[]>;
  createConversation(userId: string, conversation: InsertConversation): Promise<Conversation>;
  updateConversation(userId: string, id: number, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(userId: string, id: number): Promise<boolean>;
  
  // Messages (user-specific)
  getMessage(userId: string, id: number): Promise<Message | undefined>;
  getMessages(userId: string): Promise<Message[]>;
  getMessagesByConversation(userId: string, conversationId: number): Promise<Message[]>;
  createMessage(userId: string, message: InsertMessage): Promise<Message>;
  deleteMessage(userId: string, id: number): Promise<boolean>;
  
  // Tasks (user-specific)
  getTask(userId: string, id: number): Promise<Task | undefined>;
  getTasks(userId: string): Promise<Task[]>;
  createTask(userId: string, task: any): Promise<Task>;
  updateTask(userId: string, id: number, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(userId: string, id: number): Promise<boolean>;
  
  // Calendar Events (user-specific)
  getCalendarEvent(userId: string, id: number): Promise<CalendarEvent | undefined>;
  getCalendarEvents(userId: string): Promise<CalendarEvent[]>;
  createCalendarEvent(userId: string, event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(userId: string, id: number, updates: Partial<CalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(userId: string, id: number): Promise<boolean>;
  
  // Financial Records (user-specific)
  getFinancialRecord(userId: string, id: number): Promise<FinancialRecord | undefined>;
  getFinancialRecords(userId: string): Promise<FinancialRecord[]>;
  createFinancialRecord(userId: string, record: InsertFinancialRecord): Promise<FinancialRecord>;
  updateFinancialRecord(userId: string, id: number, updates: Partial<FinancialRecord>): Promise<FinancialRecord | undefined>;
  deleteFinancialRecord(userId: string, id: number): Promise<boolean>;
  
  // Business Context (user-specific)
  getBusinessContext(userId: string, id: number): Promise<BusinessContext | undefined>;
  getBusinessContexts(userId: string): Promise<BusinessContext[]>;
  getBusinessContextsBySection(userId: string, section: string): Promise<BusinessContext[]>;
  createBusinessContext(userId: string, context: InsertBusinessContext): Promise<BusinessContext>;
  updateBusinessContext(userId: string, id: number, updates: Partial<BusinessContext>): Promise<BusinessContext | undefined>;
  deleteBusinessContext(userId: string, id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error: any) {
      // If email unique constraint violation, try to find existing user
      if (error.code === '23505' && error.constraint === 'users_email_unique') {
        const existingUsers = await this.getUsers();
        const existingUser = existingUsers.find(u => u.email === userData.email);
        if (existingUser) {
          return existingUser;
        }
      }
      throw error;
    }
  }

  // Document operations
  async getDocument(userId: string, id: number): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.userId, userId), eq(documents.id, id)));
    return document;
  }

  async getDocuments(userId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.userId, userId));
  }

  async createDocument(userId: string, insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values({ ...insertDocument, userId })
      .returning();
    return document;
  }

  async updateDocument(userId: string, id: number, updates: Partial<Document>): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set(updates)
      .where(and(eq(documents.userId, userId), eq(documents.id, id)))
      .returning();
    return document;
  }

  async deleteDocument(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(documents)
      .where(and(eq(documents.userId, userId), eq(documents.id, id)));
    return (result.rowCount || 0) > 0;
  }

  // Goal operations
  async getGoal(userId: string, id: number): Promise<Goal | undefined> {
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.id, id)));
    return goal;
  }

  async getGoals(userId: string): Promise<Goal[]> {
    return await db.select().from(goals).where(eq(goals.userId, userId));
  }

  async createGoal(userId: string, insertGoal: any): Promise<Goal> {
    const [goal] = await db
      .insert(goals)
      .values({ ...insertGoal, userId })
      .returning();
    return goal;
  }

  async updateGoal(userId: string, id: number, updates: Partial<Goal>): Promise<Goal | undefined> {
    const [goal] = await db
      .update(goals)
      .set(updates)
      .where(and(eq(goals.userId, userId), eq(goals.id, id)))
      .returning();
    return goal;
  }

  async deleteGoal(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(goals)
      .where(and(eq(goals.userId, userId), eq(goals.id, id)));
    return (result.rowCount || 0) > 0;
  }

  // AI Insight operations
  async getAiInsight(userId: string, id: number): Promise<AiInsight | undefined> {
    const [insight] = await db
      .select()
      .from(aiInsights)
      .where(and(eq(aiInsights.userId, userId), eq(aiInsights.id, id)));
    return insight;
  }

  async getAiInsights(userId: string): Promise<AiInsight[]> {
    return await db.select().from(aiInsights).where(eq(aiInsights.userId, userId));
  }

  async getAiInsightsByDocument(userId: string, documentId: number): Promise<AiInsight[]> {
    return await db
      .select()
      .from(aiInsights)
      .where(and(eq(aiInsights.userId, userId), eq(aiInsights.documentId, documentId)));
  }

  async createAiInsight(userId: string, insertInsight: InsertAiInsight): Promise<AiInsight> {
    const [insight] = await db
      .insert(aiInsights)
      .values({ ...insertInsight, userId })
      .returning();
    return insight;
  }

  async deleteAiInsight(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(aiInsights)
      .where(and(eq(aiInsights.userId, userId), eq(aiInsights.id, id)));
    return (result.rowCount || 0) > 0;
  }

  // Conversation operations
  async getConversation(userId: string, id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.id, id)));
    return conversation;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return await db.select().from(conversations).where(eq(conversations.userId, userId));
  }

  async createConversation(userId: string, insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values({ ...insertConversation, userId })
      .returning();
    return conversation;
  }

  async updateConversation(userId: string, id: number, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const [conversation] = await db
      .update(conversations)
      .set(updates)
      .where(and(eq(conversations.userId, userId), eq(conversations.id, id)))
      .returning();
    return conversation;
  }

  async deleteConversation(userId: string, id: number): Promise<boolean> {
    // First delete all messages associated with this conversation
    await db.delete(messages)
      .where(and(eq(messages.conversationId, id), eq(messages.userId, userId)));
    
    // Then delete the conversation
    const result = await db
      .delete(conversations)
      .where(and(eq(conversations.userId, userId), eq(conversations.id, id)));
    return (result.rowCount || 0) > 0;
  }

  // Message operations
  async getMessage(userId: string, id: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(and(eq(messages.userId, userId), eq(messages.id, id)));
    return message;
  }

  async getMessages(userId: string): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.userId, userId));
  }

  async getMessagesByConversation(userId: string, conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(and(eq(messages.userId, userId), eq(messages.conversationId, conversationId)));
  }

  async createMessage(userId: string, insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({ ...insertMessage, userId })
      .returning();
    return message;
  }

  async deleteMessage(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(messages)
      .where(and(eq(messages.userId, userId), eq(messages.id, id)));
    return (result.rowCount || 0) > 0;
  }

  // Task operations
  async getTask(userId: string, id: number): Promise<Task | undefined> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, id)));
    return task;
  }

  async getTasks(userId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.userId, userId));
  }

  async createTask(userId: string, insertTask: any): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({ ...insertTask, userId })
      .returning();
    return task;
  }

  async updateTask(userId: string, id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set(updates)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, id)))
      .returning();
    return task;
  }

  async deleteTask(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.id, id)));
    return (result.rowCount || 0) > 0;
  }

  // Calendar Event operations
  async getCalendarEvent(userId: string, id: number): Promise<CalendarEvent | undefined> {
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, id)));
    return event;
  }

  async getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    return await db.select().from(calendarEvents).where(eq(calendarEvents.userId, userId));
  }

  async createCalendarEvent(userId: string, insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const [event] = await db
      .insert(calendarEvents)
      .values({ ...insertEvent, userId })
      .returning();
    return event;
  }

  async updateCalendarEvent(userId: string, id: number, updates: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    const [event] = await db
      .update(calendarEvents)
      .set(updates)
      .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, id)))
      .returning();
    return event;
  }

  async deleteCalendarEvent(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.id, id)));
    return (result.rowCount || 0) > 0;
  }

  // Financial Record operations
  async getFinancialRecord(userId: string, id: number): Promise<FinancialRecord | undefined> {
    const [record] = await db
      .select()
      .from(financialRecords)
      .where(and(eq(financialRecords.userId, userId), eq(financialRecords.id, id)));
    return record;
  }

  async getFinancialRecords(userId: string): Promise<FinancialRecord[]> {
    return await db.select().from(financialRecords).where(eq(financialRecords.userId, userId));
  }

  async createFinancialRecord(userId: string, insertRecord: InsertFinancialRecord): Promise<FinancialRecord> {
    const [record] = await db
      .insert(financialRecords)
      .values({ 
        ...insertRecord, 
        userId,
        date: new Date(insertRecord.date)
      })
      .returning();
    return record;
  }

  async updateFinancialRecord(userId: string, id: number, updates: Partial<FinancialRecord>): Promise<FinancialRecord | undefined> {
    const [record] = await db
      .update(financialRecords)
      .set(updates)
      .where(and(eq(financialRecords.userId, userId), eq(financialRecords.id, id)))
      .returning();
    return record;
  }

  async deleteFinancialRecord(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(financialRecords)
      .where(and(eq(financialRecords.userId, userId), eq(financialRecords.id, id)));
    return (result.rowCount || 0) > 0;
  }

  // Business Context operations
  async getBusinessContext(userId: string, id: number): Promise<BusinessContext | undefined> {
    const [context] = await db
      .select()
      .from(businessContext)
      .where(and(eq(businessContext.userId, userId), eq(businessContext.id, id)));
    return context;
  }

  async getBusinessContexts(userId: string): Promise<BusinessContext[]> {
    return await db.select().from(businessContext).where(eq(businessContext.userId, userId));
  }

  async getBusinessContextsBySection(userId: string, section: string): Promise<BusinessContext[]> {
    return await db
      .select()
      .from(businessContext)
      .where(and(eq(businessContext.userId, userId), eq(businessContext.section, section)));
  }

  async createBusinessContext(userId: string, insertContext: InsertBusinessContext): Promise<BusinessContext> {
    const [context] = await db
      .insert(businessContext)
      .values({ ...insertContext, userId })
      .returning();
    return context;
  }

  async updateBusinessContext(userId: string, id: number, updates: Partial<BusinessContext>): Promise<BusinessContext | undefined> {
    const [context] = await db
      .update(businessContext)
      .set(updates)
      .where(and(eq(businessContext.userId, userId), eq(businessContext.id, id)))
      .returning();
    return context;
  }

  async deleteBusinessContext(userId: string, id: number): Promise<boolean> {
    const result = await db
      .delete(businessContext)
      .where(and(eq(businessContext.userId, userId), eq(businessContext.id, id)));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();