import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable, transactionsTable } from '../db/schema';
import { type SearchTransactionsInput } from '../schema';
import { searchTransactions } from '../handlers/search_transactions';

describe('searchTransactions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test document
  const createTestDocument = async () => {
    const result = await db.insert(documentsTable)
      .values({
        filename: 'test-doc.pdf',
        original_name: 'test-document.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        processing_status: 'completed'
      })
      .returning()
      .execute();
    return result[0];
  };

  // Helper function to create test transactions
  const createTestTransactions = async (documentId: number) => {
    const transactions = [
      {
        document_id: documentId,
        transaction_date: new Date('2024-01-15'),
        amount: '150.00',
        description: 'Grocery Store Purchase',
        account_number: '1234567890',
        vendor_name: 'SuperMart',
        transaction_type: 'debit' as const
      },
      {
        document_id: documentId,
        transaction_date: new Date('2024-01-20'),
        amount: '2500.00',
        description: 'Salary Deposit',
        account_number: '1234567890',
        vendor_name: 'Tech Corp',
        transaction_type: 'credit' as const
      },
      {
        document_id: documentId,
        transaction_date: new Date('2024-02-01'),
        amount: '75.50',
        description: 'Gas Station Payment',
        account_number: '1234567890',
        vendor_name: 'FuelStop',
        transaction_type: 'debit' as const
      },
      {
        document_id: documentId,
        transaction_date: new Date('2024-02-10'),
        amount: '25.00',
        description: 'ATM Fee',
        account_number: null,
        vendor_name: null,
        transaction_type: 'fee' as const
      }
    ];

    return await db.insert(transactionsTable)
      .values(transactions)
      .returning()
      .execute();
  };

  it('should return all transactions with default pagination', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(4);
    expect(result.total_count).toBe(4);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total_pages).toBe(1);

    // Verify transactions are sorted by transaction_date desc (default)
    expect(result.transactions[0].transaction_date >= result.transactions[1].transaction_date).toBe(true);

    // Verify numeric conversion
    result.transactions.forEach(transaction => {
      expect(typeof transaction.amount).toBe('number');
    });
  });

  it('should filter transactions by search term', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      search_term: 'grocery',
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(1);
    expect(result.total_count).toBe(1);
    expect(result.transactions[0].description.toLowerCase()).toContain('grocery');
  });

  it('should filter transactions by vendor name in search term', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      search_term: 'tech corp',
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(1);
    expect(result.total_count).toBe(1);
    expect(result.transactions[0].vendor_name?.toLowerCase()).toContain('tech corp');
  });

  it('should filter transactions by date range', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      date_from: new Date('2024-01-01'),
      date_to: new Date('2024-01-31'),
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(2);
    expect(result.total_count).toBe(2);

    // Verify all results are within date range
    result.transactions.forEach(transaction => {
      expect(transaction.transaction_date >= input.date_from!).toBe(true);
      expect(transaction.transaction_date <= input.date_to!).toBe(true);
    });
  });

  it('should filter transactions by amount range', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      min_amount: 100,
      max_amount: 200,
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(1);
    expect(result.total_count).toBe(1);
    expect(result.transactions[0].amount).toBe(150);
  });

  it('should filter transactions by account number', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      account_number: '1234567890',
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(3);
    expect(result.total_count).toBe(3);
    result.transactions.forEach(transaction => {
      expect(transaction.account_number).toBe('1234567890');
    });
  });

  it('should filter transactions by vendor name', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      vendor_name: 'SuperMart',
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(1);
    expect(result.total_count).toBe(1);
    expect(result.transactions[0].vendor_name).toBe('SuperMart');
  });

  it('should filter transactions by transaction type', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      transaction_type: 'debit',
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(2);
    expect(result.total_count).toBe(2);
    result.transactions.forEach(transaction => {
      expect(transaction.transaction_type).toBe('debit');
    });
  });

  it('should sort transactions by amount ascending', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      sort_by: 'amount',
      sort_order: 'asc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(4);
    // Verify ascending sort
    for (let i = 1; i < result.transactions.length; i++) {
      expect(result.transactions[i].amount >= result.transactions[i - 1].amount).toBe(true);
    }
  });

  it('should sort transactions by description descending', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      sort_by: 'description',
      sort_order: 'desc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(4);
    // Verify descending sort
    for (let i = 1; i < result.transactions.length; i++) {
      expect(result.transactions[i].description <= result.transactions[i - 1].description).toBe(true);
    }
  });

  it('should handle pagination correctly', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    // Page 1 with limit 2
    const input1: SearchTransactionsInput = {
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 1,
      limit: 2
    };
    const result1 = await searchTransactions(input1);

    expect(result1.transactions).toHaveLength(2);
    expect(result1.total_count).toBe(4);
    expect(result1.page).toBe(1);
    expect(result1.limit).toBe(2);
    expect(result1.total_pages).toBe(2);

    // Page 2 with limit 2
    const input2: SearchTransactionsInput = {
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 2,
      limit: 2
    };
    const result2 = await searchTransactions(input2);

    expect(result2.transactions).toHaveLength(2);
    expect(result2.total_count).toBe(4);
    expect(result2.page).toBe(2);
    expect(result2.limit).toBe(2);
    expect(result2.total_pages).toBe(2);

    // Verify different transactions on different pages
    const page1Ids = result1.transactions.map(t => t.id);
    const page2Ids = result2.transactions.map(t => t.id);
    expect(page1Ids).not.toEqual(page2Ids);
  });

  it('should combine multiple filters correctly', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      date_from: new Date('2024-01-01'),
      date_to: new Date('2024-01-31'),
      transaction_type: 'debit',
      min_amount: 100,
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(1);
    expect(result.total_count).toBe(1);

    const transaction = result.transactions[0];
    expect(transaction.transaction_date >= input.date_from!).toBe(true);
    expect(transaction.transaction_date <= input.date_to!).toBe(true);
    expect(transaction.transaction_type).toBe('debit');
    expect(transaction.amount >= 100).toBe(true);
  });

  it('should return empty results when no transactions match filters', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      search_term: 'nonexistent transaction',
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(0);
    expect(result.total_count).toBe(0);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total_pages).toBe(0);
  });

  it('should handle case-insensitive search correctly', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      search_term: 'GROCERY',
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description.toLowerCase()).toContain('grocery');
  });

  it('should handle null vendor names in search', async () => {
    const document = await createTestDocument();
    await createTestTransactions(document.id);

    const input: SearchTransactionsInput = {
      search_term: 'ATM',
      sort_by: 'transaction_date',
      sort_order: 'desc',
      page: 1,
      limit: 20
    };
    const result = await searchTransactions(input);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description).toContain('ATM');
    expect(result.transactions[0].vendor_name).toBeNull();
  });
});