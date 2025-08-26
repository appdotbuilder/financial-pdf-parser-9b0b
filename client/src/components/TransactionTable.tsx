import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { Search, Filter, Edit, Trash2, Calendar, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Transaction, SearchTransactionsInput, UpdateTransactionInput } from '../../../server/src/schema';

interface TransactionTableProps {
  transactions: Transaction[];
  totalCount: number;
  currentPage: number;
  isLoading: boolean;
  onSearch: (filters: SearchTransactionsInput) => void;
  onPageChange: (page: number) => void;
  onTransactionUpdated: (transaction: Transaction) => void;
  onTransactionDeleted: (id: number) => void;
}

export function TransactionTable({
  transactions,
  totalCount,
  currentPage,
  isLoading,
  onSearch,
  onPageChange,
  onTransactionUpdated,
  onTransactionDeleted
}: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [transactionType, setTransactionType] = useState<string>('');
  const [sortBy, setSortBy] = useState<'transaction_date' | 'amount' | 'description' | 'vendor_name'>('transaction_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const totalPages = Math.ceil(totalCount / 20);

  const handleSearch = () => {
    const filters: SearchTransactionsInput = {
      search_term: searchTerm || undefined,
      date_from: dateFrom ? new Date(dateFrom) : undefined,
      date_to: dateTo ? new Date(dateTo) : undefined,
      min_amount: minAmount ? parseFloat(minAmount) : undefined,
      max_amount: maxAmount ? parseFloat(maxAmount) : undefined,
      account_number: accountNumber || undefined,
      vendor_name: vendorName || undefined,
      transaction_type: transactionType as any || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      page: 1,
      limit: 20
    };
    onSearch(filters);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
    setAccountNumber('');
    setVendorName('');
    setTransactionType('');
    setSortBy('transaction_date');
    setSortOrder('desc');
    
    const filters: SearchTransactionsInput = {
      page: 1,
      limit: 20,
      sort_by: 'transaction_date',
      sort_order: 'desc'
    };
    onSearch(filters);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handleSaveTransaction = async () => {
    if (!editingTransaction) return;
    
    setIsSaving(true);
    try {
      const updateData: UpdateTransactionInput = {
        id: editingTransaction.id,
        transaction_date: editingTransaction.transaction_date,
        amount: editingTransaction.amount,
        description: editingTransaction.description,
        account_number: editingTransaction.account_number,
        vendor_name: editingTransaction.vendor_name,
        transaction_type: editingTransaction.transaction_type
      };

      const updatedTransaction = await trpc.updateTransaction.mutate(updateData);
      onTransactionUpdated(updatedTransaction);
      setIsEditDialogOpen(false);
      setEditingTransaction(null);
    } catch (error) {
      console.error('Failed to update transaction:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      await trpc.deleteTransaction.mutate({ id });
      onTransactionDeleted(id);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const getTransactionTypeColor = (type: string | null) => {
    switch (type) {
      case 'credit':
        return 'bg-green-100 text-green-800';
      case 'debit':
        return 'bg-red-100 text-red-800';
      case 'transfer':
        return 'bg-blue-100 text-blue-800';
      case 'fee':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search transactions by description or vendor..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button onClick={handleSearch}>
                Search
              </Button>
              <Button onClick={handleClearFilters} variant="outline">
                Clear
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="dateFrom" className="text-xs font-medium">From Date</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo" className="text-xs font-medium">To Date</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="minAmount" className="text-xs font-medium">Min Amount</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    placeholder="0.00"
                    value={minAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinAmount(e.target.value)}
                    step="0.01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxAmount" className="text-xs font-medium">Max Amount</Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    placeholder="0.00"
                    value={maxAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxAmount(e.target.value)}
                    step="0.01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="accountNumber" className="text-xs font-medium">Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Enter account number"
                    value={accountNumber}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccountNumber(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="vendorName" className="text-xs font-medium">Vendor Name</Label>
                  <Input
                    id="vendorName"
                    placeholder="Enter vendor name"
                    value={vendorName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVendorName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="transactionType" className="text-xs font-medium">Transaction Type</Label>
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="debit">Debit</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                      <SelectItem value="fee">Fee</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Sort</Label>
                  <div className="flex gap-2 mt-1">
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transaction_date">Date</SelectItem>
                        <SelectItem value="amount">Amount</SelectItem>
                        <SelectItem value="description">Description</SelectItem>
                        <SelectItem value="vendor_name">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">↑</SelectItem>
                        <SelectItem value="desc">↓</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {totalCount === 0 ? 'No transactions found' : `Showing ${((currentPage - 1) * 20) + 1}-${Math.min(currentPage * 20, totalCount)} of ${totalCount} transactions`}
        </span>
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{transactions.length} on this page</span>
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Amount</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Vendor</TableHead>
                  <TableHead className="font-semibold">Account</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="animate-spin mx-auto w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      <p className="mt-2 text-gray-500">Loading transactions...</p>
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">No transactions found. Try uploading a financial document first! 📊</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction: Transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-gray-50">
                      <TableCell>
                        {transaction.transaction_date.toLocaleDateString()}
                      </TableCell>
                      <TableCell className={`font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${Math.abs(transaction.amount).toFixed(2)}
                        {transaction.amount >= 0 ? ' ↑' : ' ↓'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.description}
                      </TableCell>
                      <TableCell>
                        {transaction.vendor_name || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {transaction.account_number || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={getTransactionTypeColor(transaction.transaction_type)} variant="secondary">
                          {transaction.transaction_type || 'other'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this transaction? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteTransaction(transaction.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
              if (page > totalPages) return null;
              
              return (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editDate">Transaction Date</Label>
                <Input
                  id="editDate"
                  type="date"
                  value={editingTransaction.transaction_date.toISOString().split('T')[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditingTransaction((prev: Transaction | null) => 
                      prev ? { ...prev, transaction_date: new Date(e.target.value) } : null
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="editAmount">Amount</Label>
                <Input
                  id="editAmount"
                  type="number"
                  step="0.01"
                  value={editingTransaction.amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditingTransaction((prev: Transaction | null) => 
                      prev ? { ...prev, amount: parseFloat(e.target.value) || 0 } : null
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editingTransaction.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setEditingTransaction((prev: Transaction | null) => 
                      prev ? { ...prev, description: e.target.value } : null
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="editVendor">Vendor Name</Label>
                <Input
                  id="editVendor"
                  value={editingTransaction.vendor_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditingTransaction((prev: Transaction | null) => 
                      prev ? { ...prev, vendor_name: e.target.value || null } : null
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="editAccount">Account Number</Label>
                <Input
                  id="editAccount"
                  value={editingTransaction.account_number || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditingTransaction((prev: Transaction | null) => 
                      prev ? { ...prev, account_number: e.target.value || null } : null
                    )
                  }
                />
              </div>
              <div>
                <Label htmlFor="editType">Transaction Type</Label>
                <Select
                  value={editingTransaction.transaction_type || 'other'}
                  onValueChange={(value: any) =>
                    setEditingTransaction((prev: Transaction | null) => 
                      prev ? { ...prev, transaction_type: value } : null
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit</SelectItem>
                    <SelectItem value="debit">Debit</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="fee">Fee</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTransaction} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}