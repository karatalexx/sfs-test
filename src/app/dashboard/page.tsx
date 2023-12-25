"use client";
import { PostView } from "~/components/post-view";
import { api } from "~/utils/api";
import { CreatePost } from "~/components/create-post";

export default function Page() {
  const { data } = api.posts.getAll.useQuery();

  return (
    <div className="mx-40 flex w-[760px] max-w-[760px] flex-1 py-4">
      <div className="flex flex-1 flex-col items-center justify-start">
        <CreatePost />
        {data?.map(({ post, author }) => (
          <PostView key={post.id} post={post} author={author} />
        ))}
      </div>
    </div>
  );
}
