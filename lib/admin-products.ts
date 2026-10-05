import { getProductsPaginated } from "@/lib/api";
import type { Category, Product } from "@/app/data/types";

const FETCH_SIZE = 100;
const MAX_PAGES = 100;

export const normalizeAdminText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

export const fetchAllAdminProducts = async (): Promise<Product[]> => {
  const products: Product[] = [];
  const seenIds = new Set<string>();

  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await getProductsPaginated({
      size: FETCH_SIZE,
      page,
      noStore: true,
    });

    for (const product of result.items) {
      if (seenIds.has(product.id)) continue;
      seenIds.add(product.id);
      products.push(product);
    }

    if (page + 1 >= result.totalPages || result.items.length === 0) break;
  }

  return products;
};

export const countProductsByCategory = (
  products: Product[],
  categories: Category[]
): Record<string, number> => {
  const counts: Record<string, number> = Object.fromEntries(
    categories.map((category) => [category.id, 0])
  );
  const categoryIdsByName = new Map(
    categories.map((category) => [normalizeAdminText(category.title), category.id])
  );

  for (const product of products) {
    const matchedCategoryIds = new Set(
      (product.categories ?? [])
        .map(normalizeAdminText)
        .map((name) => categoryIdsByName.get(name))
        .filter((id): id is string => Boolean(id))
    );

    for (const categoryId of matchedCategoryIds) {
      counts[categoryId] += 1;
    }
  }

  return counts;
};