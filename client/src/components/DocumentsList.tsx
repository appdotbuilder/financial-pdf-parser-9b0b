import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import { FileText, Eye, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { Document, Transaction } from '../../../server/src/schema';

interface DocumentsListProps {
  documents: Document[];
  onRefresh: () => void;
  showAll?: boolean;
}

export function DocumentsList({ documents, onRefresh, showAll = false }: DocumentsListProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentTransactions, setDocumentTransactions] = useState<Transaction[]>([]);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  const handleViewTransactions = async (document: Document) => {
    setSelectedDocument(document);
    setIsViewDialogOpen(true);
    setIsLoadingTransactions(true);
    
    try {
      const transactions = await trpc.getDocumentTransactions.query({ documentId: document.id });
      setDocumentTransactions(transactions);
    } catch (error) {
      console.error('Failed to load document transactions:', error);
      setDocumentTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Documents Yet</h3>
          <p className="text-gray-500">
            Upload your first financial PDF to get started! 📄
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {showAll ? 'All Documents' : 'Recent Uploads'} ({documents.length})
        </h3>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Document</TableHead>
                  <TableHead className="font-semibold">Size</TableHead>
                  <TableHead className="font-semibold">Upload Date</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document: Document) => (
                  <TableRow key={document.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium text-gray-900">{document.original_name}</p>
                          <p className="text-sm text-gray-500 font-mono">ID: {document.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatFileSize(document.file_size)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <p>{document.upload_date.toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">{document.upload_date.toLocaleTimeString()}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(document.processing_status)}
                        <Badge className={getStatusColor(document.processing_status)} variant="secondary">
                          {document.processing_status}
                        </Badge>
                      </div>
                      {document.error_message && (
                        <p className="text-xs text-red-600 mt-1" title={document.error_message}>
                          Error: {document.error_message.length > 30 
                            ? `${document.error_message.substring(0, 30)}...` 
                            : document.error_message
                          }
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewTransactions(document)}
                          disabled={document.processing_status === 'pending' || document.processing_status === 'processing'}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Transactions
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Document Transactions Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transactions from: {selectedDocument?.original_name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                <div>
                  <p className="font-medium text-gray-600">File Size</p>
                  <p>{formatFileSize(selectedDocument.file_size)}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Upload Date</p>
                  <p>{selectedDocument.upload_date.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Status</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedDocument.processing_status)}
                    <span>{selectedDocument.processing_status}</span>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Transactions Found</p>
                  <p className="font-semibold text-blue-600">
                    {isLoadingTransactions ? '...' : documentTransactions.length}
                  </p>
                </div>
              </div>

              {isLoadingTransactions ? (
                <div className="text-center py-8">
                  <div className="animate-spin mx-auto w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <p className="mt-2 text-gray-500">Loading transactions...</p>
                </div>
              ) : documentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">
                    {selectedDocument.processing_status === 'completed' 
                      ? 'No transactions were extracted from this document.'
                      : 'This document has not been processed yet or processing failed.'
                    }
                  </p>
                </div>
              ) : (
                <div>
                  <h4 className="font-medium mb-3">Extracted Transactions ({documentTransactions.length})</h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documentTransactions.map((transaction: Transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="text-sm">
                              {transaction.transaction_date.toLocaleDateString()}
                            </TableCell>
                            <TableCell className={`font-medium text-sm ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${Math.abs(transaction.amount).toFixed(2)}
                              {transaction.amount >= 0 ? ' ↑' : ' ↓'}
                            </TableCell>
                            <TableCell className="text-sm max-w-xs truncate">
                              {transaction.description}
                            </TableCell>
                            <TableCell className="text-sm">
                              {transaction.vendor_name || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              <Badge variant="secondary" className="text-xs">
                                {transaction.transaction_type || 'other'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}