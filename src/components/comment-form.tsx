import { useUser } from "@clerk/nextjs";
import { type ChangeEvent, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Divider } from "~/components/ui/divider";
import { Button } from "~/components/ui/button";
import { LoadingSpinner } from "~/components/ui/loading-spinner";

interface Props {
  createComment: (content: string, onSuccess: () => void) => void;
  isLoading: boolean;
}

export function CommentForm({ createComment, isLoading }: Props) {
  const { user } = useUser();
  const [comment, setComment] = useState("");
  const handleCreateComment = () => {
    createComment(comment, () => {
      setComment("");
    });
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;

    setComment(target.value);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className="mt-4 flex w-full gap-3 rounded-xl border border-solid border-gray-200 p-4 shadow-md"
    >
      <div className="flex flex-col items-center justify-start">
        <Avatar className="h-6 w-6">
          <AvatarImage src={user?.imageUrl} alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </div>
      <div className="flex flex-1 flex-col items-center justify-start">
        <input
          name="content"
          placeholder="Comment your thoughts!"
          value={comment}
          onChange={handleChange}
          className="w-full pb-2 text-black outline-none"
        />
        <Divider />
        <div className="flex w-full items-center justify-end pt-2">
          <Button onClick={handleCreateComment} className="w-20" variant={"submit"}>
            {isLoading ? <LoadingSpinner /> : "Comment"}
          </Button>
        </div>
      </div>
    </form>
  );
}
