import { 
  users, documents, goals, aiInsights, conversations, messages, tasks, calendarEvents, financialRecords,
  type User, type InsertUser, type Document, type InsertDocument, type Goal, type InsertGoal, 
  type AiInsight, type InsertAiInsight, type Conversation, type InsertConversation, 
  type Message, type InsertMessage, type Task, type InsertTask, type CalendarEvent, 
  type InsertCalendarEvent, type FinancialRecord, type InsertFinancialRecord 
} from "@shared/schema";

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
  createGoal(goal: InsertGoal): Promise<Goal>;
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private goals: Map<number, Goal>;
  private aiInsights: Map<number, AiInsight>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private currentUserId: number;
  private currentDocumentId: number;
  private currentGoalId: number;
  private currentInsightId: number;
  private currentConversationId: number;
  private currentMessageId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.goals = new Map();
    this.aiInsights = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.currentUserId = 1;
    this.currentDocumentId = 1;
    this.currentGoalId = 1;
    this.currentInsightId = 1;
    this.currentConversationId = 1;
    this.currentMessageId = 1;
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
      insights: (insertDocument.insights as string[]) || null,
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

  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
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
}

export const storage = new MemStorage();
