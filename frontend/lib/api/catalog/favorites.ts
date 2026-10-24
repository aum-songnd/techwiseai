import {
  fetchEnvelopeAuthed,
  normalizeList,
  mapProduct,
  type ApiProductRaw,
} from "../core";
import type { Product } from "@/app/data/types";

interface ApiFavoriteRaw {
  id: string;
  createdAt: string;
  product: ApiProductRaw;
}

interface ApiFavoriteCreatedRaw {
  id: string;
  createdAt: string;
  product?: ApiProductRaw;
}

export async function getFavorites(): Promise<Product[]> {
  const data = await fetchEnvelopeAuthed<ApiFavoriteRaw[]>("/favorites", {
    cache: "no-store",
  });

  const list = normalizeList(data);
  return list
    .filter((f) => !!f.product)
    .map((f) => mapProduct(f.product));
}

export async function addFavorite(productId: string): Promise<void> {
  await fetchEnvelopeAuthed<ApiFavoriteCreatedRaw>("/favorites", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
}

export async function removeFavorite(productId: string): Promise<void> {
  await fetchEnvelopeAuthed<null>(`/favorites/${productId}`, {
    method: "DELETE",
  });
}

export async function removeAllFavorites(): Promise<void> {
  await fetchEnvelopeAuthed<null>("/favorites", {
    method: "DELETE",
  });
}

export async function checkFavorite(productId: string): Promise<boolean> {
  const data = await fetchEnvelopeAuthed<{ isFavorite: boolean }>(
    `/favorites/check?productId=${encodeURIComponent(productId)}`
  );
  return data.isFavorite;
}
