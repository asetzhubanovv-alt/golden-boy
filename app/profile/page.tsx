import { Suspense } from "react";
import ProfilePage from "@/components/profile-page";
import LocalizedLoading from "@/components/localized-loading";

export default function OwnProfilePage() {
  return (
    <Suspense fallback={<LocalizedLoading className="profile-edit-page container" translationKey="route.loading.profile" />}>
      <ProfilePage />
    </Suspense>
  );
}
