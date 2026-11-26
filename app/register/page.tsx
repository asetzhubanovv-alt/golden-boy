import { Suspense } from "react";
import DemoAuthForm from "@/components/demo-auth-form";
import LocalizedLoading from "@/components/localized-loading";

export default function RegisterPage() {
  return (
    <Suspense fallback={<LocalizedLoading className="detail-loading" translationKey="route.loading.register" />}>
      <DemoAuthForm mode="register" />
    </Suspense>
  );
}
