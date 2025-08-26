import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { getDocuments } from '../handlers/get_documents';

describe('getDocuments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no documents exist', async () => {
    const result = await getDocuments();

    expect(result).toEqual([]);
  });

  it('should return all documents ordered by upload_date descending', async () => {
    // Create test documents with different upload dates
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Insert documents in random order
    await db.insert(documentsTable).values([
      {
        filename: 'doc1.pdf',
        original_name: 'First Document.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        upload_date: yesterday,
        processing_status: 'completed',
        error_message: null
      },
      {
        filename: 'doc3.pdf',
        original_name: 'Third Document.pdf',
        file_size: 3072,
        mime_type: 'application/pdf',
        upload_date: tomorrow,
        processing_status: 'pending',
        error_message: null
      },
      {
        filename: 'doc2.pdf',
        original_name: 'Second Document.pdf',
        file_size: 2048,
        mime_type: 'application/pdf',
        upload_date: now,
        processing_status: 'processing',
        error_message: null
      }
    ]).execute();

    const result = await getDocuments();

    expect(result).toHaveLength(3);
    
    // Should be ordered by upload_date descending (newest first)
    expect(result[0].original_name).toEqual('Third Document.pdf');
    expect(result[1].original_name).toEqual('Second Document.pdf');
    expect(result[2].original_name).toEqual('First Document.pdf');

    // Verify all fields are properly returned
    expect(result[0].id).toBeDefined();
    expect(result[0].filename).toEqual('doc3.pdf');
    expect(result[0].file_size).toEqual(3072);
    expect(result[0].mime_type).toEqual('application/pdf');
    expect(result[0].upload_date).toBeInstanceOf(Date);
    expect(result[0].processing_status).toEqual('pending');
    expect(result[0].error_message).toBeNull();
  });

  it('should return documents with different processing statuses', async () => {
    // Create documents with various statuses
    await db.insert(documentsTable).values([
      {
        filename: 'pending.pdf',
        original_name: 'Pending Document.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        processing_status: 'pending',
        error_message: null
      },
      {
        filename: 'processing.pdf',
        original_name: 'Processing Document.pdf',
        file_size: 2048,
        mime_type: 'application/pdf',
        processing_status: 'processing',
        error_message: null
      },
      {
        filename: 'completed.pdf',
        original_name: 'Completed Document.pdf',
        file_size: 3072,
        mime_type: 'application/pdf',
        processing_status: 'completed',
        error_message: null
      },
      {
        filename: 'failed.pdf',
        original_name: 'Failed Document.pdf',
        file_size: 4096,
        mime_type: 'application/pdf',
        processing_status: 'failed',
        error_message: 'Processing failed due to corrupted file'
      }
    ]).execute();

    const result = await getDocuments();

    expect(result).toHaveLength(4);

    // Find each document and verify status
    const pendingDoc = result.find(doc => doc.processing_status === 'pending');
    const processingDoc = result.find(doc => doc.processing_status === 'processing');
    const completedDoc = result.find(doc => doc.processing_status === 'completed');
    const failedDoc = result.find(doc => doc.processing_status === 'failed');

    expect(pendingDoc).toBeDefined();
    expect(pendingDoc!.error_message).toBeNull();

    expect(processingDoc).toBeDefined();
    expect(processingDoc!.error_message).toBeNull();

    expect(completedDoc).toBeDefined();
    expect(completedDoc!.error_message).toBeNull();

    expect(failedDoc).toBeDefined();
    expect(failedDoc!.error_message).toEqual('Processing failed due to corrupted file');
  });

  it('should handle documents with nullable fields', async () => {
    // Create document with null error_message (default case)
    await db.insert(documentsTable).values({
      filename: 'test.pdf',
      original_name: 'Test Document.pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      processing_status: 'completed',
      error_message: null
    }).execute();

    const result = await getDocuments();

    expect(result).toHaveLength(1);
    expect(result[0].error_message).toBeNull();
    expect(result[0].upload_date).toBeInstanceOf(Date);
  });

  it('should return documents with proper date objects', async () => {
    const testDate = new Date('2024-01-15T10:30:00Z');
    
    await db.insert(documentsTable).values({
      filename: 'date-test.pdf',
      original_name: 'Date Test Document.pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      upload_date: testDate,
      processing_status: 'completed',
      error_message: null
    }).execute();

    const result = await getDocuments();

    expect(result).toHaveLength(1);
    expect(result[0].upload_date).toBeInstanceOf(Date);
    expect(result[0].upload_date.getTime()).toEqual(testDate.getTime());
  });
});