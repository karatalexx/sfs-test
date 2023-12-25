import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Button } from "~/components/ui/button";
import {
  DoubleArrowUpIcon,
  DoubleArrowDownIcon,
  ChatBubbleIcon,
} from "@radix-ui/react-icons";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { type RouterOutputs } from "~/utils/api";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import colors from "tailwindcss/colors";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import { useState } from "react";
import { CreateCommentComment } from "~/components/create-comment-comment";

dayjs.extend(relativeTime);

type PostComment = RouterOutputs["posts"]["getComments"][number]["comment"];

type Author = {
  id: string;
  username: string | null;
  imageUrl: string;
  firstName: string | null;
  lastName: string | null;
};

type CommentProps = {
  comment: PostComment;
  author: Author;
  columnCount?: number;
};

export function CommentView({ comment, author, columnCount }: CommentProps) {
  const { user } = useUser();
  const ctx = api.useUtils();
  const commentedBy = (
    author.username ?? `${author?.firstName} ${author?.lastName ?? ""}`
  ).trim();

  const [showCommentForm, setShowCommentForm] = useState(false);

  const { mutate, isLoading: isVoting } = api.posts.voteComment.useMutation({
    onSuccess: () => {
      void ctx.posts.getComments.invalidate();
    },
    onError: (e) => {
      const errorMessage = e.data?.zodError?.fieldErrors.content;
      if (errorMessage?.[0]) {
        toast.error(errorMessage[0]);
      } else {
        toast.error("Failed to vote! Please try again later.");
      }
    },
  });

  const handleVotePost = (vote: "up" | "down") => {
    const userId = user?.id;

    if (
      !userId ||
      (vote === "up" && comment.upVote) ||
      (vote === "down" && comment.downVote) ||
      isVoting
    ) {
      return;
    }

    mutate({
      commentType: comment.commentType as "post" | "comment",
      commentId: comment.id,
      vote,
    });
  };

  const handleReplyClick = () => {
    setShowCommentForm(true);
  };

  const handleCommentCreateSuccess = () => {
    setShowCommentForm(false);
  };

  return (
    <div
      className={`w-full ${
        columnCount ? "" : "border-b border-solid border-gray-200"
      } py-6 pb-2`}
      style={{
        marginLeft: 24 * (columnCount ?? 0),
      }}
    >
      <div className={"flex w-full"}>
        <div className="flex h-[84px] w-full items-center">
          <div className="flex h-full flex-1 flex-col justify-around">
            <div className="flex items-center justify-start">
              <Avatar className="h-6 w-6">
                <AvatarImage src={author?.imageUrl} alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <div className="pl-2 text-sm text-gray-600">
                {commentedBy} {dayjs(comment.createdAt).fromNow()}
              </div>
            </div>
            <div className="text-sm text-gray-700">{comment.content}</div>
          </div>
        </div>
      </div>
      <div className="-ml-3 mr-2 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleVotePost("up")}
          disabled={!user?.id}
        >
          <DoubleArrowUpIcon
            className="h-4 w-4"
            color={comment.upVote ? colors.indigo[700] : colors.black[100]}
          />
        </Button>
        <div className={"flex w-6 items-center justify-center"}>
          {isVoting ? <LoadingSpinner /> : comment.rating}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleVotePost("down")}
          disabled={!user?.id}
        >
          <DoubleArrowDownIcon
            className="h-4 w-4"
            color={comment.downVote ? colors.indigo[700] : colors.black[100]}
          />
        </Button>
        <Button
          variant={"ghost"}
          className={"flex gap-2"}
          onClick={handleReplyClick}
        >
          <ChatBubbleIcon className="h-4 w-4" />
          Reply
        </Button>
      </div>
      {showCommentForm && (
        <CreateCommentComment
          commentId={comment.id}
          postId={comment.postId}
          onCommentCreateSuccess={handleCommentCreateSuccess}
        />
      )}
      {comment.comments.map((nestedComment) => (
        <CommentView
          comment={nestedComment.comment as PostComment}
          author={nestedComment.author}
          key={nestedComment.comment.id}
          columnCount={columnCount ? columnCount + 1 : 1}
        />
      ))}
    </div>
  );
}
