"use client";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { toast } from "react-hot-toast";
import { Divider } from "~/components/ui/divider";
import { Button } from "./ui/button";
import { type ChangeEvent, useState } from "react";
import { api } from "~/trpc/react";
import { useUser } from "@clerk/nextjs";
import { LoadingSpinner } from "~/components/ui/loading-spinner";

const initValues = {
  title: "",
  content: "",
};

export function CreatePost() {
  const { user } = useUser();
  const [values, setValues] = useState(initValues);
  const ctx = api.useUtils();

  const { mutate, isLoading: isPosting } = api.posts.create.useMutation({
    onSuccess: () => {
      setValues(initValues);
      void ctx.posts.getAll.invalidate();
    },
    onError: (e) => {
      const errorMessage = e.data?.zodError?.fieldErrors.content;
      if (errorMessage?.[0]) {
        toast.error(errorMessage[0]);
      } else {
        toast.error("Failed to post! Please try again later.");
      }
    },
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValues((prevState) => {
      const target = event.target as HTMLInputElement;
      return {
        ...prevState,
        [target.name]: target.value,
      };
    });
  };

  const handleCreatePost = () => {
    if (!values.content || !values.title) {
      return;
    }

    mutate({ ...values });
  };

  if (!user) {
    return null;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className="flex w-full rounded-xl border border-solid border-gray-200 p-4"
    >
      <div className="flex flex-col items-center justify-start">
        <Avatar className="h-6 w-6">
          <AvatarImage src={user?.imageUrl} alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </div>
      <div className="flex flex-1 flex-col items-center justify-start">
        <input
          name="title"
          type="text"
          placeholder="Title of your post"
          value={values.title}
          onChange={handleChange}
          className="w-full rounded-full px-4 pb-2 text-black outline-none"
        />
        <input
          name="content"
          type="text"
          placeholder="Share your thoughts with the world!"
          value={values.content}
          onChange={handleChange}
          className="w-full rounded-full px-4 py-2 text-black outline-none"
        />
        <Divider />
        <div className="flex w-full items-center justify-end pt-2">
          <Button onClick={handleCreatePost} className="w-14" variant={"submit"}>
            {isPosting ? <LoadingSpinner /> : "Post"}
          </Button>
        </div>
      </div>
    </form>
  );
}
