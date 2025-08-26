import { db } from '../db';
import { transactionsTable, documentsTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  try {
    // First, validate that the document exists
    const document = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, input.document_id))
      .execute();

    if (document.length === 0) {
      throw new Error(`Document with ID ${input.document_id} not found`);
    }

    // Insert transaction record
    const result = await db.insert(transactionsTable)
      .values({
        document_id: input.document_id,
        transaction_date: input.transaction_date,
        amount: input.amount.toString(), // Convert number to string for numeric column
        description: input.description,
        account_number: input.account_number,
        vendor_name: input.vendor_name,
        transaction_type: input.transaction_type
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};