import { Suspense } from "react";
import DemoAuthForm from "@/components/demo-auth-form";
import LocalizedLoading from "@/components/localized-loading";

export default function LoginPage() {
  return (
    <Suspense fallback={<LocalizedLoading className="detail-loading" translationKey="route.loading.login" />}>
      <DemoAuthForm mode="login" />
    </Suspense>
  );
}
