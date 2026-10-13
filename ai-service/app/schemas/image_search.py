from pydantic import BaseModel


class CategoryResult(BaseModel):
    id: str
    name: str
    slug: str


class ProductSearchResult(BaseModel):
    rank: int
    productId: str
    sku: str
    name: str
    brand: str | None
    price: float
    originalPrice: float | None
    thumbnailUrl: str | None
    shortDescription: str | None
    ratingAverage: float
    reviewCount: int
    stockQuantity: int
    category: CategoryResult
    imageCount: int
    imageWeight: float
    textWeight: float
    imageSimilarity: float
    textSimilarity: float
    similarity: float


class ImageSearchData(BaseModel):
    queryFileName: str
    topK: int
    resultCount: int
    processingTimeMs: int
    results: list[ProductSearchResult]


class ImageSearchResponse(BaseModel):
    success: bool
    message: str
    data: ImageSearchData