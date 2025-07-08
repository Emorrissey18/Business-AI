import Navigation from "@/components/navigation";
import FileUpload from "@/components/file-upload";
import DocumentList from "@/components/document-list";

export default function Documents() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Navigation />
      
      <div className="space-y-6">
        <FileUpload />
        <DocumentList 
          title="All Documents" 
          showViewAll={false}
        />
      </div>
    </div>
  );
}
