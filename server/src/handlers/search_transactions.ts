import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type SearchTransactionsInput, type PaginatedTransactions } from '../schema';
import { eq, gte, lte, and, or, ilike, desc, asc, count, isNotNull } from 'drizzle-orm';

export const searchTransactions = async (input: SearchTransactionsInput): Promise<PaginatedTransactions> => {
  try {
    // Calculate offset for pagination
    const offset = (input.page - 1) * input.limit;

    // Build base query for transactions
    let query = db.select().from(transactionsTable);

    // Collect all filter conditions
    const conditions = [];

    // Text search in description and vendor_name (case-insensitive)
    if (input.search_term) {
      const searchConditions = [];
      searchConditions.push(ilike(transactionsTable.description, `%${input.search_term}%`));
      
      // For nullable vendor_name, we need to check it's not null first
      searchConditions.push(
        and(
          isNotNull(transactionsTable.vendor_name),
          ilike(transactionsTable.vendor_name, `%${input.search_term}%`)
        )!
      );
      
      conditions.push(or(...searchConditions)!);
    }

    // Date range filtering
    if (input.date_from) {
      conditions.push(gte(transactionsTable.transaction_date, input.date_from));
    }

    if (input.date_to) {
      conditions.push(lte(transactionsTable.transaction_date, input.date_to));
    }

    // Amount range filtering
    if (input.min_amount !== undefined) {
      conditions.push(gte(transactionsTable.amount, input.min_amount.toString()));
    }

    if (input.max_amount !== undefined) {
      conditions.push(lte(transactionsTable.amount, input.max_amount.toString()));
    }

    // Exact match filters
    if (input.account_number) {
      conditions.push(eq(transactionsTable.account_number, input.account_number));
    }

    if (input.vendor_name) {
      conditions.push(eq(transactionsTable.vendor_name, input.vendor_name));
    }

    if (input.transaction_type) {
      conditions.push(eq(transactionsTable.transaction_type, input.transaction_type));
    }

    // Apply where clause if we have conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions)!) as typeof query;
    }

    // Apply sorting - use proper column references
    if (input.sort_by === 'transaction_date') {
      query = input.sort_order === 'desc' 
        ? query.orderBy(desc(transactionsTable.transaction_date)) as typeof query
        : query.orderBy(asc(transactionsTable.transaction_date)) as typeof query;
    } else if (input.sort_by === 'amount') {
      query = input.sort_order === 'desc' 
        ? query.orderBy(desc(transactionsTable.amount)) as typeof query
        : query.orderBy(asc(transactionsTable.amount)) as typeof query;
    } else if (input.sort_by === 'description') {
      query = input.sort_order === 'desc' 
        ? query.orderBy(desc(transactionsTable.description)) as typeof query
        : query.orderBy(asc(transactionsTable.description)) as typeof query;
    } else if (input.sort_by === 'vendor_name') {
      query = input.sort_order === 'desc' 
        ? query.orderBy(desc(transactionsTable.vendor_name)) as typeof query
        : query.orderBy(asc(transactionsTable.vendor_name)) as typeof query;
    }

    // Apply pagination
    query = query.limit(input.limit).offset(offset) as typeof query;

    // Execute the main query
    const results = await query.execute();

    // Build count query with same conditions
    let countQuery = db.select({ count: count() }).from(transactionsTable);

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)!) as typeof countQuery;
    }

    const countResult = await countQuery.execute();
    const totalCount = countResult[0].count;

    // Convert numeric fields and prepare response
    const transactions = results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert numeric string to number
    }));

    const totalPages = Math.ceil(totalCount / input.limit);

    return {
      transactions,
      total_count: totalCount,
      page: input.page,
      limit: input.limit,
      total_pages: totalPages
    };
  } catch (error) {
    console.error('Transaction search failed:', error);
    throw error;
  }
};