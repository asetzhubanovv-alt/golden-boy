import type { Metadata } from "next";
import { Suspense } from "react";
import UserProfileRoute from "@/components/user-profile-route";
import LocalizedLoading from "@/components/localized-loading";

export const metadata: Metadata = {
  title: "Amanat — пайдаланушы профилі",
  description: "Amanat қауымдастығы қатысушыларының профилі.",
};

export default function UserProfilePage() {
  return (
    <Suspense fallback={<LocalizedLoading className="detail-loading" translationKey="route.loading.profile" />}>
      <UserProfileRoute />
    </Suspense>
  );
}
