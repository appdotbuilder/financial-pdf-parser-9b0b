import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type UploadDocumentInput, type Document } from '../schema';

export const uploadDocument = async (input: UploadDocumentInput): Promise<Document> => {
  try {
    // Generate a unique filename for storage
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const generatedFilename = `doc_${timestamp}_${randomSuffix}.pdf`;

    // Insert document record into database
    const result = await db.insert(documentsTable)
      .values({
        filename: generatedFilename,
        original_name: input.original_name,
        file_size: input.file_size,
        mime_type: input.mime_type,
        processing_status: 'pending'
      })
      .returning()
      .execute();

    // Return the created document (no numeric conversions needed for this table)
    return result[0];
  } catch (error) {
    console.error('Document upload failed:', error);
    throw error;
  }
};