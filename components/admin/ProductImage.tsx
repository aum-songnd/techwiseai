import { ImageOff, type LucideIcon } from "lucide-react";

type ProductImageProps = {
  src?: string;
  alt: string;
  className: string;
  fit?: "cover" | "contain";
  fallbackIcon?: LucideIcon;
  fallbackIconClassName?: string;
};

const ProductImage = ({
  src,
  alt,
  className,
  fit = "cover",
  fallbackIcon: FallbackIcon = ImageOff,
  fallbackIconClassName = "h-12 w-12",
}: ProductImageProps) => {
  if (!src) {
    return (
      <div className={`${className} flex items-center justify-center text-gray-300`}>
        <FallbackIcon className={fallbackIconClassName} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} object-${fit}`}
    />
  );
};

export default ProductImage;