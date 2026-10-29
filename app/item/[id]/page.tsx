import { Suspense } from "react";
import ItemDetail from "@/components/item-detail";

export default function ItemPage({ params }: PageProps<"/item/[id]">) {
  return (
    <Suspense fallback={<main className="detail-loading">Загружаем объявление...</main>}>
      {params.then(({ id }) => (
        <ItemDetail id={id} />
      ))}
    </Suspense>
  );
}
