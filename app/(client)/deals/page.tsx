// app/(client)/deals/page.tsx
import React from "react";
import Deals from "@/components/Deals";
import { getHotProducts } from "@/constants/queriesDealsPage";

const DealsPage = async () => {
  const products = await getHotProducts();

  return (
    <div className="bg-white">
      <Deals products={products} />
    </div>
  );
};

export default DealsPage;