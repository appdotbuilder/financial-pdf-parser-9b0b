import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable, transactionsTable } from '../db/schema';
import { deleteTransaction } from '../handlers/delete_transaction';
import { eq } from 'drizzle-orm';

// Test data setup
const testDocument = {
  filename: 'test-statement.pdf',
  original_name: 'Statement_2023.pdf',
  file_size: 102400,
  mime_type: 'application/pdf',
  processing_status: 'completed' as const,
  error_message: null
};

const testTransaction = {
  transaction_date: new Date('2023-12-01'),
  amount: '150.75',
  description: 'Payment to vendor',
  account_number: '1234567890',
  vendor_name: 'Test Vendor',
  transaction_type: 'debit' as const
};

describe('deleteTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete an existing transaction', async () => {
    // Create prerequisite document
    const documentResult = await db.insert(documentsTable)
      .values(testDocument)
      .returning()
      .execute();
    const document = documentResult[0];

    // Create transaction to delete
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        document_id: document.id
      })
      .returning()
      .execute();
    const transaction = transactionResult[0];

    // Delete the transaction
    const result = await deleteTransaction(transaction.id);

    // Verify success response
    expect(result.success).toBe(true);

    // Verify transaction was actually deleted from database
    const deletedTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction.id))
      .execute();

    expect(deletedTransaction).toHaveLength(0);
  });

  it('should throw error when trying to delete non-existent transaction', async () => {
    const nonExistentId = 999999;

    // Attempt to delete non-existent transaction
    await expect(deleteTransaction(nonExistentId))
      .rejects
      .toThrow(/Transaction with id 999999 not found/i);
  });

  it('should not affect other transactions when deleting one', async () => {
    // Create prerequisite document
    const documentResult = await db.insert(documentsTable)
      .values(testDocument)
      .returning()
      .execute();
    const document = documentResult[0];

    // Create multiple transactions
    const transaction1Result = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        document_id: document.id,
        description: 'First transaction'
      })
      .returning()
      .execute();

    const transaction2Result = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        document_id: document.id,
        description: 'Second transaction',
        amount: '200.00'
      })
      .returning()
      .execute();

    const transaction1 = transaction1Result[0];
    const transaction2 = transaction2Result[0];

    // Delete only the first transaction
    const result = await deleteTransaction(transaction1.id);

    expect(result.success).toBe(true);

    // Verify first transaction is deleted
    const deletedTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction1.id))
      .execute();

    expect(deletedTransaction).toHaveLength(0);

    // Verify second transaction still exists
    const remainingTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction2.id))
      .execute();

    expect(remainingTransaction).toHaveLength(1);
    expect(remainingTransaction[0].description).toEqual('Second transaction');
  });

  it('should handle deletion when document still exists', async () => {
    // Create prerequisite document
    const documentResult = await db.insert(documentsTable)
      .values(testDocument)
      .returning()
      .execute();
    const document = documentResult[0];

    // Create transaction linked to document
    const transactionResult = await db.insert(transactionsTable)
      .values({
        ...testTransaction,
        document_id: document.id
      })
      .returning()
      .execute();
    const transaction = transactionResult[0];

    // Delete the transaction
    const result = await deleteTransaction(transaction.id);

    expect(result.success).toBe(true);

    // Verify transaction is deleted
    const deletedTransaction = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction.id))
      .execute();

    expect(deletedTransaction).toHaveLength(0);

    // Verify document still exists (not affected by transaction deletion)
    const existingDocument = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, document.id))
      .execute();

    expect(existingDocument).toHaveLength(1);
    expect(existingDocument[0].filename).toEqual('test-statement.pdf');
  });
});