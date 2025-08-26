import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type UpdateDocumentStatusInput } from '../schema';
import { updateDocumentStatus } from '../handlers/update_document_status';
import { eq } from 'drizzle-orm';

describe('updateDocumentStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test document
  const createTestDocument = async () => {
    const result = await db.insert(documentsTable)
      .values({
        filename: 'test_document.pdf',
        original_name: 'Original Document.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf',
        processing_status: 'pending',
        error_message: null
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should update document status from pending to processing', async () => {
    const testDoc = await createTestDocument();
    
    const input: UpdateDocumentStatusInput = {
      id: testDoc.id,
      processing_status: 'processing'
    };

    const result = await updateDocumentStatus(input);

    expect(result.id).toEqual(testDoc.id);
    expect(result.processing_status).toEqual('processing');
    expect(result.error_message).toBeNull();
    expect(result.filename).toEqual('test_document.pdf');
    expect(result.original_name).toEqual('Original Document.pdf');
    expect(result.upload_date).toBeInstanceOf(Date);
  });

  it('should update document status to completed and clear error message', async () => {
    // Create document with failed status and error message
    const testDoc = await db.insert(documentsTable)
      .values({
        filename: 'failed_document.pdf',
        original_name: 'Failed Document.pdf',
        file_size: 2048000,
        mime_type: 'application/pdf',
        processing_status: 'failed',
        error_message: 'Previous processing error'
      })
      .returning()
      .execute();

    const input: UpdateDocumentStatusInput = {
      id: testDoc[0].id,
      processing_status: 'completed'
    };

    const result = await updateDocumentStatus(input);

    expect(result.processing_status).toEqual('completed');
    expect(result.error_message).toBeNull(); // Should be cleared
  });

  it('should update document status to failed and set error message', async () => {
    const testDoc = await createTestDocument();
    
    const input: UpdateDocumentStatusInput = {
      id: testDoc.id,
      processing_status: 'failed',
      error_message: 'PDF parsing failed: Invalid format'
    };

    const result = await updateDocumentStatus(input);

    expect(result.processing_status).toEqual('failed');
    expect(result.error_message).toEqual('PDF parsing failed: Invalid format');
  });

  it('should update status to failed without changing existing error message if not provided', async () => {
    // Create document with existing error message
    const testDoc = await db.insert(documentsTable)
      .values({
        filename: 'error_document.pdf',
        original_name: 'Error Document.pdf',
        file_size: 512000,
        mime_type: 'application/pdf',
        processing_status: 'processing',
        error_message: 'Existing error message'
      })
      .returning()
      .execute();

    const input: UpdateDocumentStatusInput = {
      id: testDoc[0].id,
      processing_status: 'failed'
      // No error_message provided
    };

    const result = await updateDocumentStatus(input);

    expect(result.processing_status).toEqual('failed');
    expect(result.error_message).toEqual('Existing error message'); // Should preserve existing
  });

  it('should save updated status to database', async () => {
    const testDoc = await createTestDocument();
    
    const input: UpdateDocumentStatusInput = {
      id: testDoc.id,
      processing_status: 'completed'
    };

    await updateDocumentStatus(input);

    // Verify in database
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, testDoc.id))
      .execute();

    expect(documents).toHaveLength(1);
    expect(documents[0].processing_status).toEqual('completed');
    expect(documents[0].error_message).toBeNull();
  });

  it('should handle all processing status transitions', async () => {
    const testDoc = await createTestDocument();

    // Test pending -> processing
    await updateDocumentStatus({
      id: testDoc.id,
      processing_status: 'processing'
    });

    let result = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, testDoc.id))
      .execute();
    expect(result[0].processing_status).toEqual('processing');

    // Test processing -> completed
    await updateDocumentStatus({
      id: testDoc.id,
      processing_status: 'completed'
    });

    result = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, testDoc.id))
      .execute();
    expect(result[0].processing_status).toEqual('completed');
    expect(result[0].error_message).toBeNull();
  });

  it('should throw error when document does not exist', async () => {
    const input: UpdateDocumentStatusInput = {
      id: 99999,
      processing_status: 'completed'
    };

    await expect(updateDocumentStatus(input)).rejects.toThrow(/Document with id 99999 not found/i);
  });

  it('should update error message explicitly when provided for failed status', async () => {
    const testDoc = await createTestDocument();
    
    const input: UpdateDocumentStatusInput = {
      id: testDoc.id,
      processing_status: 'failed',
      error_message: 'Specific processing error occurred'
    };

    const result = await updateDocumentStatus(input);

    expect(result.processing_status).toEqual('failed');
    expect(result.error_message).toEqual('Specific processing error occurred');

    // Verify in database
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, testDoc.id))
      .execute();

    expect(documents[0].error_message).toEqual('Specific processing error occurred');
  });

  it('should clear error message when status changes from failed to processing', async () => {
    // Create document with failed status and error
    const testDoc = await db.insert(documentsTable)
      .values({
        filename: 'retry_document.pdf',
        original_name: 'Retry Document.pdf',
        file_size: 1536000,
        mime_type: 'application/pdf',
        processing_status: 'failed',
        error_message: 'Initial processing failed'
      })
      .returning()
      .execute();

    const input: UpdateDocumentStatusInput = {
      id: testDoc[0].id,
      processing_status: 'processing'
    };

    const result = await updateDocumentStatus(input);

    expect(result.processing_status).toEqual('processing');
    expect(result.error_message).toBeNull(); // Should be cleared when retrying
  });
});