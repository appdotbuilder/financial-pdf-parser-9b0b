import { db } from '../db';
import { documentsTable, transactionsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getDocumentTransactions = async (documentId: number): Promise<Transaction[]> => {
  try {
    // First validate that the document exists
    const document = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    if (document.length === 0) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    // Fetch all transactions for the document, ordered by transaction_date ascending
    const results = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.document_id, documentId))
      .orderBy(asc(transactionsTable.transaction_date))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string to number for numeric column
    }));
  } catch (error) {
    console.error('Getting document transactions failed:', error);
    throw error;
  }
};