import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import AddToCart from "@/components/AddToCart";
import {
  getProductBySlug,
  getCategoryNames,
  getBrandTitle,
  getRelatedProducts,
  getAllProductSlugs,
} from "@/app/data/product-helpers";

const statusLabel: Record<string, string> = {
  new: "NEW",
  hot: "HOT",
  sale: "SALE",
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

export function generateStaticParams() {
  return getAllProductSlugs().map((slug) => ({ slug }));
}

interface ProductPageProps {
  params: { slug: string };
}

const ProductPage = ({ params }: ProductPageProps) => {
  const product = getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const categoryNames = getCategoryNames(product);
  const brandTitle = getBrandTitle(product);
  const relatedProducts = getRelatedProducts(product);
  const finalPrice = product.price - (product.discount || 0);
  const hasDiscount = product.discount > 0;

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
          {product.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ProductGallery images={product.images} productName={product.name} />

        <div className="flex flex-col gap-4">
          {categoryNames[0] && (
            <span className="text-[12px] uppercase tracking-wide text-gray-400">
              {categoryNames[0]}
            </span>
          )}

          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-shop_dark_green">
              {product.name}
            </h1>
            {product.status && (
              <span className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-shop_orange/80 text-white">
                {statusLabel[product.status] ?? product.status}
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
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <p className="text-sm font-medium">Tình trạng</p>
            <p
              className={
                product.stock === 0
                  ? "text-red-600"
                  : "text-shop_dark_green/80 font-semibold"
              }
            >
              {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Hết hàng"}
            </p>
          </div>

          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {product.description}
            </p>
          )}

          <div className="mt-2">
            <AddToCart product={product} />
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
              <ProductCard
                key={related.id}
                product={{ ...related, categories: getCategoryNames(related) }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductPage;