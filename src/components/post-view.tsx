import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Button } from "~/components/ui/button";
import { DoubleArrowUpIcon, DoubleArrowDownIcon } from "@radix-ui/react-icons";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Post } from "@prisma/client";

dayjs.extend(relativeTime);

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
};

export function PostView({ post, author }: PostProps) {
  const postedBy = (
    author.username ?? `${author?.firstName} ${author?.lastName ?? ""}`
  ).trim();
  return (
    <div className="flex w-full border-b border-solid border-gray-200 py-6">
      <div className="flex h-[84px] w-full items-center">
        <div className="mr-2 flex flex-col items-center">
          <Button variant="ghost" size="icon">
            <DoubleArrowUpIcon className="h-4 w-4" />
          </Button>
          <div>100</div>
          <Button variant="ghost" size="icon">
            <DoubleArrowDownIcon className="h-4 w-4" />
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
  );
}
