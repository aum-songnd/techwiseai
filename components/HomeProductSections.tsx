import { getProducts } from "@/lib/api";
import FlashSale from "@/components/FlashSale";
import HomeBrands from "@/components/HomeBrands";
import ProductGrid from "@/components/ProductGrid";
import { HomeProductFeed } from "@/components/HomeProductFeed";
import type { Product } from "@/app/data/types";

const HomeProductSections = async () => {
  let products: Product[] = [];

  try {
    products = await getProducts({ size: 60 });
  } catch {
    products = [];
  }

  return (
    <>
      <HomeProductFeed products={products}>
        <div className="py-5">
          <ProductGrid />
        </div>
        <FlashSale />
      </HomeProductFeed>
      <HomeBrands products={products} />
    </>
  );
};

export default HomeProductSections;