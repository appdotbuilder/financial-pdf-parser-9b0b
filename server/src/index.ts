import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import {
  uploadDocumentInputSchema,
  updateDocumentStatusInputSchema,
  createTransactionInputSchema,
  searchTransactionsInputSchema,
  updateTransactionInputSchema
} from './schema';

// Import handlers
import { uploadDocument } from './handlers/upload_document';
import { getDocuments } from './handlers/get_documents';
import { updateDocumentStatus } from './handlers/update_document_status';
import { processDocument } from './handlers/process_document';
import { createTransaction } from './handlers/create_transaction';
import { searchTransactions } from './handlers/search_transactions';
import { getTransactions } from './handlers/get_transactions';
import { updateTransaction } from './handlers/update_transaction';
import { deleteTransaction } from './handlers/delete_transaction';
import { getDocumentTransactions } from './handlers/get_document_transactions';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Document management routes
  uploadDocument: publicProcedure
    .input(uploadDocumentInputSchema)
    .mutation(({ input }) => uploadDocument(input)),

  getDocuments: publicProcedure
    .query(() => getDocuments()),

  updateDocumentStatus: publicProcedure
    .input(updateDocumentStatusInputSchema)
    .mutation(({ input }) => updateDocumentStatus(input)),

  processDocument: publicProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(({ input }) => processDocument(input.documentId)),

  getDocumentTransactions: publicProcedure
    .input(z.object({ documentId: z.number() }))
    .query(({ input }) => getDocumentTransactions(input.documentId)),

  // Transaction management routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  getTransactions: publicProcedure
    .query(() => getTransactions()),

  searchTransactions: publicProcedure
    .input(searchTransactionsInputSchema)
    .query(({ input }) => searchTransactions(input)),

  updateTransaction: publicProcedure
    .input(updateTransactionInputSchema)
    .mutation(({ input }) => updateTransaction(input)),

  deleteTransaction: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteTransaction(input.id)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC Document Parser server listening at port: ${port}`);
}

start();