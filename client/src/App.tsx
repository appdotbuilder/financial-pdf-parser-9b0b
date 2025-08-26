import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { DocumentUpload } from '@/components/DocumentUpload';
import { TransactionTable } from '@/components/TransactionTable';
import { DocumentsList } from '@/components/DocumentsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Receipt, Database } from 'lucide-react';
// Using type-only imports for better TypeScript compliance
import type { Document, Transaction, PaginatedTransactions, SearchTransactionsInput } from '../../server/src/schema';

function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilters, setSearchFilters] = useState<SearchTransactionsInput>({
    page: 1,
    limit: 20,
    sort_by: 'transaction_date',
    sort_order: 'desc'
  });

  const loadDocuments = useCallback(async () => {
    try {
      const result = await trpc.getDocuments.query();
      setDocuments(result);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  }, []);

  const loadTransactions = useCallback(async (filters: SearchTransactionsInput = searchFilters) => {
    setIsLoading(true);
    try {
      const result: PaginatedTransactions = await trpc.searchTransactions.query(filters);
      setTransactions(result.transactions);
      setTotalTransactions(result.total_count);
      setCurrentPage(result.page);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchFilters]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleDocumentUploaded = async (uploadedDocument: Document) => {
    // Update documents list
    setDocuments((prev: Document[]) => [uploadedDocument, ...prev]);
    
    // Trigger document processing
    try {
      await trpc.processDocument.mutate({ documentId: uploadedDocument.id });
      // Refresh documents to get updated status
      setTimeout(() => {
        loadDocuments();
        loadTransactions(); // Refresh transactions in case new ones were extracted
      }, 1000);
    } catch (error) {
      console.error('Failed to process document:', error);
    }
  };

  const handleSearch = (filters: SearchTransactionsInput) => {
    setSearchFilters(filters);
    loadTransactions(filters);
  };

  const handlePageChange = (page: number) => {
    const newFilters = { ...searchFilters, page };
    setSearchFilters(newFilters);
    loadTransactions(newFilters);
  };

  const handleTransactionUpdated = (updatedTransaction: Transaction) => {
    setTransactions((prev: Transaction[]) =>
      prev.map((t: Transaction) => t.id === updatedTransaction.id ? updatedTransaction : t)
    );
  };

  const handleTransactionDeleted = (deletedId: number) => {
    setTransactions((prev: Transaction[]) => prev.filter((t: Transaction) => t.id !== deletedId));
    setTotalTransactions(prev => prev - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
            <FileText className="h-10 w-10 text-blue-600" />
            Financial Document Parser 💰
          </h1>
          <p className="text-lg text-gray-600">
            Upload your financial PDFs and automatically extract transaction data
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Upload Documents
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              View Transactions
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Document History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Upload Financial Documents
                </CardTitle>
                <CardDescription>
                  Upload PDF files containing financial statements, bank statements, or transaction records.
                  Our system will automatically extract transaction details for you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
              </CardContent>
            </Card>

            {documents.length > 0 && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Recent Uploads</CardTitle>
                  <CardDescription>
                    Recently uploaded documents and their processing status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentsList 
                    documents={documents.slice(0, 5)} 
                    onRefresh={loadDocuments}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-green-600" />
                  Extracted Transactions
                </CardTitle>
                <CardDescription>
                  Search, filter, and manage transactions extracted from your documents.
                  You can edit transaction details or delete incorrect entries.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TransactionTable
                  transactions={transactions}
                  totalCount={totalTransactions}
                  currentPage={currentPage}
                  isLoading={isLoading}
                  onSearch={handleSearch}
                  onPageChange={handlePageChange}
                  onTransactionUpdated={handleTransactionUpdated}
                  onTransactionDeleted={handleTransactionDeleted}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-purple-600" />
                  Document History
                </CardTitle>
                <CardDescription>
                  View all uploaded documents, their processing status, and associated transactions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentsList 
                  documents={documents} 
                  onRefresh={loadDocuments}
                  showAll={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;