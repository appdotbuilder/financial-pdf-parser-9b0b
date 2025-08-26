import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type Document } from '../schema';
import { desc } from 'drizzle-orm';

export const getDocuments = async (): Promise<Document[]> => {
  try {
    // Fetch all documents ordered by upload_date descending (most recent first)
    const results = await db.select()
      .from(documentsTable)
      .orderBy(desc(documentsTable.upload_date))
      .execute();

    // Convert the results to match the Document schema
    return results.map(document => ({
      ...document,
      upload_date: new Date(document.upload_date), // Ensure proper Date object
    }));
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    throw error;
  }
};