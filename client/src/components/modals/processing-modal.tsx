import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface ProcessingModalProps {
  isOpen: boolean;
  filename?: string;
  progress?: number;
}

export default function ProcessingModal({ isOpen, filename, progress = 60 }: ProcessingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center py-4">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Document</h3>
          <p className="text-sm text-gray-600 mb-4">
            AI is analyzing {filename || 'your document'} and generating insights...
          </p>
          <div className="mt-4">
            <Progress value={progress} className="w-full" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
