import { z } from 'zod';

// Document upload schema
export const documentSchema = z.object({
  id: z.number(),
  filename: z.string(),
  original_name: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  upload_date: z.coerce.date(),
  processing_status: z.enum(['pending', 'processing', 'completed', 'failed']),
  error_message: z.string().nullable()
});

export type Document = z.infer<typeof documentSchema>;

// Transaction schema extracted from documents
export const transactionSchema = z.object({
  id: z.number(),
  document_id: z.number(),
  transaction_date: z.coerce.date(),
  amount: z.number(), // Using number for monetary values
  description: z.string(),
  account_number: z.string().nullable(),
  vendor_name: z.string().nullable(),
  transaction_type: z.enum(['debit', 'credit', 'transfer', 'fee', 'other']).nullable(),
  created_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Input schema for document upload
export const uploadDocumentInputSchema = z.object({
  filename: z.string(),
  original_name: z.string(),
  file_size: z.number().positive(),
  mime_type: z.string().refine(
    (type) => type === 'application/pdf',
    { message: 'Only PDF files are allowed' }
  )
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentInputSchema>;

// Input schema for updating document processing status
export const updateDocumentStatusInputSchema = z.object({
  id: z.number(),
  processing_status: z.enum(['pending', 'processing', 'completed', 'failed']),
  error_message: z.string().nullable().optional()
});

export type UpdateDocumentStatusInput = z.infer<typeof updateDocumentStatusInputSchema>;

// Input schema for creating transactions from PDF parsing
export const createTransactionInputSchema = z.object({
  document_id: z.number(),
  transaction_date: z.coerce.date(),
  amount: z.number(),
  description: z.string(),
  account_number: z.string().nullable(),
  vendor_name: z.string().nullable(),
  transaction_type: z.enum(['debit', 'credit', 'transfer', 'fee', 'other']).nullable()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Input schema for searching and filtering transactions
export const searchTransactionsInputSchema = z.object({
  search_term: z.string().optional(), // Search in description, vendor_name
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  min_amount: z.number().optional(),
  max_amount: z.number().optional(),
  account_number: z.string().optional(),
  vendor_name: z.string().optional(),
  transaction_type: z.enum(['debit', 'credit', 'transfer', 'fee', 'other']).optional(),
  sort_by: z.enum(['transaction_date', 'amount', 'description', 'vendor_name']).default('transaction_date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
});

export type SearchTransactionsInput = z.infer<typeof searchTransactionsInputSchema>;

// Response schema for paginated transactions
export const paginatedTransactionsSchema = z.object({
  transactions: z.array(transactionSchema),
  total_count: z.number(),
  page: z.number(),
  limit: z.number(),
  total_pages: z.number()
});

export type PaginatedTransactions = z.infer<typeof paginatedTransactionsSchema>;

// Input schema for updating transaction details
export const updateTransactionInputSchema = z.object({
  id: z.number(),
  transaction_date: z.coerce.date().optional(),
  amount: z.number().optional(),
  description: z.string().optional(),
  account_number: z.string().nullable().optional(),
  vendor_name: z.string().nullable().optional(),
  transaction_type: z.enum(['debit', 'credit', 'transfer', 'fee', 'other']).nullable().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;