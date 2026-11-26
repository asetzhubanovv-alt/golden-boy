import { Suspense } from "react";
import MessagesPage from "@/components/messages-page";
import LocalizedLoading from "@/components/localized-loading";

export default function MessagesRoute() {
  return (
    <Suspense fallback={<LocalizedLoading className="detail-loading" translationKey="route.loading.chat" />}>
      <MessagesPage />
    </Suspense>
  );
}
