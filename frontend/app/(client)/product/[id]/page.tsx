import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import ProductGallery from "@/components/product/ProductGallery";
import RecommendationCarousel from "@/components/product/RecommendationCarousel";
import {
  getProductById,
  getProducts,
  getAllProductsByCategory,
  getProductRecommendations,
  getAiRecommendations,
  getProductSpecs,
  type RecommendedProduct,
} from "@/lib/api";
import {
  ChevronRight,
  Home,
  ArrowRight,
  Check,
  X,
  Star,
} from "lucide-react";
import ServiceFeatures from "@/components/common/ServiceFeatures";
import ProductReviewsSection from "@/components/product/ProductReviewsSection";
import ProductDetailInteractive from "@/components/product/ProductDetailInteractive";
import HomeRecentlyViewed from "@/components/home/HomeRecentlyViewed";

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

const getBaseModelName = (name: string): string => {
  return name
    .replace(/\s*\|\s*chính hãng(\s*vn\/a)?/gi, "")
    .replace(/\s*chính hãng(\s*vn\/a)?/gi, "")
    .replace(/\b(64|128|256|512)\s*gb\b/gi, "")
    .replace(/\b(1|2|4)\s*tb\b/gi, "")
    .replace(/\b(4|6|8|12|16|24|32|64|128)\s*gb\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
};

export async function generateStaticParams() {
  return [];
}

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

const ProductPage = async ({ params }: ProductPageProps) => {
  const { id } = await params;

  let product: Awaited<ReturnType<typeof getProductById>>;
  let compatibleAccessories: Awaited<ReturnType<typeof getProducts>> = [];
  let siblingVariants: Awaited<ReturnType<typeof getProducts>> = [];

  try {
    product = await getProductById(id);
  } catch {
    notFound();
  }

  const categoryNames = product!.categories ?? [];
  const mainCategory = categoryNames[0];

  try {
    const [accessoriesResult, categoryProductsResult] = await Promise.allSettled([
      getProducts({ category: "phu-kien", size: 4 }),
      getAllProductsByCategory(
        mainCategory ? toSlug(mainCategory) : undefined
      ),
    ]);

    if (accessoriesResult.status === "fulfilled" && accessoriesResult.value.length > 0) {
      compatibleAccessories = accessoriesResult.value;
    } else {
      compatibleAccessories = await getProducts({ category: "tai-nghe", size: 4 }).catch(() => []);
    }

    if (categoryProductsResult.status === "fulfilled") {
      const currentBase = getBaseModelName(product!.name);
      siblingVariants = categoryProductsResult.value.filter(
        (p) =>
          p.brand?.trim().toLowerCase() === product!.brand?.trim().toLowerCase() &&
          getBaseModelName(p.name) === currentBase
      );
      if (!siblingVariants.some((s) => s.id === product!.id)) {
        siblingVariants.push(product!);
      }
      siblingVariants.sort((a, b) => (a.finalPrice || a.price) - (b.finalPrice || b.price));
    }
  } catch {
    compatibleAccessories = [];
    siblingVariants = [product!];
  }

  const brandTitle = product!.brand;

  const descriptionItems = parseDescription(product!.description);
  const intro = descriptionItems[0];
  const features = descriptionItems.slice(1);

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

          {/* Rating Summary Link */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <div className="flex items-center text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= Math.round(product!.ratingAverage || 5)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-neutral-200 text-neutral-200"
                  }`}
                />
              ))}
            </div>
            <span className="font-bold text-neutral-800">
              {product!.ratingAverage ? product!.ratingAverage.toFixed(1) : "5.0"}
            </span>
            <span className="text-neutral-300">·</span>
            <a
              href="#reviews"
              className="text-neutral-500 hover:text-shop_dark_green hover:underline cursor-pointer"
            >
              {product!.reviewCount ? `${product!.reviewCount} đánh giá & bình luận` : "Đánh giá & bình luận"}
            </a>
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
            <ProductDetailInteractive
              product={product!}
              siblingVariants={siblingVariants}
              compatibleAccessories={compatibleAccessories}
            />
          </div>

          <ServiceFeatures className="mt-6" variant="compact" items={["shipping", "warranty", "returns"]}/>
        </div>
      </div>

      {(features.length > 0) && (
        <div className="mt-12 border-t border-gray-200 pt-8">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Tính năng nổi bật</h2>
            <ul className="space-y-3">
              {features.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
      <Suspense fallback={null}>
        <ProductSpecifications productId={product!.id} />
      </Suspense>
      <Suspense fallback={null}>
        <ProductRecommendations
          productId={product!.id}
          mainCategory={mainCategory}
          currentPrice={product!.finalPrice || product!.price}
        />
      </Suspense>

      <HomeRecentlyViewed title="Sản phẩm bạn đã xem gần đây" />

      <ProductReviewsSection
        productId={product!.id}
        productName={product!.name}
        product={product!}
        initialSummary={{
          ratingAverage: product!.ratingAverage,
          reviewCount: product!.reviewCount,
        }}
      />
    </div>
  );
};


// Các phần bổ sung được stream độc lập, không chặn nội dung chính của sản phẩm.
async function ProductSpecifications({ productId }: { productId: string }) {
  let specs: [string, string][] = [];
  try {
    specs = Object.entries(await getProductSpecs(productId));
  } catch (error) {
    console.error("Không thể tải thông số kỹ thuật:", error);
  }
  if (!specs.length) return null;
  return (
    <section className="mt-12 border-t border-gray-200 pt-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Thông số kỹ thuật</h2>
      <div className="w-full overflow-hidden border border-gray-300">
        <table className="w-full text-sm"><tbody>
          {specs.map(([label, value], idx) => (
            <tr key={label} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
              <th scope="row" className="w-1/3 px-4 py-2.5 text-left align-top font-medium text-gray-600">{label}</th>
              <td className="px-4 py-2.5 text-gray-900">{value}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </section>
  );
}

async function ProductRecommendations({
  productId,
  mainCategory,
  currentPrice,
}: {
  productId: string;
  mainCategory?: string;
  currentPrice?: number;
}) {
  let aiRecommendations: RecommendedProduct[] = [];
  let relatedProducts: Awaited<ReturnType<typeof getProductRecommendations>> = [];
  try {
    aiRecommendations = await getAiRecommendations(productId, 8);
  } catch (error) {
    console.error("Không thể tải đề xuất AI:", error);
  }
  if (!aiRecommendations.length) {
    try {
      relatedProducts = await getProductRecommendations(productId, 8);
    } catch (error) {
      console.error("Không thể tải sản phẩm gợi ý:", error);
    }
  }

  // Bộ lọc nghiêm ngặt: CHỈ HIỂN THỊ CÙNG CATEGORY VÀ GIÁ KHÔNG ĐƯỢC CHÊNH LỆCH VƯỢT NGƯỠNG (<= 35%)
  const isValidCandidate = (p: { categories?: string[]; price: number; finalPrice?: number }) => {
    // 1. Phải cùng category
    if (mainCategory && p.categories && p.categories.length > 0) {
      const match = p.categories.some(
        (cat) => cat.trim().toLowerCase() === mainCategory.trim().toLowerCase()
      );
      if (!match) return false;
    }
    // 2. Không chênh lệch vượt ngưỡng (tối đa 35%)
    if (currentPrice && currentPrice > 0) {
      const pPrice = p.finalPrice || p.price;
      const deviation = Math.abs(pPrice - currentPrice) / currentPrice;
      if (deviation > 0.35) return false;
    }
    return true;
  };

  const filteredAi = aiRecommendations.filter((item) => isValidCandidate(item.product));
  const filteredRelated = relatedProducts.filter((item) => isValidCandidate(item));

  if (!filteredAi.length && !filteredRelated.length) return null;

  return (
    <section className="mt-14 border-t border-gray-200 pt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">
          {filteredAi.length ? "Sản phẩm đề xuất" : "Sản phẩm liên quan"}
        </h2>
        {mainCategory && (
          <Link href={categoryHref(mainCategory)} className="inline-flex items-center gap-1 text-sm text-shop_dark_green hover:underline">
            Xem thêm {mainCategory}<ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      <RecommendationCarousel
        aiRecommendations={filteredAi}
        relatedProducts={filteredRelated}
      />
    </section>
  );
}

export default ProductPage;