import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import type { Document, UploadDocumentInput } from '../../../server/src/schema';

interface DocumentUploadProps {
  onDocumentUploaded: (document: Document) => void;
}

export function DocumentUpload({ onDocumentUploaded }: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setUploadStatus('error');
      setErrorMessage('Please upload a PDF file only.');
      return;
    }

    // Validate file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus('error');
      setErrorMessage('File size must be less than 10MB.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const uploadData: UploadDocumentInput = {
        filename: file.name,
        original_name: file.name,
        file_size: file.size,
        mime_type: file.type
      };

      const result = await trpc.uploadDocument.mutate(uploadData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('success');
      
      onDocumentUploaded(result);
      
      // Reset after success
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress(0);
      }, 2000);

    } catch (error) {
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Card 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : isUploading 
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <CardContent className="p-8 text-center">
          <input 
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
          
          {uploadStatus === 'idle' && (
            <>
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-700">
                  {dragOver ? 'Drop your PDF here! 📄' : 'Upload your financial PDF 💼'}
                </p>
                <p className="text-sm text-gray-500">
                  Drag & drop your PDF file here, or click to browse
                </p>
                <p className="text-xs text-gray-400">
                  Supports PDF files up to 10MB
                </p>
              </div>
              <Button variant="outline" className="mt-4" disabled={isUploading}>
                <FileText className="h-4 w-4 mr-2" />
                Browse Files
              </Button>
            </>
          )}

          {uploadStatus === 'uploading' && (
            <div className="space-y-4">
              <Upload className="h-12 w-12 text-blue-500 mx-auto animate-pulse" />
              <div>
                <p className="text-lg font-medium text-blue-600 mb-2">
                  Uploading document... 📤
                </p>
                <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                <p className="text-sm text-gray-500 mt-2">{uploadProgress}% complete</p>
              </div>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-lg font-medium text-green-600">
                Upload successful! ✅
              </p>
              <p className="text-sm text-gray-600">
                Your document is being processed for transaction extraction.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {uploadStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {uploadStatus === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Document uploaded successfully! Check the "View Transactions" tab in a few moments to see extracted data.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}