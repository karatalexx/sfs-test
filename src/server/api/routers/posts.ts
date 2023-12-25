import { clerkClient, type User } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  privateProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  type CommentComment,
  type CommentDownVote,
  type CommentUpVote,
  type Post,
  type PostComment,
  type PostDownVote,
  type PostUpVote,
} from "@prisma/client";

type ClientUser = Pick<
  User,
  "id" | "username" | "imageUrl" | "firstName" | "lastName"
>;
type ClientComment = (CommentComment | PostComment) & {
  upVotes: CommentUpVote[];
  downVotes: CommentDownVote[];
  rating: number;
  upVote: boolean;
  downVote: boolean;
};

const filterUserForClient = ({
  id,
  username,
  imageUrl,
  firstName,
  lastName,
}: User): ClientUser => {
  return { id, username, imageUrl, firstName, lastName };
};

const mapPostForClient = (
  post: Post & { upVotes: PostUpVote[]; downVotes: PostDownVote[] },
  userId: string | null,
) => {
  const { upVotes = [], downVotes = [] } = post;

  const rating = upVotes.length - downVotes.length;
  const upVote = !!upVotes.find((vote) => vote.userId === userId);
  const downVote = !!downVotes.find((vote) => vote.userId === userId);

  return {
    ...post,
    rating,
    upVote,
    downVote,
  };
};

const mapCommentForClient = (
  comment: (CommentComment | PostComment) & {
    upVotes: CommentUpVote[];
    downVotes: CommentDownVote[];
  },
  userId: string | null,
): ClientComment => {
  const { upVotes = [], downVotes = [] } = comment;

  const rating = upVotes.length - downVotes.length;
  const upVote = !!upVotes.find((vote) => vote.userId === userId);
  const downVote = !!downVotes.find((vote) => vote.userId === userId);

  return {
    ...comment,
    rating,
    upVote,
    downVote,
  };
};

export const postsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.db.post.findMany({
      take: 100,
      include: {
        upVotes: true,
        downVotes: true,
      },
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
  getOne: privateProcedure
    .input(
      z.object({
        id: z.string().min(1).max(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
        include: {
          upVotes: true,
          downVotes: true,
        },
      });

      if (!post) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Post with id ${input.id} not found`,
        });
      }

      const author = filterUserForClient(
        await clerkClient.users.getUser(post.authorId),
      );

      return {
        post: mapPostForClient(post, ctx.userId),
        author,
      };
    }),
  getComments: privateProcedure
    .input(
      z.object({
        postId: z.string().min(1).max(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const findQueryParameters = {
        where: { postId: input.postId },
        include: { upVotes: true, downVotes: true },
      };
      const [postComments, nestedComments] = await Promise.all([
        ctx.db.postComment.findMany(findQueryParameters),
        ctx.db.commentComment.findMany(findQueryParameters),
      ]);

      const userIds = [
        ...new Set(
          [...postComments, ...nestedComments].map((comment) => comment.userId),
        ).values(),
      ];

      const users = (
        await clerkClient.users.getUserList({
          userId: userIds,
          limit: 100,
        })
      ).map(filterUserForClient);

      function getNestedComments(comment: PostComment): {
        comment: ClientComment & { commentType: "comment" | "post" };
        author: ClientUser;
      }[] {
        const comments = nestedComments.filter(
          (nestedComment) => nestedComment.commentId === comment.id,
        );

        if (!comments.length) {
          return [];
        }

        return comments.map((comment) => {
          const commentForClient = mapCommentForClient(comment, ctx.userId);
          const author = users.find(
            (user) => user.id === commentForClient.userId,
          );

          if (!author || (!author.username && !author.firstName)) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Author for post not found",
            });
          }

          return {
            comment: {
              ...commentForClient,
              comments: getNestedComments(commentForClient),
              commentType: "comment",
            },
            author,
          };
        });
      }

      return postComments.map((comment) => {
        const commentForClient = mapCommentForClient(comment, ctx.userId);
        const author = users.find(
          (user) => user.id === commentForClient.userId,
        );

        if (!author || (!author.username && !author.firstName)) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Author for post not found",
          });
        }

        return {
          comment: {
            ...commentForClient,
            comments: getNestedComments(commentForClient),
            commentType: "post",
          },
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

      return await ctx.db.post.create({
        data: {
          authorId,
          title: input.title,
          content: input.content,
        },
      });
    }),
  vote: privateProcedure
    .input(
      z.object({
        postId: z.string().min(1).max(50),
        vote: z.enum(["up", "down"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const postToUpdate = await ctx.db.post.findUnique({
        where: { id: input.postId },
        include: { upVotes: true, downVotes: true },
      });

      if (!postToUpdate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Post with id ${input.postId} not found`,
        });
      }

      const upVote = postToUpdate.upVotes.find(
        (vote) => vote.userId === ctx.userId,
      );
      const downVote = postToUpdate.downVotes.find(
        (vote) => vote.userId === ctx.userId,
      );

      const post = await ctx.db.post.update({
        data: {
          ...(input.vote === "up" && {
            upVotes: {
              create: {
                userId: ctx.userId,
              },
            },
            ...(downVote && {
              downVotes: {
                delete: {
                  id: downVote.id,
                },
              },
            }),
          }),
          ...(input.vote === "down" && {
            downVotes: {
              create: {
                userId: ctx.userId,
              },
            },
            ...(upVote && {
              upVotes: {
                delete: {
                  id: upVote.id,
                },
              },
            }),
          }),
        },
        where: {
          id: input.postId,
        },
        include: {
          upVotes: true,
          downVotes: true,
        },
      });

      return mapPostForClient(post, ctx.userId);
    }),
  commentPost: privateProcedure
    .input(
      z.object({
        postId: z.string().min(1).max(50),
        content: z.string().min(1).max(360),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const postComment = await ctx.db.postComment.create({
        data: {
          content: input.content,
          post: {
            connect: { id: input.postId },
          },
          userId: ctx.userId,
        },
        include: { upVotes: true, downVotes: true },
      });

      const author = filterUserForClient(
        await clerkClient.users.getUser(postComment.userId),
      );

      return {
        author,
        comment: {
          ...mapCommentForClient(postComment, ctx.userId),
          comments: [],
          commentType: "post",
        },
      };
    }),
  commentComment: privateProcedure
    .input(
      z.object({
        postId: z.string().min(1).max(50),
        commentId: z.string().min(1).max(50),
        content: z.string().min(1).max(360),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.commentComment.create({
        data: {
          content: input.content,
          post: {
            connect: { id: input.postId },
          },
          commentId: input.commentId,
          userId: ctx.userId,
        },
      });
    }),
  voteComment: privateProcedure
    .input(
      z.object({
        commentId: z.string().min(1).max(50),
        vote: z.enum(["up", "down"]),
        commentType: z.enum(["post", "comment"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isPostType = input.commentType === "post";
      const findUniqueQueryParams = {
        where: { id: input.commentId },
        include: { upVotes: true, downVotes: true },
      };
      const commentToUpdate = isPostType
        ? await ctx.db.postComment.findUnique(findUniqueQueryParams)
        : await ctx.db.commentComment.findUnique(findUniqueQueryParams);

      if (!commentToUpdate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Comment with id ${input.commentId} not found`,
        });
      }

      const upVote = commentToUpdate.upVotes.find(
        (vote) => vote.userId === ctx.userId,
      );
      const downVote = commentToUpdate.downVotes.find(
        (vote) => vote.userId === ctx.userId,
      );

      const updateQueryParams = {
        data: {
          ...(input.vote === "up" && {
            upVotes: {
              create: {
                userId: ctx.userId,
              },
            },
            ...(downVote && {
              downVotes: {
                delete: {
                  id: downVote.id,
                },
              },
            }),
          }),
          ...(input.vote === "down" && {
            downVotes: {
              create: {
                userId: ctx.userId,
              },
            },
            ...(upVote && {
              upVotes: {
                delete: {
                  id: upVote.id,
                },
              },
            }),
          }),
        },
        where: {
          id: input.commentId,
        },
        include: {
          upVotes: true,
          downVotes: true,
        },
      };

      return isPostType
        ? await ctx.db.postComment.update(updateQueryParams)
        : await ctx.db.commentComment.update(updateQueryParams);
    }),
});
