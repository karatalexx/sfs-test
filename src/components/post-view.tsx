import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Button } from "~/components/ui/button";
import { DoubleArrowUpIcon, DoubleArrowDownIcon } from "@radix-ui/react-icons";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { type RouterOutputs } from "~/utils/api";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import colors from "tailwindcss/colors";
import { LoadingSpinner } from "~/components/ui/loading-spinner";

dayjs.extend(relativeTime);

type Post = RouterOutputs["posts"]["getAll"][number]["post"];

type Author = {
  id: string;
  username: string | null;
  imageUrl: string;
  firstName: string | null;
  lastName: string | null;
};

type PostProps = {
  post: Post;
  author: Author;
  children?: React.ReactNode;
};

export function PostView({ post, author, children }: PostProps) {
  const { user } = useUser();
  const ctx = api.useUtils();
  const postedBy = (
    author.username ?? `${author?.firstName} ${author?.lastName ?? ""}`
  ).trim();

  const { mutate, isLoading: isVoting } = api.posts.vote.useMutation({
    onSuccess: (updatedPost) => {
      if (!updatedPost) {
        return;
      }

      ctx.posts.getAll.setData(undefined, (data) => {
        return data?.map(({ post: postData, author }) => ({
          post: postData.id === updatedPost.id ? updatedPost : postData,
          author,
        }));
      });
      void ctx.posts.getAll.invalidate();

      const getOnePostData = ctx.posts.getOne.getData({ id: updatedPost.id });

      if (!getOnePostData) {
        return;
      }

      ctx.posts.getOne.setData({ id: updatedPost.id }, () => {
        return {
          ...getOnePostData,
          post: updatedPost,
        };
      });
      void ctx.posts.getOne.invalidate();
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
      (vote === "up" && post.upVote) ||
      (vote === "down" && post.downVote) ||
      isVoting
    ) {
      return;
    }

    mutate({
      postId: post.id,
      vote,
    });
  };

  return (
    <div className="w-full border-b border-solid border-gray-200 py-6">
      <div className={"flex w-full"}>
        <div className="flex h-[84px] w-full items-center">
          <div className="mr-2 flex flex-col items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleVotePost("up")}
              disabled={!user?.id}
            >
              <DoubleArrowUpIcon
                className="h-4 w-4"
                color={post.upVote ? colors.indigo[700] : colors.black[100]}
              />
            </Button>
            <div>{isVoting ? <LoadingSpinner /> : post.rating}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleVotePost("down")}
              disabled={!user?.id}
            >
              <DoubleArrowDownIcon
                className="h-4 w-4"
                color={post.downVote ? colors.indigo[700] : colors.black[100]}
              />
            </Button>
          </div>
          <div className="flex h-full flex-1 flex-col justify-around">
            <div className="flex items-center justify-start">
              <Avatar className="h-6 w-6">
                <AvatarImage src={author?.imageUrl} alt="@shadcn" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
              <div className="pl-2 text-sm text-gray-600">
                Posted by {postedBy} {dayjs(post.createdAt).fromNow()}
              </div>
            </div>
            <div className="text-base font-medium">{post.title}</div>
            <div className="text-sm text-gray-700">{post.content}</div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
