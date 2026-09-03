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
      <Button disabled={isOutOfStock}  className='bg-shop_dark_green/90 rounded-2xl px-6 py-4 text-white text-sm hover:bg-shop_dark_green hover:text-white transition-colors duration-300'>
        <ShoppingBag />
        {isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}
      </Button>
    </div>
  );
};

export default AddToCart;