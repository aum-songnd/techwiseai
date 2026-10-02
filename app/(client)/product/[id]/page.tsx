import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import AddToCart from "@/components/AddToCart";
import { getProductById, getProducts } from "@/lib/api";
import {
  ChevronRight,
  Home,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import ServiceFeatures from "@/components/ServiceFeatures";

export const revalidate = 60;

const statusLabel: Record<string, string> = {
  new: "New",
  hot: "Hot",
  sale: "Sale",
};

const statusStyle: Record<string, string> = {
  new: "bg-shop_orange text-white",
  hot: "bg-red-500 text-white",
  sale: "bg-red-500 text-white",
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

const parseDescription = (raw?: string) => {
  if (!raw) return [];
  return raw
    .split("•")
    .map((s) => s.trim())
    .filter(Boolean);
};

const getShortName = (name: string) => name.split("/")[0].trim() || name;

const toSlug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const categoryHref = (name: string) =>
  `/shop?category=${encodeURIComponent(toSlug(name))}`;

const brandHref = (name: string) => `/shop?brand=${encodeURIComponent(name)}`;

export async function generateStaticParams() {
  try {
    const products = await getProducts();
    return products.map((p) => ({ id: p.id }));
  } catch {
    return [];
  }
}

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

const ProductPage = async ({ params }: ProductPageProps) => {
  const { id } = await params;

  let product: Awaited<ReturnType<typeof getProductById>>;

  try {
    product = await getProductById(id);
  } catch {
    notFound();
  }

  const categoryNames = product!.categories ?? [];
  const mainCategory = categoryNames[0];
  const brandTitle = product!.brand;

  const descriptionItems = parseDescription(product!.description);
  const intro = descriptionItems[0];
  const features = descriptionItems.slice(1);

  let relatedProducts: Awaited<ReturnType<typeof getProducts>> = [];
  try {
    const allProducts = await getProducts();

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

  const finalPrice = product!.finalPrice;
  const hasDiscount = product!.discount > 0;
  const discountPercent =
    hasDiscount && product!.price > 0
      ? Math.round(((product!.price - finalPrice) / product!.price) * 100)
      : 0;

  const inStock = product!.stock > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">

      <nav
        aria-label="Breadcrumb"
        className="text-sm text-gray-500 mb-6 flex flex-wrap items-center gap-1.5"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-1 hover:text-shop_dark_green transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          Trang chủ
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <Link
          href="/shop"
          className="hover:text-shop_dark_green transition-colors"
        >
          Sản phẩm
        </Link>
        {mainCategory && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link
              href={categoryHref(mainCategory)}
              className="hover:text-shop_dark_green hover:underline transition-colors"
            >
              {mainCategory}
            </Link>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span
          aria-current="page"
          title={product!.name}
          className="text-shop_dark_green font-medium line-clamp-1"
        >
          {getShortName(product!.name)}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
        <div className=" self-start">
          <ProductGallery
            images={product!.images}
            productName={product!.name}
          />
        </div>

        <div className="flex flex-col">

          {product!.status && (
            <span
              className={`self-start text-[11px] font-semibold px-2.5 py-1 rounded-2xl mb-3 ${
                statusStyle[product!.status] ?? "bg-gray-700 text-white"
              }`}
            >
              {statusLabel[product!.status] ?? product!.status}
            </span>
          )}

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
            {product!.name}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
            {mainCategory && (
              <Link
                href={categoryHref(mainCategory)}
                className="hover:text-shop_dark_green hover:underline"
              >
                {mainCategory}
              </Link>
            )}
            {mainCategory && brandTitle && <span>·</span>}
            {brandTitle && (
              <span>
                Thương hiệu:{" "}
                <Link
                  href={brandHref(brandTitle)}
                  className="text-gray-700 font-medium hover:text-shop_dark_green hover:underline"
                >
                  {brandTitle}
                </Link>
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-3xl font-bold text-gray-900">
              {formatPrice(finalPrice)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-base text-gray-400 line-through">
                  {formatPrice(product!.price)}
                </span>
                {discountPercent > 0 && (
                  <span className="text-xs font-semibold text-white bg-shop_dark_green px-2.5 py-1 rounded-full">
                    Tiết kiệm {discountPercent}%
                  </span>
                )}
              </>
            )}
          </div>

          <p
            className={`mt-3 inline-flex items-center gap-1.5 text-sm font-medium ${
              inStock ? "text-green-600" : "text-red-600"
            }`}
          >
            {inStock ? (
              <Check className="w-4 h-4" />
            ) : (
              <X className="w-4 h-4" />
            )}
            {inStock ? `Còn hàng (${product!.stock} sản phẩm)` : "Hết hàng"}
          </p>

          {intro && (
            <p className="mt-4 text-sm text-gray-600 leading-relaxed">
              {intro}
            </p>
          )}

          <div className="mt-6">
            <AddToCart product={product!} />
          </div>

          <ServiceFeatures className="mt-6" variant="compact" items={["shipping", "warranty", "returns"]}/>
        </div>
      </div>

      {features.length > 0 && (
        <section className="mt-12 border-t border-gray-200 pt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Tính năng nổi bật
          </h2>
          <ul className="space-y-3 max-w-3xl">
            {features.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed"
              >
                <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {relatedProducts.length > 0 && (
        <section className="mt-14 border-t border-gray-200 pt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Sản phẩm liên quan
            </h2>
            {mainCategory && (
              <Link
                href={categoryHref(mainCategory)}
                className="inline-flex items-center gap-1 text-sm text-shop_dark_green hover:underline"
              >
                Xem thêm {mainCategory}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
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