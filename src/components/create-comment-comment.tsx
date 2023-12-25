import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { CommentForm } from "~/components/comment-form";

interface Props {
  postId: string;
  commentId: string;
  onCommentCreateSuccess: () => void;
}

export function CreateCommentComment({
  postId,
  commentId,
  onCommentCreateSuccess,
}: Props) {
  const ctx = api.useUtils();
  const { mutate, isLoading } = api.posts.commentComment.useMutation({
    onSuccess: () => {
      onCommentCreateSuccess();
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
    mutate({ content, postId, commentId }, { onSuccess });
  };

  return (
    <CommentForm createComment={handleCreateComment} isLoading={isLoading} />
  );
}
