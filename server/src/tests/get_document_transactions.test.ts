import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable, transactionsTable } from '../db/schema';
import { getDocumentTransactions } from '../handlers/get_document_transactions';

describe('getDocumentTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return transactions for a document in chronological order', async () => {
    // Create a test document
    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'test-doc.pdf',
        original_name: 'test-document.pdf',
        file_size: 12345,
        mime_type: 'application/pdf',
        processing_status: 'completed'
      })
      .returning()
      .execute();

    const documentId = documentResult[0].id;

    // Create test transactions with different dates (out of chronological order)
    await db.insert(transactionsTable)
      .values([
        {
          document_id: documentId,
          transaction_date: new Date('2024-01-15'),
          amount: '100.50',
          description: 'Third transaction',
          account_number: '12345',
          vendor_name: 'Vendor C',
          transaction_type: 'debit'
        },
        {
          document_id: documentId,
          transaction_date: new Date('2024-01-10'),
          amount: '50.25',
          description: 'First transaction',
          account_number: '12345',
          vendor_name: 'Vendor A',
          transaction_type: 'credit'
        },
        {
          document_id: documentId,
          transaction_date: new Date('2024-01-12'),
          amount: '75.00',
          description: 'Second transaction',
          account_number: '12345',
          vendor_name: 'Vendor B',
          transaction_type: 'transfer'
        }
      ])
      .execute();

    const result = await getDocumentTransactions(documentId);

    // Should return 3 transactions
    expect(result).toHaveLength(3);

    // Should be ordered by transaction_date ascending (chronological)
    expect(result[0].description).toEqual('First transaction');
    expect(result[0].transaction_date).toEqual(new Date('2024-01-10'));
    expect(result[0].amount).toEqual(50.25);
    expect(typeof result[0].amount).toEqual('number');

    expect(result[1].description).toEqual('Second transaction');
    expect(result[1].transaction_date).toEqual(new Date('2024-01-12'));
    expect(result[1].amount).toEqual(75.00);

    expect(result[2].description).toEqual('Third transaction');
    expect(result[2].transaction_date).toEqual(new Date('2024-01-15'));
    expect(result[2].amount).toEqual(100.50);

    // Verify all transactions belong to the correct document
    result.forEach(transaction => {
      expect(transaction.document_id).toEqual(documentId);
      expect(transaction.id).toBeDefined();
      expect(transaction.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for document with no transactions', async () => {
    // Create a test document
    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'empty-doc.pdf',
        original_name: 'empty-document.pdf',
        file_size: 5000,
        mime_type: 'application/pdf',
        processing_status: 'completed'
      })
      .returning()
      .execute();

    const documentId = documentResult[0].id;

    const result = await getDocumentTransactions(documentId);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle transactions with nullable fields correctly', async () => {
    // Create a test document
    const documentResult = await db.insert(documentsTable)
      .values({
        filename: 'nullable-test.pdf',
        original_name: 'nullable-test.pdf',
        file_size: 8000,
        mime_type: 'application/pdf',
        processing_status: 'completed'
      })
      .returning()
      .execute();

    const documentId = documentResult[0].id;

    // Create transaction with nullable fields set to null
    await db.insert(transactionsTable)
      .values({
        document_id: documentId,
        transaction_date: new Date('2024-01-20'),
        amount: '25.75',
        description: 'Transaction with nulls',
        account_number: null,
        vendor_name: null,
        transaction_type: null
      })
      .execute();

    const result = await getDocumentTransactions(documentId);

    expect(result).toHaveLength(1);
    expect(result[0].description).toEqual('Transaction with nulls');
    expect(result[0].amount).toEqual(25.75);
    expect(result[0].account_number).toBeNull();
    expect(result[0].vendor_name).toBeNull();
    expect(result[0].transaction_type).toBeNull();
  });

  it('should throw error for non-existent document', async () => {
    const nonExistentDocumentId = 99999;

    await expect(getDocumentTransactions(nonExistentDocumentId))
      .rejects
      .toThrow(/Document with ID 99999 not found/i);
  });

  it('should only return transactions for the specified document', async () => {
    // Create two test documents
    const [doc1, doc2] = await db.insert(documentsTable)
      .values([
        {
          filename: 'doc1.pdf',
          original_name: 'document1.pdf',
          file_size: 10000,
          mime_type: 'application/pdf',
          processing_status: 'completed'
        },
        {
          filename: 'doc2.pdf',
          original_name: 'document2.pdf',
          file_size: 15000,
          mime_type: 'application/pdf',
          processing_status: 'completed'
        }
      ])
      .returning()
      .execute();

    // Create transactions for both documents
    await db.insert(transactionsTable)
      .values([
        {
          document_id: doc1.id,
          transaction_date: new Date('2024-01-10'),
          amount: '100.00',
          description: 'Doc1 transaction',
          account_number: '111',
          vendor_name: 'Vendor 1',
          transaction_type: 'debit'
        },
        {
          document_id: doc2.id,
          transaction_date: new Date('2024-01-11'),
          amount: '200.00',
          description: 'Doc2 transaction',
          account_number: '222',
          vendor_name: 'Vendor 2',
          transaction_type: 'credit'
        }
      ])
      .execute();

    // Get transactions for document 1
    const result1 = await getDocumentTransactions(doc1.id);
    expect(result1).toHaveLength(1);
    expect(result1[0].description).toEqual('Doc1 transaction');
    expect(result1[0].document_id).toEqual(doc1.id);

    // Get transactions for document 2
    const result2 = await getDocumentTransactions(doc2.id);
    expect(result2).toHaveLength(1);
    expect(result2[0].description).toEqual('Doc2 transaction');
    expect(result2[0].document_id).toEqual(doc2.id);
  });
});