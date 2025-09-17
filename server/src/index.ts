import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  registerUserInputSchema,
  getUserInputSchema,
  createGroupInputSchema,
  joinGroupInputSchema,
  getUserGroupsInputSchema,
  sendMessageInputSchema,
  getMessagesInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { getUser } from './handlers/get_user';
import { getAllUsers } from './handlers/get_all_users';
import { createGroup } from './handlers/create_group';
import { joinGroup } from './handlers/join_group';
import { getUserGroups } from './handlers/get_user_groups';
import { getAllGroups } from './handlers/get_all_groups';
import { sendMessage } from './handlers/send_message';
import { getMessages } from './handlers/get_messages';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management endpoints
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),
  
  getUser: publicProcedure
    .input(getUserInputSchema)
    .query(({ input }) => getUser(input)),
  
  getAllUsers: publicProcedure
    .query(() => getAllUsers()),

  // Group management endpoints
  createGroup: publicProcedure
    .input(createGroupInputSchema)
    .mutation(({ input }) => createGroup(input)),
  
  joinGroup: publicProcedure
    .input(joinGroupInputSchema)
    .mutation(({ input }) => joinGroup(input)),
  
  getUserGroups: publicProcedure
    .input(getUserGroupsInputSchema)
    .query(({ input }) => getUserGroups(input)),
  
  getAllGroups: publicProcedure
    .query(() => getAllGroups()),

  // Message management endpoints
  sendMessage: publicProcedure
    .input(sendMessageInputSchema)
    .mutation(({ input }) => sendMessage(input)),
  
  getMessages: publicProcedure
    .input(getMessagesInputSchema)
    .query(({ input }) => getMessages(input)),
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
  console.log(`🚀 Amigos TRPC server listening at port: ${port}`);
  console.log(`🌈 Ready to serve the Amigos decentralized chat app!`);
}

start();