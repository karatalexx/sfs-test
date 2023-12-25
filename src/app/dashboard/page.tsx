"use client";
import { PostView } from "~/components/post-view";
import { api } from "~/utils/api";
import { CreatePost } from "~/components/create-post";
import Link from "next/link";

export default function Page() {
  const { data } = api.posts.getAll.useQuery({});

  return (
    <div className="mx-40 flex w-[760px] max-w-[760px] flex-1 py-4">
      <div className="flex flex-1 flex-col items-center justify-start">
        <CreatePost />
        {data?.map(({ post, author }) => (
          <Link
            href={`/post/${post.id}`}
            key={post.id}
            className={"block w-full"}
          >
            <PostView post={post} author={author} />
          </Link>
        ))}
      </div>
    </div>
  );
}
