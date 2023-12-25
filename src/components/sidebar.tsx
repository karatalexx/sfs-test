"use client";
import { HomeIcon, EnterIcon, ChatBubbleIcon } from "@radix-ui/react-icons";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const { user } = useUser();
  const router = useRouter();

  const handleNavigateToHome = () => {
    router.push("/dashboard");
  };

  const handleNavigateToPosts = () => {
    router.push("/posts");
  };

  return (
    <div className="flex w-60 flex-col items-center justify-between border-r border-solid border-gray-200 px-4 py-4">
      <nav className="w-full">
        <ul className="w-full">
          <li className="mb-2 h-12">
            <Button
              className="flex h-full w-full items-center justify-start"
              onClick={handleNavigateToHome}
              variant="nav"
            >
              <HomeIcon className="mr-2 h-4 w-4" /> Home
            </Button>
          </li>
          {!user && (
            <li className="h-12">
              <SignInButton>
                <Button
                  variant="nav"
                  className="flex h-full w-full items-center justify-start"
                >
                  <EnterIcon className="mr-2 h-4 w-4" /> Log In
                </Button>
              </SignInButton>
            </li>
          )}
          {user && (
            <li className="h-12">
              <Button
                variant="nav"
                className="flex h-full w-full items-center justify-start"
                onClick={handleNavigateToPosts}
              >
                <ChatBubbleIcon className="mr-2 h-4 w-4" /> My posts
              </Button>
            </li>
          )}
        </ul>
      </nav>
      <div className="flex w-full items-center justify-start px-2">
        {user && (
          <>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.imageUrl} alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div className="pl-2 text-base font-medium">{user.username}</div>
          </>
        )}
      </div>
    </div>
  );
}
