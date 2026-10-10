import { App } from "@/components/app";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <App />
    </Suspense>
  );
}
