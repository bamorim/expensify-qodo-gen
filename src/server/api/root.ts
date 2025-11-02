import { postRouter } from "~/server/api/routers/post";
import { orgRouter } from "~/server/api/routers/org";
import { membershipRouter } from "~/server/api/routers/membership";
import { invitationRouter } from "~/server/api/routers/invitation";
import { categoryRouter } from "~/server/api/routers/category";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  org: orgRouter,
  membership: membershipRouter,
  invitation: invitationRouter,
  category: categoryRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
