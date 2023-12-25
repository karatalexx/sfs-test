"use client";
import { api } from "~/utils/api";
import { PostView } from "~/components/post-view";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { CreatePostComment } from "~/components/create-post-comment";
import { CommentView } from "~/components/comment-view";

export default function Page({ params }: { params: { id: string } }) {
  const { data, isLoading: postLoading } = api.posts.getOne.useQuery({
    id: params.id,
  });
  const { data: comments, isLoading: commentsLoading } =
    api.posts.getComments.useQuery({ postId: params.id });

  if (postLoading || commentsLoading || !data) {
    return <p>Loading</p>;
  }

  const { post, author } = data;

  return (
    <div className={"mx-40 py-4"}>
      <Link
        href={"/dashboard"}
        className={"flex items-center gap-2 text-base font-medium"}
      >
        <ArrowLeftIcon />
        Back to posts
      </Link>
      <div className="flex w-[760px] max-w-[760px] flex-1">
        <div className="flex flex-1 flex-col items-center justify-start">
          <PostView post={post} author={author}>
            <CreatePostComment postId={post.id} />
          </PostView>

          <div className={"mt-4 flex w-full font-medium"}>
            {comments?.length ? "All comments" : "No comments yet"}
          </div>
          {comments?.map(({ comment, author }) => (
            <CommentView comment={comment} author={author} key={comment.id} />
          ))}
        </div>
      </div>
    </div>
  );
}
