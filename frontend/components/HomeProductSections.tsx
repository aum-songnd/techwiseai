import { getProducts } from "@/lib/api";
import FlashSale from "@/components/FlashSale";
import HomeBrands from "@/components/HomeBrands";
import ProductGrid from "@/components/ProductGrid";
import { HomeProductFeed } from "@/components/HomeProductFeed";
import type { Product } from "@/app/data/types";

const HomeProductSections = async () => {
  let products: Product[] = [];
  let laptops: Product[] = [];

  try {
    const [allResult, laptopResult] = await Promise.allSettled([
      getProducts({ size: 60 }),
      getProducts({ category: "laptop", size: 60 }),
    ]);

    products = allResult.status === "fulfilled" ? allResult.value : [];
    laptops = laptopResult.status === "fulfilled" ? laptopResult.value : [];
  } catch {
    products = [];
    laptops = [];
  }

  return (
    <>
      <HomeProductFeed products={products}>
        <ProductGrid initialLaptops={laptops} />
        <FlashSale />
      </HomeProductFeed>
      <HomeBrands products={products} />
    </>
  );
};

export default HomeProductSections;