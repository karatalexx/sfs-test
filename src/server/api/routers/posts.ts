import { User, clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  privateProcedure,
} from "~/server/api/trpc";

const filterUserForClient = ({
  id,
  username,
  imageUrl,
  firstName,
  lastName,
}: User) => {
  return { id, username, imageUrl, firstName, lastName };
};

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.db.post.findMany({
      take: 100,
    });

    const users = (
      await clerkClient.users.getUserList({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        userId: posts.map(({ authorId }) => authorId),
        limit: 100,
      })
    ).map(filterUserForClient);

    return posts.map((post) => {
      const author = users.find((user) => user.id === post.authorId);

      if (!author || (!author.username && !author.firstName)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Author for post not found",
        });
      }

      return {
        post,
        author,
      };
    });
  }),
  create: privateProcedure
    .input(
      z.object({
        title: z.string().min(1).max(180),
        content: z.string().min(1).max(360),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const authorId = ctx.userId;

      const post = await ctx.db.post.create({
        data: {
          authorId,
          title: input.title,
          content: input.content,
        },
      });

      return post;
    }),
});
