import { LoadingSpinner } from "~/components/ui/loading-spinner";

export function LoadingView() {
  return (
    <div
      className={
        "mx-40 flex w-[760px] w-full max-w-[760px] items-center justify-center"
      }
    >
      <div className={"flex w-full flex-col items-center justify-center"}>
        <LoadingSpinner />
        <p>Loading</p>
      </div>
    </div>
  );
}
