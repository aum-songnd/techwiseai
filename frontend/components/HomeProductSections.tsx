import { getCategories, getProducts } from "@/lib/api";
import FlashSale from "@/components/FlashSale";
import HomeBrands from "@/components/HomeBrands";
import ProductGrid, { type CategorySectionData } from "@/components/ProductGrid";
import { HomeProductFeed } from "@/components/HomeProductFeed";
import type { Category, Product } from "@/app/data/types";

const HomeProductSections = async () => {
  let products: Product[] = [];
  let laptops: Product[] = [];
  let categorySections: CategorySectionData[] = [];

  try {
    const [allResult, laptopResult, categoriesResult] =
      await Promise.allSettled([
        getProducts({ size: 60, noStore: true }),
        getProducts({ category: "laptop", size: 60, noStore: true }),
        getCategories({ noStore: true }),
      ]);

    products = allResult.status === "fulfilled" ? allResult.value : [];
    laptops = laptopResult.status === "fulfilled" ? laptopResult.value : [];
    const categories: Category[] =
      categoriesResult.status === "fulfilled" ? categoriesResult.value : [];

    const otherCategories = categories
      .filter((c) => {
        const slug = (c.slug || "").toLowerCase();
        const title = (c.title || "").toLowerCase();
        return !slug.includes("laptop") && !title.includes("laptop");
      })
      .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));

    if (otherCategories.length > 0) {
      const catResults = await Promise.allSettled(
        otherCategories.map((cat) =>
          getProducts({ category: cat.slug, size: 15, noStore: true }).then((items) => ({
            category: cat,
            products: items,
          }))
        )
      );

      categorySections = catResults
        .filter(
          (r): r is PromiseFulfilledResult<CategorySectionData> =>
            r.status === "fulfilled"
        )
        .map((r) => r.value)
        .filter((item) => item.products.length > 0);
    }
  } catch {
    products = [];
    laptops = [];
    categorySections = [];
  }

  return (
    <>
      <HomeProductFeed products={products}>
        <ProductGrid
          initialLaptops={laptops}
          initialCategorySections={categorySections}
        />
        <FlashSale />
      </HomeProductFeed>
      <HomeBrands products={products} />
    </>
  );
};

export default HomeProductSections;