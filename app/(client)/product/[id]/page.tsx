import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import AddToCart from "@/components/AddToCart";
import { getProductById, getProducts } from "@/lib/api";
import type { Product } from "@/app/data/types";

export const revalidate = 60;

const statusLabel: Record<string, string> = {
  new: "NEW",
  hot: "HOT",
  sale: "SALE",
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

export async function generateStaticParams() {
  try {
    const products = await getProducts();
    return products.map((p) => ({ id: p.id }));
  } catch {
    return [];
  }
}

interface ProductPageProps {
  params: { id: string };
}

const ProductPage = async ({ params }: ProductPageProps) => {
  let product: Product & { categories?: string[] };

  try {
    product = (await getProductById(params.id)) as Product & {
      categories?: string[];
    };
  } catch (err) {
    console.error("Lỗi getProductById:", err);
    notFound();
  }

  const categoryNames = product!.categories ?? [];
  const brandTitle = (product as any).brandTitle as string | undefined; // API hiện chưa gắn brand cho sản phẩm

  // Related products: cùng category đầu tiên, loại trừ chính nó, tối đa 4 sản phẩm
  let relatedProducts: (Product & { categories?: string[] })[] = [];
  try {
    const allProducts = (await getProducts()) as (Product & {
      categories?: string[];
    })[];
    const mainCategory = categoryNames[0];

    relatedProducts = allProducts
      .filter(
        (p) =>
          p.id !== product!.id &&
          (mainCategory ? p.categories?.includes(mainCategory) : true)
      )
      .slice(0, 4);
  } catch {
    relatedProducts = [];
  }

  const finalPrice = product!.price - (product!.discount || 0);
  const hasDiscount = product!.discount > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex flex-wrap items-center gap-1">
        <Link href="/" className="hover:text-shop_dark_green">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/shop" className="hover:text-shop_dark_green">
          Sản phẩm
        </Link>
        {categoryNames[0] && (
          <>
            <span>/</span>
            <span className="text-gray-700">{categoryNames[0]}</span>
          </>
        )}
        <span>/</span>
        <span className="text-shop_dark_green font-medium line-clamp-1">
          {product!.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ProductGallery images={product!.images} productName={product!.name} />

        <div className="flex flex-col gap-4">
          {categoryNames[0] && (
            <span className="text-[12px] uppercase tracking-wide text-gray-400">
              {categoryNames[0]}
            </span>
          )}

          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-shop_dark_green">
              {product!.name}
            </h1>
            {product!.status && (
              <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-shop_orange/80 text-white">
                {statusLabel[product!.status] ?? product!.status}
              </span>
            )}
          </div>

          {brandTitle && (
            <p className="text-sm text-gray-500">
              Thương hiệu:{" "}
              <span className="text-shop_dark_green font-medium">
                {brandTitle}
              </span>
            </p>
          )}

          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold text-shop_dark_green">
              {formatPrice(finalPrice)}
            </span>
            {hasDiscount && (
              <span className="text-base text-gray-400 line-through">
                {formatPrice(product!.price)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <p className="text-sm font-medium">Tình trạng</p>
            <p
              className={
                product!.stock === 0
                  ? "text-red-600"
                  : "text-shop_dark_green/80 font-semibold"
              }
            >
              {product!.stock > 0
                ? `Còn ${product!.stock} sản phẩm`
                : "Hết hàng"}
            </p>
          </div>

          {(product as any).description && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {(product as any).description}
            </p>
          )}

          <div className="mt-2">
            <AddToCart product={product!} />
          </div>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section className="mt-14">
          <h2 className="text-lg font-bold text-shop_dark_green mb-4">
            Sản phẩm liên quan
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedProducts.map((related) => (
              <ProductCard key={related.id} product={related} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductPage;