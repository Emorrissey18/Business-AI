import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Trash2, Edit, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Conversation, Message } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import ChatInterface from "@/components/chat-interface";
import Navigation from "@/components/navigation";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingConversation, setEditingConversation] = useState<{ id: number; title: string } | null>(null);
  const [editTitle, setEditTitle] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      await apiRequest('DELETE', `/api/conversations/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setSelectedConversation(null);
      toast({
        title: "Success",
        description: "Conversation deleted successfully",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message?.includes('404') 
        ? "Conversation not found or you don't have permission to delete it"
        : "Failed to delete conversation";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Delete conversation error:", error);
    },
  });

  const updateConversationMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      return await apiRequest('PATCH', `/api/conversations/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setEditingConversation(null);
      setEditTitle("");
      toast({
        title: "Success",
        description: "Conversation updated successfully",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message?.includes('404') 
        ? "Conversation not found or you don't have permission to edit it"
        : "Failed to update conversation";
        
      toast({
        title: "Error", 
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Update conversation error:", error);
    },
  });

  // Filter and sort conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    
    let result = [...conversations];
    
    // Sort by newest first (most recent updatedAt)
    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    // Apply search filter if query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(conversation => 
        conversation.title.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [conversations, searchQuery]);

  const handleNewConversation = () => {
    setSelectedConversation(null);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    // Clear search when collapsing
    if (!sidebarCollapsed) {
      setSearchQuery("");
    }
  };

  const handleEditConversation = (conversation: Conversation) => {
    setEditingConversation({ id: conversation.id, title: conversation.title });
    setEditTitle(conversation.title);
  };

  const handleSaveEdit = () => {
    if (editingConversation && editTitle.trim()) {
      updateConversationMutation.mutate({ id: editingConversation.id, title: editTitle.trim() });
    }
  };

  const handleCancelEdit = () => {
    setEditingConversation(null);
    setEditTitle("");
  };

  const handleDeleteConversation = (conversationId: number) => {
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      deleteConversationMutation.mutate(conversationId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Navigation />
      
      <div className="flex h-[calc(100vh-12rem)] bg-white rounded-lg shadow-sm border border-gray-200 relative">
        {/* Collapsible Sidebar */}
        <div className={cn(
          "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out relative",
          sidebarCollapsed ? "w-0" : "w-80"
        )}>
          {/* Sidebar Content */}
          <div className={cn(
            "flex flex-col h-full",
            sidebarCollapsed && "opacity-0 pointer-events-none"
          )}>
            {/* Header with New Chat Button */}
            <div className="p-4 border-b border-gray-200">
              <Button
                onClick={handleNewConversation}
                className="w-full bg-primary hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1 p-4">
              {conversationsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-12 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : !filteredConversations || filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  {searchQuery ? (
                    <>
                      <p className="text-sm text-gray-500">No conversations found</p>
                      <p className="text-xs text-gray-400">Try a different search term</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">No conversations yet</p>
                      <p className="text-xs text-gray-400">Start a new chat to begin</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        "w-full p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer relative",
                        selectedConversation === conversation.id ? "bg-blue-50 border border-blue-200" : "border border-transparent"
                      )}
                      onClick={() => editingConversation?.id !== conversation.id && setSelectedConversation(conversation.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 max-w-[200px]">
                          {editingConversation?.id === conversation.id ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEdit();
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                className="h-6 text-sm"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveEdit();
                                }}
                                disabled={updateConversationMutation.isPending}
                                className="h-6 px-2 text-xs"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelEdit();
                                }}
                                className="h-6 px-2 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-medium text-gray-900 truncate">
                                {conversation.title}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                              </p>
                            </>
                          )}
                        </div>
                        {editingConversation?.id !== conversation.id && (
                          <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                            <button 
                              className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-blue-100 hover:text-blue-600 text-gray-500 border border-gray-200 bg-white shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditConversation(conversation);
                              }}
                              title="Edit conversation"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            <button 
                              className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-red-100 hover:text-red-600 text-gray-500 border border-gray-200 bg-white shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conversation.id);
                              }}
                              disabled={deleteConversationMutation.isPending}
                              title="Delete conversation"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                <p>AI Business Assistant</p>
                <p>Powered by GPT-4o Mini</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className={cn(
            "absolute top-4 z-10 h-8 w-8 p-0 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm",
            sidebarCollapsed ? "left-4" : "left-[308px]"
          )}
          title={sidebarCollapsed ? "Show chat history" : "Hide chat history"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        {/* Main Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col transition-all duration-300 ease-in-out",
          sidebarCollapsed && "ml-0"
        )}>
          <ChatInterface conversationId={selectedConversation || undefined} />
        </div>
      </div>
    </div>
  );
}
