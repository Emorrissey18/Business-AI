import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, File, FileType, ChevronRight, Trash2 } from "lucide-react";
import { Document } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface DocumentListProps {
  title?: string;
  showViewAll?: boolean;
  limit?: number;
}

export default function DocumentList({ title = "Recent Documents", showViewAll = true, limit }: DocumentListProps) {
  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const getFileIcon = (mimeType: string) => {
    switch (mimeType) {
      case 'application/pdf':
        return <File className="text-red-600" />;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return <FileType className="text-blue-600" />;
      default:
        return <FileText className="text-green-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success';
      case 'processing':
        return 'bg-warning';
      case 'error':
        return 'bg-error';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Processed';
      case 'processing':
        return 'Processing';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mt-1"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayDocuments = limit ? documents?.slice(0, limit) : documents;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center">
            <FileText className="text-primary mr-2" />
            {title}
          </h2>
          {showViewAll && (
            <Button variant="ghost" size="sm" className="text-primary hover:text-blue-700">
              View All
            </Button>
          )}
        </div>
        
        {!documents || documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No documents uploaded yet</p>
            <p className="text-sm text-gray-400">Upload your first document to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayDocuments?.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    {getFileIcon(doc.mimeType)}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{doc.originalName}</h3>
                    <p className="text-sm text-gray-500">
                      Uploaded {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    className={cn(
                      "status-badge text-white",
                      getStatusColor(doc.status)
                    )}
                  >
                    {getStatusLabel(doc.status)}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
