"use client";
import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import ProductCard from "./ProductCard";
import NoProductAvailable from "./NoProductAvailable";
import Container from "./Container";
import HomeTabBar from "./HomeTabBar";
import { Product } from "../app/data/types";
import { useHomeProductFeed } from "./HomeProductFeed";

type TabKey = "best-seller" | "new";

const TABS: { key: TabKey; title: string }[] = [
  { key: "best-seller", title: "Sản phẩm bán chạy" },
  { key: "new", title: "Mới ra mắt" },
];

const PRODUCTS_LIMIT = 15;

type ProductExtras = {
  soldCount?: number;
  sold?: number;
  createdAt?: string;
};

const extras = (p: Product) => p as unknown as ProductExtras;
const getSold = (p: Product) => extras(p).soldCount ?? extras(p).sold ?? 0;
const getCreatedAt = (p: Product) => {
  const t = Date.parse(extras(p).createdAt ?? "");
  return Number.isNaN(t) ? 0 : t;
};

const ProductGrid = () => {
  const products = useHomeProductFeed();
  const [selectedTabKey, setSelectedTabKey] = useState<TabKey>("best-seller");

  const listsByTab = useMemo(() => {

    const best = [...products]
      .sort(
        (a, b) =>
          getSold(b) - getSold(a) ||
          Number(b.status === "hot") - Number(a.status === "hot")
      )
      .slice(0, PRODUCTS_LIMIT);

    const fresh = [...products]
      .sort(
        (a, b) =>
          Number(b.status === "new") - Number(a.status === "new") ||
          getCreatedAt(b) - getCreatedAt(a)
      )
      .slice(0, PRODUCTS_LIMIT);

    return { "best-seller": best, new: fresh };
  }, [products]);

  const selectedTab = TABS.find((t) => t.key === selectedTabKey) ?? TABS[0];
  const visible = listsByTab[selectedTab.key];

  return (
    <Container className="flex flex-col lg:px-0 my-10">
      <HomeTabBar
        tabs={TABS.map((t) => t.title)}
        selectedTab={selectedTab.title}
        onTabSelect={(title: string) => {
          const matched = TABS.find((t) => t.title === title);
          if (matched) setSelectedTabKey(matched.key);
        }}
      />

      {visible.length ? (
        <motion.div
          key={selectedTab.key}
          initial={{ opacity: 0.2 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-6"
        >
          {visible.map((product) => (
            <div key={product.id} className="h-full">
              <ProductCard product={product} />
            </div>
          ))}
        </motion.div>
      ) : (
        <NoProductAvailable selectedTab={selectedTab.title} />
      )}
    </Container>
  );
};

export default ProductGrid;