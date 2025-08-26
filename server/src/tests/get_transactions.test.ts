import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable, transactionsTable } from '../db/schema';
import { getTransactions } from '../handlers/get_transactions';

describe('getTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return an empty array when no transactions exist', async () => {
    const result = await getTransactions();
    expect(result).toEqual([]);
  });

  it('should fetch all transactions ordered by transaction_date descending', async () => {
    // Create a test document first (required for foreign key)
    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'test-doc.pdf',
        original_name: 'test-document.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        processing_status: 'completed'
      })
      .returning()
      .execute();

    const documentId = documentResult[0].id;

    // Create test transactions with different dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    await db.insert(transactionsTable)
      .values([
        {
          document_id: documentId,
          transaction_date: yesterday,
          amount: '25.50', // Store as string for numeric column
          description: 'Coffee shop purchase',
          account_number: '1234567890',
          vendor_name: 'Starbucks',
          transaction_type: 'debit'
        },
        {
          document_id: documentId,
          transaction_date: today,
          amount: '100.00', // Store as string for numeric column
          description: 'ATM withdrawal',
          account_number: '1234567890',
          vendor_name: null,
          transaction_type: 'debit'
        },
        {
          document_id: documentId,
          transaction_date: twoDaysAgo,
          amount: '1500.75', // Store as string for numeric column
          description: 'Salary deposit',
          account_number: '1234567890',
          vendor_name: 'Company Inc',
          transaction_type: 'credit'
        }
      ])
      .execute();

    const result = await getTransactions();

    // Should return 3 transactions
    expect(result).toHaveLength(3);

    // Should be ordered by transaction_date descending (most recent first)
    expect(result[0].description).toEqual('ATM withdrawal'); // today
    expect(result[1].description).toEqual('Coffee shop purchase'); // yesterday
    expect(result[2].description).toEqual('Salary deposit'); // two days ago

    // Verify date ordering
    expect(result[0].transaction_date >= result[1].transaction_date).toBe(true);
    expect(result[1].transaction_date >= result[2].transaction_date).toBe(true);
  });

  it('should convert numeric amounts correctly', async () => {
    // Create a test document
    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'test-doc.pdf',
        original_name: 'test-document.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        processing_status: 'completed'
      })
      .returning()
      .execute();

    // Create transaction with decimal amount
    await db.insert(transactionsTable)
      .values({
        document_id: documentResult[0].id,
        transaction_date: new Date(),
        amount: '123.45', // Store as string for numeric column
        description: 'Test transaction',
        account_number: '1234567890',
        vendor_name: 'Test Vendor',
        transaction_type: 'debit'
      })
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(1);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].amount).toEqual(123.45);
    expect(result[0].description).toEqual('Test transaction');
    expect(result[0].account_number).toEqual('1234567890');
    expect(result[0].vendor_name).toEqual('Test Vendor');
    expect(result[0].transaction_type).toEqual('debit');
  });

  it('should handle transactions with nullable fields', async () => {
    // Create a test document
    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'test-doc.pdf',
        original_name: 'test-document.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        processing_status: 'completed'
      })
      .returning()
      .execute();

    // Create transaction with null values for nullable fields
    await db.insert(transactionsTable)
      .values({
        document_id: documentResult[0].id,
        transaction_date: new Date(),
        amount: '50.00',
        description: 'Transaction with nulls',
        account_number: null,
        vendor_name: null,
        transaction_type: null
      })
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(1);
    expect(result[0].account_number).toBeNull();
    expect(result[0].vendor_name).toBeNull();
    expect(result[0].transaction_type).toBeNull();
    expect(result[0].amount).toEqual(50.00);
    expect(result[0].description).toEqual('Transaction with nulls');
  });

  it('should include all required transaction fields', async () => {
    // Create a test document
    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'test-doc.pdf',
        original_name: 'test-document.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        processing_status: 'completed'
      })
      .returning()
      .execute();

    // Create a complete transaction
    await db.insert(transactionsTable)
      .values({
        document_id: documentResult[0].id,
        transaction_date: new Date(),
        amount: '99.99',
        description: 'Complete transaction',
        account_number: '9876543210',
        vendor_name: 'Test Store',
        transaction_type: 'credit'
      })
      .execute();

    const result = await getTransactions();

    expect(result).toHaveLength(1);
    const transaction = result[0];
    
    // Verify all required fields are present
    expect(transaction.id).toBeDefined();
    expect(transaction.document_id).toBeDefined();
    expect(transaction.transaction_date).toBeInstanceOf(Date);
    expect(transaction.amount).toBeDefined();
    expect(transaction.description).toBeDefined();
    expect(transaction.created_at).toBeInstanceOf(Date);
    
    // Verify field values
    expect(transaction.document_id).toEqual(documentResult[0].id);
    expect(transaction.amount).toEqual(99.99);
    expect(transaction.description).toEqual('Complete transaction');
    expect(transaction.account_number).toEqual('9876543210');
    expect(transaction.vendor_name).toEqual('Test Store');
    expect(transaction.transaction_type).toEqual('credit');
  });
});