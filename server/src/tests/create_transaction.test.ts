import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, documentsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

describe('createTransaction', () => {
  let testDocumentId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test document first (required foreign key)
    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'test-document.pdf',
        original_name: 'test-document.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        processing_status: 'completed'
      })
      .returning()
      .execute();
    
    testDocumentId = documentResult[0].id;
  });

  afterEach(resetDB);

  const baseTransactionInput: CreateTransactionInput = {
    document_id: 0, // Will be set in tests
    transaction_date: new Date('2024-01-15T10:30:00Z'),
    amount: 150.75,
    description: 'Test transaction payment',
    account_number: '1234567890',
    vendor_name: 'Test Vendor LLC',
    transaction_type: 'debit'
  };

  it('should create a transaction with all fields', async () => {
    const input = { ...baseTransactionInput, document_id: testDocumentId };
    
    const result = await createTransaction(input);

    // Basic field validation
    expect(result.document_id).toEqual(testDocumentId);
    expect(result.transaction_date).toEqual(input.transaction_date);
    expect(result.amount).toEqual(150.75);
    expect(typeof result.amount).toBe('number'); // Verify numeric conversion
    expect(result.description).toEqual('Test transaction payment');
    expect(result.account_number).toEqual('1234567890');
    expect(result.vendor_name).toEqual('Test Vendor LLC');
    expect(result.transaction_type).toEqual('debit');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save transaction to database correctly', async () => {
    const input = { ...baseTransactionInput, document_id: testDocumentId };
    
    const result = await createTransaction(input);

    // Query the database to verify the record was saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    const savedTransaction = transactions[0];
    
    expect(savedTransaction.document_id).toEqual(testDocumentId);
    expect(savedTransaction.transaction_date).toEqual(input.transaction_date);
    expect(parseFloat(savedTransaction.amount)).toEqual(150.75); // Stored as string, converted to number
    expect(savedTransaction.description).toEqual('Test transaction payment');
    expect(savedTransaction.account_number).toEqual('1234567890');
    expect(savedTransaction.vendor_name).toEqual('Test Vendor LLC');
    expect(savedTransaction.transaction_type).toEqual('debit');
    expect(savedTransaction.created_at).toBeInstanceOf(Date);
  });

  it('should create transaction with nullable fields as null', async () => {
    const input: CreateTransactionInput = {
      document_id: testDocumentId,
      transaction_date: new Date('2024-01-15T10:30:00Z'),
      amount: 99.99,
      description: 'Transaction with null fields',
      account_number: null,
      vendor_name: null,
      transaction_type: null
    };
    
    const result = await createTransaction(input);

    expect(result.account_number).toBeNull();
    expect(result.vendor_name).toBeNull();
    expect(result.transaction_type).toBeNull();
    expect(result.amount).toEqual(99.99);
    expect(typeof result.amount).toBe('number');
  });

  it('should handle different transaction types correctly', async () => {
    const transactionTypes = ['debit', 'credit', 'transfer', 'fee', 'other'] as const;
    
    for (const type of transactionTypes) {
      const input = {
        ...baseTransactionInput,
        document_id: testDocumentId,
        transaction_type: type,
        description: `Transaction type: ${type}`
      };
      
      const result = await createTransaction(input);
      
      expect(result.transaction_type).toEqual(type);
      expect(result.description).toEqual(`Transaction type: ${type}`);
    }
  });

  it('should handle various amount values correctly', async () => {
    const testAmounts = [0.01, 1.00, 1234.56, 9999.99];
    
    for (const amount of testAmounts) {
      const input = {
        ...baseTransactionInput,
        document_id: testDocumentId,
        amount: amount,
        description: `Amount test: ${amount}`
      };
      
      const result = await createTransaction(input);
      
      expect(result.amount).toEqual(amount);
      expect(typeof result.amount).toBe('number');
    }
  });

  it('should throw error when document_id does not exist', async () => {
    const nonExistentDocumentId = 99999;
    const input = { ...baseTransactionInput, document_id: nonExistentDocumentId };
    
    await expect(createTransaction(input)).rejects.toThrow(/Document with ID 99999 not found/i);
  });

  it('should maintain referential integrity with documents', async () => {
    const input = { ...baseTransactionInput, document_id: testDocumentId };
    
    const result = await createTransaction(input);

    // Verify the transaction is linked to the correct document
    const transactionsWithDocuments = await db.select()
      .from(transactionsTable)
      .innerJoin(documentsTable, eq(transactionsTable.document_id, documentsTable.id))
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactionsWithDocuments).toHaveLength(1);
    expect(transactionsWithDocuments[0].documents.filename).toEqual('test-document.pdf');
    expect(transactionsWithDocuments[0].transactions.id).toEqual(result.id);
  });
});