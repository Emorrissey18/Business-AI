import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { NewBusinessContextModal } from "@/components/modals/new-business-context-modal";
import { Building2, AlertTriangle, Target, TrendingUp, Shield, Zap, Users, Lightbulb, Trash2, Edit, AlertCircle } from "lucide-react";
import type { BusinessContext } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";

const SECTION_ICONS = {
  business_structure: Building2,
  main_goals: Target,
  problems: AlertTriangle,
  risks: AlertCircle,
  opportunities: TrendingUp,
  strengths: Shield,
  weaknesses: Zap,
  other: Lightbulb,
};

const SECTION_COLORS = {
  business_structure: "bg-blue-500",
  main_goals: "bg-green-500",
  problems: "bg-red-500",
  risks: "bg-orange-500",
  opportunities: "bg-purple-500",
  strengths: "bg-emerald-500",
  weaknesses: "bg-yellow-500",
  other: "bg-gray-500",
};

const PRIORITY_COLORS = {
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

function BusinessContextCard({ context }: { context: BusinessContext }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const Icon = SECTION_ICONS[context.section as keyof typeof SECTION_ICONS] || Lightbulb;
  const sectionColor = SECTION_COLORS[context.section as keyof typeof SECTION_COLORS] || "bg-gray-500";

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/business-context/${context.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business-context"] });
      toast({
        title: "Deleted",
        description: "Business context deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete business context",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="relative group hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${sectionColor} text-white`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg">{context.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {context.section.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
                <Badge variant={PRIORITY_COLORS[context.priority as keyof typeof PRIORITY_COLORS]} className="text-xs">
                  {context.priority} priority
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">{context.content}</p>
        <div className="mt-4 text-xs text-muted-foreground">
          Created {new Date(context.createdAt).toLocaleDateString()}
          {context.updatedAt !== context.createdAt && (
            <span> • Updated {new Date(context.updatedAt).toLocaleDateString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BusinessContextPage() {
  const { data: contexts = [], isLoading } = useQuery({
    queryKey: ["/api/business-context"],
  });

  // Group contexts by section
  const contextsBySection = contexts.reduce((acc: Record<string, BusinessContext[]>, context: BusinessContext) => {
    if (!acc[context.section]) {
      acc[context.section] = [];
    }
    acc[context.section].push(context);
    return acc;
  }, {});

  const totalContexts = contexts.length;
  const highPriorityCount = contexts.filter((c: BusinessContext) => c.priority === 'high').length;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Navigation />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading business context...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Navigation />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Building2 className="h-8 w-8" />
              Business Context
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your business information that the AI should always know and factor into decisions
            </p>
          </div>
          <NewBusinessContextModal />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Contexts</p>
                  <p className="text-2xl font-bold">{totalContexts}</p>
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                  <p className="text-2xl font-bold">{highPriorityCount}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sections</p>
                  <p className="text-2xl font-bold">{Object.keys(contextsBySection).length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contexts by Section */}
        {totalContexts === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Business Context Yet</h3>
              <p className="text-muted-foreground mb-6">
                Add important business information that your AI assistant should always know when making decisions.
              </p>
              <NewBusinessContextModal />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(contextsBySection).map(([section, sectionContexts]) => {
              const Icon = SECTION_ICONS[section as keyof typeof SECTION_ICONS] || Lightbulb;
              return (
                <div key={section}>
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">
                      {section.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h2>
                    <Badge variant="outline">{sectionContexts.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {sectionContexts.map((context) => (
                      <BusinessContextCard key={context.id} context={context} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}