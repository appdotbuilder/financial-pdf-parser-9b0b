import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums for type safety
export const processingStatusEnum = pgEnum('processing_status', ['pending', 'processing', 'completed', 'failed']);
export const transactionTypeEnum = pgEnum('transaction_type', ['debit', 'credit', 'transfer', 'fee', 'other']);

// Documents table for uploaded PDF files
export const documentsTable = pgTable('documents', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(), // Generated filename for storage
  original_name: text('original_name').notNull(), // Original uploaded filename
  file_size: integer('file_size').notNull(), // File size in bytes
  mime_type: text('mime_type').notNull(), // Should be 'application/pdf'
  upload_date: timestamp('upload_date').defaultNow().notNull(),
  processing_status: processingStatusEnum('processing_status').default('pending').notNull(),
  error_message: text('error_message'), // Nullable error message if processing fails
});

// Transactions table for extracted financial data
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  document_id: integer('document_id').notNull().references(() => documentsTable.id, { onDelete: 'cascade' }),
  transaction_date: timestamp('transaction_date').notNull(), // Date of the transaction
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), // Monetary amount with precision
  description: text('description').notNull(), // Transaction description
  account_number: text('account_number'), // Nullable account number
  vendor_name: text('vendor_name'), // Nullable vendor/merchant name
  transaction_type: transactionTypeEnum('transaction_type'), // Nullable transaction type
  created_at: timestamp('created_at').defaultNow().notNull(), // When the transaction was extracted
});

// Define relations for proper query building
export const documentsRelations = relations(documentsTable, ({ many }) => ({
  transactions: many(transactionsTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  document: one(documentsTable, {
    fields: [transactionsTable.document_id],
    references: [documentsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Document = typeof documentsTable.$inferSelect; // For SELECT operations
export type NewDocument = typeof documentsTable.$inferInsert; // For INSERT operations

export type Transaction = typeof transactionsTable.$inferSelect; // For SELECT operations
export type NewTransaction = typeof transactionsTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { 
  documents: documentsTable, 
  transactions: transactionsTable 
};

export const tableRelations = {
  documentsRelations,
  transactionsRelations
};