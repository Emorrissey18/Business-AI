import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Send, Bot, User, Upload, FileText, ChevronDown, Paperclip } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Message, Conversation, Document, AiInsight } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import FileUpload from "./file-upload";

interface ChatInterfaceProps {
  conversationId?: number;
}

export default function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(conversationId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update currentConversationId when conversationId prop changes
  useEffect(() => {
    setCurrentConversationId(conversationId || null);
  }, [conversationId]);

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: [`/api/messages/${currentConversationId}`, currentConversationId],
    enabled: !!currentConversationId,
  });

  const { data: insights } = useQuery<AiInsight[]>({
    queryKey: ['/api/insights'],
  });

  const createConversationMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest('POST', '/api/conversations', { title });
      return response.json();
    },
    onSuccess: (conversation) => {
      setCurrentConversationId(conversation.id);
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; conversationId: number }) => {
      const response = await apiRequest('POST', '/api/messages', {
        content: data.content,
        conversationId: data.conversationId,
        role: 'user',
      });
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/messages/${currentConversationId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (!currentConversationId) {
      // Create new conversation and then send the message
      try {
        const conversation = await createConversationMutation.mutateAsync(message.slice(0, 50) + "...");
        // Send the message after conversation is created
        sendMessageMutation.mutate({ content: message, conversationId: conversation.id });
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
      return;
    }

    sendMessageMutation.mutate({ content: message, conversationId: currentConversationId });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const recentInsights = insights?.slice(0, 3) || [];

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          {!currentConversationId ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="h-16 w-16 text-primary mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Business Assistant</h2>
              <p className="text-gray-600 mb-6 max-w-md">
                Ask me anything about your business, documents, goals, or get insights from your data. 
                I can help you analyze trends, make decisions, and track progress.
              </p>
              
              {recentInsights.length > 0 && (
                <div className="w-full max-w-md space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Insights</h3>
                  {recentInsights.map((insight) => (
                    <div key={insight.id} className="p-3 bg-gray-50 rounded-lg text-left">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {insight.type}
                        </Badge>
                        <span className="text-xs text-gray-500">{insight.confidence}% confidence</span>
                      </div>
                      <p className="text-sm font-medium">{insight.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{insight.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex space-x-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask me anything about your business..."
              className="pr-12"
              disabled={sendMessageMutation.isPending}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowFileUpload(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <Button 
            type="submit" 
            size="sm" 
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-primary hover:bg-blue-700"
          >
            {sendMessageMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      {/* File Upload Modal */}
      {showFileUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Upload Document</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowFileUpload(false)}>
                  ×
                </Button>
              </div>
              <FileUpload />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}