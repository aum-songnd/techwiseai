from typing import Any
from pydantic import BaseModel


class CategoryDetail(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    imageUrl: str | None = None
    displayOrder: int = 0


class ProductDetail(BaseModel):
    id: str
    name: str
    slug: str
    sku: str
    brand: str | None = None
    shortDescription: str | None = None
    description: str | None = None
    thumbnailUrl: str | None = None
    category: CategoryDetail
    price: float
    originalPrice: float | None = None
    discountPercent: int = 0
    stockQuantity: int = 0
    ratingAverage: float = 0.0
    reviewCount: int = 0
    featured: bool = False
    hot: bool = False
    onSale: bool = False
    inStock: bool = True
    active: bool = True
    specifications: dict[str, str] = {}


class RecommendationItem(BaseModel):
    product: ProductDetail
    badge: str | None = None
    reason: str | None = None
    keySpecs: dict[str, str] = {}
    score: float = 0.0



class InteractionCreateRequest(BaseModel):
    productId: str
    eventType: str
    sessionId: str | None = None
    userId: str | None = None
    durationSeconds: int | None = None
    metadata: str | None = None


class ForYouResponse(BaseModel):
    success: bool = True
    message: str = "Lấy danh sách sản phẩm gợi ý dành riêng cho bạn thành công"
    mode: str
    title: str
    subtitle: str
    interactionCount: int = 0
    preferredCategory: str | None = None
    data: list[RecommendationItem]
