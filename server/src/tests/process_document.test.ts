import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable, transactionsTable } from '../db/schema';
import { processDocument } from '../handlers/process_document';
import { eq } from 'drizzle-orm';

// Test document data
const testDocument = {
  filename: 'test-document.pdf',
  original_name: 'Bank Statement.pdf',
  file_size: 1024000,
  mime_type: 'application/pdf'
};

const emptyDocument = {
  filename: 'empty-document.pdf',
  original_name: 'Empty Statement.pdf',
  file_size: 512000,
  mime_type: 'application/pdf'
};

const errorDocument = {
  filename: 'error-document.pdf',
  original_name: 'Corrupted Statement.pdf',
  file_size: 256000,
  mime_type: 'application/pdf'
};

describe('processDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should process document and extract transactions', async () => {
    // Create test document
    const documentResult = await db.insert(documentsTable)
      .values(testDocument)
      .returning()
      .execute();
    
    const documentId = documentResult[0].id;

    // Process the document
    const transactions = await processDocument(documentId);

    // Verify transactions were extracted
    expect(transactions).toHaveLength(2);
    
    // Verify first transaction
    expect(transactions[0].document_id).toEqual(documentId);
    expect(transactions[0].transaction_date).toBeInstanceOf(Date);
    expect(transactions[0].amount).toEqual(-150.75);
    expect(typeof transactions[0].amount).toEqual('number');
    expect(transactions[0].description).toEqual('ATM Withdrawal');
    expect(transactions[0].account_number).toEqual('****1234');
    expect(transactions[0].vendor_name).toEqual('Chase ATM');
    expect(transactions[0].transaction_type).toEqual('debit');
    expect(transactions[0].created_at).toBeInstanceOf(Date);

    // Verify second transaction
    expect(transactions[1].document_id).toEqual(documentId);
    expect(transactions[1].amount).toEqual(2500.00);
    expect(typeof transactions[1].amount).toEqual('number');
    expect(transactions[1].description).toEqual('Direct Deposit Salary');
    expect(transactions[1].vendor_name).toEqual('ACME Corp');
    expect(transactions[1].transaction_type).toEqual('credit');
  });

  it('should save transactions to database', async () => {
    // Create test document
    const documentResult = await db.insert(documentsTable)
      .values(testDocument)
      .returning()
      .execute();
    
    const documentId = documentResult[0].id;

    // Process the document
    await processDocument(documentId);

    // Verify transactions were saved to database
    const savedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.document_id, documentId))
      .execute();

    expect(savedTransactions).toHaveLength(2);
    
    // Verify database storage (amounts stored as strings)
    expect(savedTransactions[0].amount).toEqual('-150.75');
    expect(savedTransactions[1].amount).toEqual('2500.00');
    
    // Verify other fields
    expect(savedTransactions[0].description).toEqual('ATM Withdrawal');
    expect(savedTransactions[1].description).toEqual('Direct Deposit Salary');
  });

  it('should update document status to completed', async () => {
    // Create test document
    const documentResult = await db.insert(documentsTable)
      .values({ ...testDocument, processing_status: 'pending' })
      .returning()
      .execute();
    
    const documentId = documentResult[0].id;

    // Process the document
    await processDocument(documentId);

    // Verify document status was updated
    const updatedDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    expect(updatedDocuments[0].processing_status).toEqual('completed');
    expect(updatedDocuments[0].error_message).toBeNull();
  });

  it('should handle document with no transactions', async () => {
    // Create empty document
    const documentResult = await db.insert(documentsTable)
      .values(emptyDocument)
      .returning()
      .execute();
    
    const documentId = documentResult[0].id;

    // Process the document
    const transactions = await processDocument(documentId);

    // Verify no transactions were extracted
    expect(transactions).toHaveLength(0);

    // Verify document status is still completed
    const updatedDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    expect(updatedDocuments[0].processing_status).toEqual('completed');
  });

  it('should handle processing errors and update document status', async () => {
    // Create error document
    const documentResult = await db.insert(documentsTable)
      .values(errorDocument)
      .returning()
      .execute();
    
    const documentId = documentResult[0].id;

    // Process should throw error
    await expect(processDocument(documentId)).rejects.toThrow(/PDF parsing failed/i);

    // Verify document status was updated to failed
    const updatedDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    expect(updatedDocuments[0].processing_status).toEqual('failed');
    expect(updatedDocuments[0].error_message).toContain('PDF parsing failed');
  });

  it('should handle non-existent document', async () => {
    const nonExistentId = 99999;

    // Process should throw error
    await expect(processDocument(nonExistentId)).rejects.toThrow(/Document with ID 99999 not found/i);
  });

  it('should update document status to processing during execution', async () => {
    // Create test document with pending status
    const documentResult = await db.insert(documentsTable)
      .values({ ...testDocument, processing_status: 'pending' })
      .returning()
      .execute();
    
    const documentId = documentResult[0].id;

    // Start processing (this will set status to 'processing')
    const processPromise = processDocument(documentId);

    // Give a brief moment for the status update
    await new Promise(resolve => setTimeout(resolve, 50));

    // Check that status was updated to processing
    const processingDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    expect(processingDocuments[0].processing_status).toEqual('processing');

    // Wait for processing to complete
    await processPromise;

    // Verify final status is completed
    const completedDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    expect(completedDocuments[0].processing_status).toEqual('completed');
  });

  it('should handle database constraint violations', async () => {
    // Create test document
    const documentResult = await db.insert(documentsTable)
      .values(testDocument)
      .returning()
      .execute();
    
    const documentId = documentResult[0].id;

    // Delete the document to simulate foreign key constraint violation
    await db.delete(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    // Processing should fail due to missing document
    await expect(processDocument(documentId)).rejects.toThrow();
  });
});