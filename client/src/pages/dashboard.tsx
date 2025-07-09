import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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

export default function Dashboard() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!conversations || !searchQuery.trim()) return conversations || [];
    
    const query = searchQuery.toLowerCase().trim();
    return conversations.filter(conversation => 
      conversation.title.toLowerCase().includes(query)
    );
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
                        "w-full p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer",
                        selectedConversation === conversation.id ? "bg-blue-50 border border-blue-200" : "border border-transparent"
                      )}
                      onClick={() => setSelectedConversation(conversation.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {conversation.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <button 
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add edit functionality here
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button 
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Add delete functionality here
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
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
