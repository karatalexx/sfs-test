import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { CommentForm } from "~/components/comment-form";

export function CreatePostComment({ postId }: { postId: string }) {
  const ctx = api.useUtils();

  const { mutate, isLoading } = api.posts.commentPost.useMutation({
    onSuccess: (comment) => {
      ctx.posts.getComments.setData({ postId }, (data) => [
        ...(data ?? []),
        comment,
      ]);

      void ctx.posts.getComments.invalidate();
    },
    onError: (e) => {
      const errorMessage = e.data?.zodError?.fieldErrors.content;
      if (errorMessage?.[0]) {
        toast.error(errorMessage[0]);
      } else {
        toast.error("Failed to create comment! Please try again later.");
      }
    },
  });

  const handleCreateComment = (content: string, onSuccess: () => void) => {
    mutate({ content, postId }, { onSuccess });
  };

  return (
    <CommentForm createComment={handleCreateComment} isLoading={isLoading} />
  );
}
