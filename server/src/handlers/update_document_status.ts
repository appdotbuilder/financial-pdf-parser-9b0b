import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type UpdateDocumentStatusInput, type Document } from '../schema';
import { eq } from 'drizzle-orm';

export const updateDocumentStatus = async (input: UpdateDocumentStatusInput): Promise<Document> => {
  try {
    // Build update values based on status
    const updateValues: any = {
      processing_status: input.processing_status,
    };

    // Handle error message logic
    if (input.processing_status === 'failed') {
      // Set error message if provided, or keep existing one
      if (input.error_message !== undefined) {
        updateValues.error_message = input.error_message;
      }
    } else {
      // Clear error message when status changes from 'failed' to other status
      updateValues.error_message = null;
    }

    // Update the document and return the updated record
    const result = await db.update(documentsTable)
      .set(updateValues)
      .where(eq(documentsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Document with id ${input.id} not found`);
    }

    const document = result[0];
    return {
      ...document,
      // No numeric conversions needed for documents table
    };
  } catch (error) {
    console.error('Document status update failed:', error);
    throw error;
  }
};