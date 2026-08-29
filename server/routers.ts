import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { deduplicateOperations } from "./health-sync";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  sync: router({
    push: protectedProcedure
      .input(z.object({
        facilityId: z.number().int().positive().optional(),
        operations: z.array(z.object({
          id: z.string().min(1).max(128),
          type: z.string().min(1).max(96),
          entityId: z.string().min(1).max(128),
          createdAt: z.number().int().positive(),
          payload: z.string().max(50000).optional(),
        })).min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        const operations = deduplicateOperations(input.operations);
        const acknowledgedIds = await db.recordSyncOperations({
          userId: ctx.user.id,
          facilityId: input.facilityId,
          operations,
        });
        return { acknowledgedIds, acknowledgedAt: Date.now() };
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
