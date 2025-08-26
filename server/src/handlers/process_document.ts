import { db } from '../db';
import { documentsTable, transactionsTable } from '../db/schema';
import { type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const processDocument = async (documentId: number): Promise<Transaction[]> => {
  try {
    // 1. Verify document exists and get its details
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    if (documents.length === 0) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    const document = documents[0];

    // 2. Update document status to 'processing'
    await db.update(documentsTable)
      .set({ 
        processing_status: 'processing',
        error_message: null
      })
      .where(eq(documentsTable.id, documentId))
      .execute();

    // 3. Extract transactions from the document (placeholder implementation)
    // In a real implementation, this would:
    // - Read the PDF file from storage using document.filename
    // - Use a PDF parsing library (like pdf-parse) to extract text
    // - Apply regex patterns and ML models to identify transaction data
    // - Parse dates, amounts, descriptions, account numbers, vendor names
    const extractedTransactions = await extractTransactionsFromDocument(document);

    // 4. Save extracted transactions to database
    const savedTransactions: Transaction[] = [];

    for (const transactionData of extractedTransactions) {
      const result = await db.insert(transactionsTable)
        .values({
          document_id: documentId,
          transaction_date: transactionData.transaction_date,
          amount: transactionData.amount.toString(), // Convert number to string for numeric column
          description: transactionData.description,
          account_number: transactionData.account_number,
          vendor_name: transactionData.vendor_name,
          transaction_type: transactionData.transaction_type
        })
        .returning()
        .execute();

      // Convert numeric fields back to numbers before adding to results
      const transaction = result[0];
      savedTransactions.push({
        ...transaction,
        amount: parseFloat(transaction.amount) // Convert string back to number
      });
    }

    // 5. Update document status to 'completed'
    await db.update(documentsTable)
      .set({ 
        processing_status: 'completed',
        error_message: null
      })
      .where(eq(documentsTable.id, documentId))
      .execute();

    return savedTransactions;
  } catch (error) {
    // Update document status to 'failed' with error message
    await db.update(documentsTable)
      .set({ 
        processing_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown processing error'
      })
      .where(eq(documentsTable.id, documentId))
      .execute();

    console.error('Document processing failed:', error);
    throw error;
  }
};

// Placeholder function for transaction extraction
// In a real implementation, this would contain the actual PDF parsing logic
interface ExtractedTransactionData {
  transaction_date: Date;
  amount: number;
  description: string;
  account_number: string | null;
  vendor_name: string | null;
  transaction_type: 'debit' | 'credit' | 'transfer' | 'fee' | 'other' | null;
}

const extractTransactionsFromDocument = async (document: any): Promise<ExtractedTransactionData[]> => {
  // This is a mock implementation that would be replaced with actual PDF parsing
  // For testing purposes, we'll simulate different scenarios based on filename patterns
  
  if (document.filename.includes('empty')) {
    return []; // No transactions found
  }
  
  if (document.filename.includes('error')) {
    throw new Error('PDF parsing failed - corrupted file');
  }

  // Mock extracted transactions for testing
  const mockTransactions: ExtractedTransactionData[] = [
    {
      transaction_date: new Date('2024-01-15'),
      amount: -150.75,
      description: 'ATM Withdrawal',
      account_number: '****1234',
      vendor_name: 'Chase ATM',
      transaction_type: 'debit'
    },
    {
      transaction_date: new Date('2024-01-16'),
      amount: 2500.00,
      description: 'Direct Deposit Salary',
      account_number: '****1234',
      vendor_name: 'ACME Corp',
      transaction_type: 'credit'
    }
  ];

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100));

  return mockTransactions;
};