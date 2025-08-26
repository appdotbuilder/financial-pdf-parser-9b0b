import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type UploadDocumentInput } from '../schema';
import { uploadDocument } from '../handlers/upload_document';
import { eq } from 'drizzle-orm';

// Test input for valid PDF upload
const testInput: UploadDocumentInput = {
  filename: 'test-document.pdf',
  original_name: 'bank-statement-2024.pdf',
  file_size: 2048000, // 2MB
  mime_type: 'application/pdf'
};

describe('uploadDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a document record', async () => {
    const result = await uploadDocument(testInput);

    // Verify basic fields
    expect(result.original_name).toEqual('bank-statement-2024.pdf');
    expect(result.file_size).toEqual(2048000);
    expect(result.mime_type).toEqual('application/pdf');
    expect(result.processing_status).toEqual('pending');
    expect(result.error_message).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.upload_date).toBeInstanceOf(Date);
  });

  it('should generate a unique filename', async () => {
    const result = await uploadDocument(testInput);

    // Verify filename format (doc_timestamp_random.pdf)
    expect(result.filename).toMatch(/^doc_\d+_[a-z0-9]+\.pdf$/);
    expect(result.filename).not.toEqual(testInput.filename);
    expect(result.filename).not.toEqual('test-document.pdf');
  });

  it('should save document to database', async () => {
    const result = await uploadDocument(testInput);

    // Query database to verify record was saved
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, result.id))
      .execute();

    expect(documents).toHaveLength(1);
    const savedDoc = documents[0];
    expect(savedDoc.original_name).toEqual('bank-statement-2024.pdf');
    expect(savedDoc.file_size).toEqual(2048000);
    expect(savedDoc.mime_type).toEqual('application/pdf');
    expect(savedDoc.processing_status).toEqual('pending');
    expect(savedDoc.upload_date).toBeInstanceOf(Date);
  });

  it('should set default processing status to pending', async () => {
    const result = await uploadDocument(testInput);

    expect(result.processing_status).toEqual('pending');

    // Verify in database
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, result.id))
      .execute();

    expect(documents[0].processing_status).toEqual('pending');
  });

  it('should handle different file sizes', async () => {
    const largeFileInput: UploadDocumentInput = {
      filename: 'large-document.pdf',
      original_name: 'comprehensive-report.pdf',
      file_size: 15728640, // 15MB
      mime_type: 'application/pdf'
    };

    const result = await uploadDocument(largeFileInput);

    expect(result.file_size).toEqual(15728640);
    expect(result.original_name).toEqual('comprehensive-report.pdf');
    expect(result.processing_status).toEqual('pending');
  });

  it('should create multiple documents with unique filenames', async () => {
    const input1 = { ...testInput, original_name: 'doc1.pdf' };
    const input2 = { ...testInput, original_name: 'doc2.pdf' };

    const result1 = await uploadDocument(input1);
    const result2 = await uploadDocument(input2);

    // Verify both documents were created
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.filename).not.toEqual(result2.filename);
    expect(result1.original_name).toEqual('doc1.pdf');
    expect(result2.original_name).toEqual('doc2.pdf');

    // Verify both saved to database
    const allDocs = await db.select().from(documentsTable).execute();
    expect(allDocs).toHaveLength(2);
  });

  it('should preserve original filename in original_name field', async () => {
    const specialInput: UploadDocumentInput = {
      filename: 'temp.pdf',
      original_name: 'My Bank Statement - January 2024 (Final).pdf',
      file_size: 1024,
      mime_type: 'application/pdf'
    };

    const result = await uploadDocument(specialInput);

    expect(result.original_name).toEqual('My Bank Statement - January 2024 (Final).pdf');
    expect(result.filename).not.toEqual(result.original_name);
    expect(result.filename).toMatch(/^doc_\d+_[a-z0-9]+\.pdf$/);
  });

  it('should set upload_date to current time', async () => {
    const beforeUpload = new Date();
    const result = await uploadDocument(testInput);
    const afterUpload = new Date();

    expect(result.upload_date).toBeInstanceOf(Date);
    expect(result.upload_date.getTime()).toBeGreaterThanOrEqual(beforeUpload.getTime());
    expect(result.upload_date.getTime()).toBeLessThanOrEqual(afterUpload.getTime());
  });

  it('should handle minimum file size', async () => {
    const minSizeInput: UploadDocumentInput = {
      filename: 'tiny.pdf',
      original_name: 'minimal.pdf',
      file_size: 1, // 1 byte
      mime_type: 'application/pdf'
    };

    const result = await uploadDocument(minSizeInput);

    expect(result.file_size).toEqual(1);
    expect(result.processing_status).toEqual('pending');
  });
});