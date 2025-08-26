import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { desc } from 'drizzle-orm';

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    // Fetch all transactions ordered by transaction_date descending (most recent first)
    const results = await db.select()
      .from(transactionsTable)
      .orderBy(desc(transactionsTable.transaction_date))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw error;
  }
};