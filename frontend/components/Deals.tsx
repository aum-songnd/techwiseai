// components/Deals.tsx
import React from "react";
import Container from "@/components/Container";
import ProductCard from "@/components/ProductCard";
import type { Product } from "../app/data/types";

interface DealsProps {
  products: Product[];
}

const Deals = ({ products }: DealsProps) => {
  return (
    <Container className="py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-shop_dark_green">Ưu đãi hot 🔥</h1>
        <p className="mt-2 text-lightColor">
          Tổng hợp các sản phẩm đang được săn đón nhiều nhất tại TechWise AI.
        </p>
      </div>

      {products.length === 0 ? (
        <p className="py-10 text-center text-lightColor">
          Hiện chưa có ưu đãi nào.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </Container>
  );
};

export default Deals;