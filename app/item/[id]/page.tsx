"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import ItemDetail from "@/components/item-detail";
import LocalizedLoading from "@/components/localized-loading";

function ItemRoute() {
  const { id } = useParams<{ id: string }>();

  return <ItemDetail id={id} />;
}

export default function ItemPage() {
  return (
    <Suspense
      fallback={<LocalizedLoading className="detail-loading" translationKey="route.loading.listing" />}
    >
      <ItemRoute />
    </Suspense>
  );
}
