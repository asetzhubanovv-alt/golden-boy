"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import ItemDetail from "@/components/item-detail";

function ItemRoute() {
  const { id } = useParams<{ id: string }>();

  return <ItemDetail id={id} />;
}

export default function ItemPage() {
  return (
    <Suspense
      fallback={
        <main className="detail-loading">Загружаем объявление...</main>
      }
    >
      <ItemRoute />
    </Suspense>
  );
}
