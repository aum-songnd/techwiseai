import React from 'react'
import { Button } from './ui/button'
import { ShoppingBag } from 'lucide-react'
import { Product } from "../app/data/types";

interface AddToCartProps {
  product: Product & { categories?: string[] };
}

const AddToCart = ({ product }: AddToCartProps) => {
  const isOutOfStock = product?.stock === 0;

  return (
    <div>
      <Button disabled={isOutOfStock}>
        <ShoppingBag />
        {isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}
      </Button>
    </div>
  );
};

export default AddToCart;