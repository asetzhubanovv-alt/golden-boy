import { Suspense } from "react";
import AddItemForm from "@/components/add-item-form";
import LocalizedLoading from "@/components/localized-loading";

export default function AddItemPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  return (
    <Suspense
      fallback={
        <LocalizedLoading
          className="auth-required-state container"
          translationKey="route.loading.add"
          wrapperClassName="foundly-shell container-fluid px-0"
        />
      }
    >
      <AddItemForm searchParams={searchParams} />
    </Suspense>
  );
}
