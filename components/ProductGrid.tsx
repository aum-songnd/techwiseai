"use client";
import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { motion, AnimatePresence } from "motion/react";
import NoProductAvailable from "./NoProductAvailable";
import Container from "./Container";
import HomeTabBar from "./HomeTabBar";
import { productType } from "@/constants/data";
import { products as mockProducts } from "../app/data/products";
import { categories as mockCategories } from "../app/data/categories";
import { Product } from "../app/data/types";

const ProductGrid = () => {
  const [products, setProducts] = useState<
    (Product & { categories: string[] })[]
  >([]);
  const [selectedTab, setSelectedTab] = useState(productType[0]?.title || "");

  useEffect(() => {
    const variant = selectedTab.toLowerCase();

    // tương đương *[_type == "product" && variant == $variant] | order(name asc)
    const filtered = mockProducts
      .filter((p) => p.variant?.toLowerCase() === variant)
      .sort((a, b) => a.name.localeCompare(b.name));

    // tương đương "categories": categories[]->title
    const populated = filtered.map((p) => ({
      ...p,
      categories: p.categoryIds
        .map((id) => mockCategories.find((c) => c.id === id)?.title)
        .filter(Boolean) as string[],
    }));

    setProducts(populated);
  }, [selectedTab]);

  return (
    <Container className="flex flex-col lg:px-0 my-10">
      <HomeTabBar selectedTab={selectedTab} onTabSelect={setSelectedTab} />
      {products?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-10">
          <>
            {products?.map((product) => (
              <AnimatePresence key={product?.id}>
                <motion.div
                  layout
                  initial={{ opacity: 0.2 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ProductCard key={product?.id} product={product} />
                </motion.div>
              </AnimatePresence>
            ))}
          </>
        </div>
      ) 
      : (
        <NoProductAvailable selectedTab={selectedTab} />
      )}
    </Container>
  );
};

export default ProductGrid;
