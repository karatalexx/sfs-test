import { type User, clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  privateProcedure,
} from "~/server/api/trpc";
import { type Post, type PostUpVote, type PostDownVote } from "@prisma/client";

const filterUserForClient = ({
  id,
  username,
  imageUrl,
  firstName,
  lastName,
}: User) => {
  return { id, username, imageUrl, firstName, lastName };
};

const mapPostForClient = (post: Post & {upVotes: PostUpVote[], downVotes: PostDownVote[]}, userId: string | null) => {
  const { upVotes = [], downVotes = [] } = post;

  const rating = upVotes.length - downVotes.length;
  const upVote = !!upVotes.find((vote) => vote.userId === userId);
  const downVote = !!downVotes.find((vote) => vote.userId === userId);

  return  {
    ...post,
    rating,
    upVote,
    downVote,
  }
}

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.db.post.findMany({
      take: 100,
      include: {
        upVotes: true,
        downVotes: true,
      }
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
        post: mapPostForClient(post, ctx.userId),
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
  vote: privateProcedure
    .input(
      z.object({
        postId: z.string().min(1).max(50),
        vote: z.enum(['up', 'down']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const postToUpdate = await ctx.db.post.findUnique({
        where: { id: input.postId },
        include: { upVotes: true, downVotes: true },
      });

      if(!postToUpdate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Post with id ${input.postId} not found`,
        });
      }

      const upVote = postToUpdate.upVotes.find(vote => vote.userId === ctx.userId);
      const downVote = postToUpdate.downVotes.find(vote => vote.userId === ctx.userId);

      const post = await ctx.db.post.update({
        data: {
          ...(input.vote === "up" && {
            upVotes: {
              create: {
                userId: ctx.userId
              },
            },
            ...(downVote && {
              downVotes: {
                delete: {
                  id: downVote.id,
                }
              },
            }),
          }),
          ...(input.vote === "down" && {
            downVotes: {
              create: {
                userId: ctx.userId
              },
            },
            ...(upVote && {
              upVotes: {
                delete: {
                  id: upVote.id,
                }
              },
            }),
          }),
        },
        where: {
          id: input.postId
        },
        include: {
          upVotes: true,
          downVotes: true,
        }
      });

      return mapPostForClient(post, ctx.userId);
    }),
});
