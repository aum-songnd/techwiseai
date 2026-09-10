import { notFound } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import AddToCart from "@/components/AddToCart";
import { getProductById, getProducts } from "@/lib/api";
import type { Product } from "@/app/data/types";
import { Truck, RotateCcw, ShieldCheck } from "lucide-react";

export const revalidate = 60;

// API trả thêm các field không có trong Product type gốc (mock): brand
// (string thô, không phải object id/slug), description, categories (tên
// danh mục). Khai báo rõ thay vì dùng `any` ở từng chỗ đọc field.
type ApiProduct = Product & {
  categories?: string[];
  brand?: string;
  description?: string;
};

const statusLabel: Record<string, string> = {
  new: "NEW",
  hot: "HOT",
  sale: "SALE",
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value
  );

// Mô tả từ API là 1 chuỗi thô, các ý cách nhau bởi dấu "•".
// Tách thành mảng câu để render thành list thay vì 1 đoạn dính chữ.
const parseDescription = (raw?: string) => {
  if (!raw) return [];
  return raw
    .split("•")
    .map((s) => s.trim())
    .filter(Boolean);
};

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

  let product: ApiProduct;

  try {
    product = (await getProductById(id)) as ApiProduct;
  } catch (err) {
    console.error("Lỗi getProductById:", err);
    notFound();
  }

  const categoryNames = product!.categories ?? [];
  const brandTitle = product!.brand;
  const descriptionItems = parseDescription(product!.description);

  // Related products: cùng category đầu tiên, loại trừ chính nó, tối đa 4 sản phẩm
  let relatedProducts: ApiProduct[] = [];
  try {
    const allProducts = (await getProducts()) as ApiProduct[];
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

          <div className="mt-2">
            <AddToCart product={product!} />
          </div>

          {/* Cam kết dịch vụ - lấp khoảng trống cột phải */}
          <div className="mt-20 bg-gray-200 border border-gray-300 rounded-lg divide-y divide-gray-300">
            <div className="flex items-center gap-3 px-4 py-3">
              <Truck className="w-5 h-5 text-shop_dark_green shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-800">
                  Miễn phí vận chuyển
                </p>
                <p className="text-gray-500">
                  Cho đơn hàng từ 500.000đ trong nội thành
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <RotateCcw className="w-5 h-5 text-shop_dark_green shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-800">
                  Đổi trả trong 7 ngày
                </p>
                <p className="text-gray-500">
                  Miễn phí đổi trả nếu sản phẩm lỗi do nhà sản xuất
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <ShieldCheck className="w-5 h-5 text-shop_dark_green shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-gray-800">
                  Bảo hành chính hãng
                </p>
                <p className="text-gray-500">12 tháng tại trung tâm ủy quyền</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mô tả sản phẩm - tách riêng thành section full-width, dễ đọc hơn */}
      {descriptionItems.length > 0 && (
        <section className="mt-10 border-t border-gray-200 pt-8">
          <h2 className="text-lg font-bold text-shop_dark_green mb-4">
            Mô tả sản phẩm
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 leading-relaxed max-w-3xl">
            {descriptionItems.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </section>
      )}

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