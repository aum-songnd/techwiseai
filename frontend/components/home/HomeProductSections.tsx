import { getCategories, getProducts } from "@/lib/api";
import FlashSale from "@/components/home/FlashSale";
import HomeBrands from "@/components/home/HomeBrands";
import ProductGrid, { type CategorySectionData } from "@/components/product/ProductGrid";
import { HomeProductFeed } from "@/components/home/HomeProductFeed";
import type { Category, Product } from "@/app/data/types";
import HomeBestSellersNew from "@/components/home/HomeBestSellersNew";
import HomePriceDeals from "@/components/home/HomePriceDeals";
import HomeTechCombos from "@/components/home/HomeTechCombos";
import HomeRecentlyViewed from "@/components/home/HomeRecentlyViewed";
import ForYouRecommendations from "@/components/home/ForYouRecommendations";
import {
  getForYouRecommendations,
  type PersonalizedRecommendationData,
} from "@/lib/api/recommendation/personalized";
import ServiceFeatures from "@/components/common/ServiceFeatures";

const HomeProductSections = async () => {
  let products: Product[] = [];
  let laptops: Product[] = [];
  let accessories: Product[] = [];
  let audio: Product[] = [];
  let components: Product[] = [];
  let categorySections: CategorySectionData[] = [];
  let forYouData: PersonalizedRecommendationData | null = null;

  try {
    const [
      allResult,
      laptopResult,
      categoriesResult,
      accessoriesResult,
      audioResult,
      componentResult,
      cameraResult,
      phoneResult,
      forYouResult,
    ] = await Promise.allSettled([
      getProducts({ size: 60 }),
      getProducts({ category: "laptop", size: 30 }),
      getCategories(),
      getProducts({ category: "phu-kien", size: 20 }),
      getProducts({ category: "tai-nghe", size: 20 }),
      getProducts({ category: "linh-kien", size: 20 }),
      getProducts({ category: "may-anh", size: 20 }),
      getProducts({ category: "dien-thoai", size: 20 }),
      getForYouRecommendations(undefined, 8),
    ]);

    forYouData = forYouResult.status === "fulfilled" ? forYouResult.value : null;
    laptops = laptopResult.status === "fulfilled" ? laptopResult.value : [];
    accessories = accessoriesResult.status === "fulfilled" ? accessoriesResult.value : [];
    audio = audioResult.status === "fulfilled" ? audioResult.value : [];
    components = componentResult.status === "fulfilled" ? componentResult.value : [];
    const cameras = cameraResult.status === "fulfilled" ? cameraResult.value : [];
    const phones = phoneResult.status === "fulfilled" ? phoneResult.value : [];
    const baseProducts = allResult.status === "fulfilled" ? allResult.value : [];

    // Combine all categories to maximize diversity
    const uniqueMap = new Map<string, Product>();
    for (const list of [baseProducts, laptops, phones, audio, cameras, components, accessories]) {
      for (const p of list) {
        if (p?.id && !uniqueMap.has(p.id)) {
          uniqueMap.set(p.id, p);
        }
      }
    }
    products = Array.from(uniqueMap.values());

    const categories: Category[] =
      categoriesResult.status === "fulfilled" ? categoriesResult.value : [];

    const otherCategories = categories
      .filter((c) => {
        const slug = (c.slug || "").toLowerCase();
        const title = (c.title || "").toLowerCase();
        return (
          !slug.includes("laptop") &&
          !title.includes("laptop") &&
          slug !== "man-hinh" &&
          !title.includes("quân ka") &&
          !title.includes("quan ka")
        );
      })
      .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999))
      .slice(0, 2); // Keep only top 2 categories to avoid carousel overload

    if (otherCategories.length > 0) {
      const catResults = await Promise.allSettled(
        otherCategories.map((cat) =>
          getProducts({ category: cat.slug, size: 10 }).then((items) => ({
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
    <HomeProductFeed products={products}>
      {/* 1. Flash Sale with timer & sold progress */}
      <FlashSale />

      {/* 2. Dành riêng cho bạn (AI Personalized Recommendations) */}
      <ForYouRecommendations initialData={forYouData} />

      {/* 3. Sản phẩm bán chạy & Mới về (Tabbed) */}
      <HomeBestSellersNew products={products} />

      {/* 4. Deal theo mức giá */}
      <HomePriceDeals products={products} />

      {/* 5. Thương hiệu phổ biến (được đẩy lên trước combo) */}
      <HomeBrands products={products} />

      {/* 6. Combo công nghệ tiết kiệm */}
      <HomeTechCombos
        laptops={laptops}
        accessories={accessories}
        audio={audio}
        components={components}
      />

      {/* 7. Highlighted Category Carousels (Compact & focused) */}
      <ProductGrid
        initialLaptops={laptops}
        initialCategorySections={categorySections}
      />

      {/* 8. Sản phẩm đã xem gần đây */}
      <HomeRecentlyViewed />

      {/* 8. Dịch vụ cam kết */}
      <ServiceFeatures
        className="mt-8 mb-4"
        items={["shipping", "returns", "support", "refund"]}
      />
    </HomeProductFeed>
  );
};

export default HomeProductSections;