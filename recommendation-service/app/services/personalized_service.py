import json
import logging
import math
import time
from datetime import datetime, timezone
from typing import Any

from app.core.database import get_database_connection
from app.schemas.recommendation import (
    CategoryDetail,
    ProductDetail,
    RecommendationItem,
    ForYouResponse,
)

logger = logging.getLogger("uvicorn.error")

HALF_LIFE_SECONDS = 7.0 * 24 * 3600  # 7 ngày
LN2 = math.log(2.0)
VECTOR_DIM = 384

EVENT_WEIGHTS = {
    "VIEW": 1.0,
    "PRODUCT_VIEW": 1.0,
    "CLICK": 1.0,
    "PRODUCT_CLICK": 1.0,
    "FAVORITE": 2.0,
    "ADD_TO_CART": 3.0,
    "PURCHASE": 5.0,
}


class PersonalizedService:
    def __init__(self) -> None:
        pass

    def record_interaction(
        self,
        product_id: str,
        event_type: str,
        session_id: str | None = None,
        user_id: str | None = None,
        duration_seconds: int | None = None,
        metadata: str | None = None,
    ) -> dict[str, Any]:
        """Ghi nhận tương tác người dùng và cập nhật vector hồ sơ bất đồng bộ/trực tiếp."""
        effective_session = session_id or (f"u:{user_id}" if user_id else "anon:default")
        norm_event = event_type.upper()

        with get_database_connection() as conn:
            with conn.cursor() as cur:
                # Chống trùng lặp trong 15s
                cur.execute(
                    """
                    SELECT COUNT(*) FROM user_interaction_events
                    WHERE session_id = %s AND product_id = %s::uuid AND event_type = %s
                      AND created_at >= NOW() - INTERVAL '15 seconds'
                    """,
                    (effective_session, product_id, norm_event),
                )
                if cur.fetchone()[0] > 0:
                    return {"status": "SKIPPED", "reason": "duplicate_within_15s"}

                # Insert event
                cur.execute(
                    """
                    INSERT INTO user_interaction_events (
                        id, user_id, session_id, product_id, event_type, duration_seconds, metadata, created_at
                    ) VALUES (
                        gen_random_uuid(), %s, %s, %s::uuid, %s, %s, %s, NOW()
                    ) RETURNING id
                    """,
                    (
                        user_id if user_id else None,
                        effective_session,
                        product_id,
                        norm_event,
                        duration_seconds,
                        metadata,
                    ),
                )
                event_id = str(cur.fetchone()[0])
            conn.commit()

        # Cập nhật hồ sơ người dùng
        self.recalculate_profile(effective_session, user_id)
        return {"status": "RECORDED", "id": event_id}

    def recalculate_profile(self, session_id: str, user_id: str | None = None) -> None:
        """Tính toán lại User Profile Vector từ lịch sử tương tác 30 ngày qua."""
        with get_database_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT e.event_type, e.duration_seconds, e.created_at,
                           p.id, p.price, c.name, p.embedding::text
                    FROM user_interaction_events e
                    JOIN products p ON e.product_id = p.id
                    LEFT JOIN categories c ON p.category_id = c.id
                    WHERE (e.session_id = %s OR (%s::uuid IS NOT NULL AND e.user_id = %s::uuid))
                      AND e.created_at >= NOW() - INTERVAL '30 days'
                    ORDER BY e.created_at DESC
                    LIMIT 100
                    """,
                    (session_id, user_id, user_id),
                )
                rows = cur.fetchall()

                if not rows:
                    return

                total_weight = 0.0
                vec_accum = [0.0] * VECTOR_DIM
                now = datetime.now(timezone.utc)
                cat_weights: dict[str, float] = {}
                price_weight = 0.0
                price_sum = 0.0

                for row in rows:
                    ev_type, duration, created_at, p_id, price, cat_name, emb_str = row
                    base_w = EVENT_WEIGHTS.get(ev_type, 1.0)
                    if ev_type in ("VIEW", "PRODUCT_VIEW") and duration is not None and duration < 4:
                        base_w = 0.5

                    delta_sec = max(0.0, (now - created_at).total_seconds())
                    decay = math.exp(-1.0 * (LN2 * delta_sec) / HALF_LIFE_SECONDS)
                    final_w = base_w * decay

                    if emb_str and emb_str.startswith("["):
                        try:
                            v = json.loads(emb_str)
                            if isinstance(v, list) and len(v) == VECTOR_DIM:
                                for i in range(VECTOR_DIM):
                                    vec_accum[i] += float(v[i]) * final_w
                                total_weight += final_w
                        except Exception:
                            pass

                    if cat_name:
                        cat_weights[cat_name] = cat_weights.get(cat_name, 0.0) + final_w

                    if price and float(price) > 0:
                        price_sum += float(price) * final_w
                        price_weight += final_w

                top_categories = sorted(cat_weights.keys(), key=lambda k: cat_weights[k], reverse=True)[:3]
                min_p, max_p = 0.0, 0.0
                if price_weight > 0:
                    avg_p = price_sum / price_weight
                    min_p = max(0.0, avg_p * 0.65)
                    max_p = avg_p * 1.35

                profile_vec_literal = None
                if total_weight > 0:
                    for i in range(VECTOR_DIM):
                        vec_accum[i] /= total_weight
                    norm = math.sqrt(sum(x * x for x in vec_accum))
                    if norm > 1e-6:
                        normalized = [round(x / norm, 6) for x in vec_accum]
                        profile_vec_literal = f"[{','.join(str(x) for x in normalized)}]"

                # Upsert profile
                cur.execute(
                    """
                    INSERT INTO user_recommendation_profiles (
                        id, user_id, session_id, favorite_categories,
                        preferred_price_min, preferred_price_max,
                        interaction_count, last_active_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), %s, %s, %s::jsonb, %s, %s, %s, NOW(), NOW()
                    )
                    ON CONFLICT (session_id) DO UPDATE SET
                        user_id = COALESCE(EXCLUDED.user_id, user_recommendation_profiles.user_id),
                        favorite_categories = EXCLUDED.favorite_categories,
                        preferred_price_min = EXCLUDED.preferred_price_min,
                        preferred_price_max = EXCLUDED.preferred_price_max,
                        interaction_count = EXCLUDED.interaction_count,
                        last_active_at = NOW(),
                        updated_at = NOW()
                    RETURNING id
                    """,
                    (
                        user_id if user_id else None,
                        session_id,
                        json.dumps(top_categories),
                        min_p,
                        max_p,
                        len(rows),
                    ),
                )
                profile_id = cur.fetchone()[0]

                if profile_vec_literal:
                    cur.execute(
                        """
                        UPDATE user_recommendation_profiles
                        SET profile_vector = %s::vector
                        WHERE id = %s
                        """,
                        (profile_vec_literal, profile_id),
                    )
            conn.commit()

    def get_for_you_recommendations(
        self,
        session_id: str | None = None,
        user_id: str | None = None,
        limit: int = 8,
    ) -> ForYouResponse:
        """Gợi ý 'Dành riêng cho bạn' theo kiến trúc Dynamic Weighting & Vector Profile."""
        effective_session = session_id or (f"u:{user_id}" if user_id else "anon:default")
        safe_limit = max(1, min(limit, 24))

        with get_database_connection() as conn:
            with conn.cursor() as cur:
                # 1. Lọc sản phẩm đã mua gần đây (30 ngày)
                cur.execute(
                    """
                    SELECT DISTINCT product_id FROM user_interaction_events
                    WHERE (session_id = %s OR (%s::uuid IS NOT NULL AND user_id = %s::uuid))
                      AND event_type = 'PURCHASE'
                      AND created_at >= NOW() - INTERVAL '30 days'
                    """,
                    (effective_session, user_id, user_id),
                )
                purchased_ids = [str(r[0]) for r in cur.fetchall()]

                # 2. Tìm hồ sơ người dùng
                cur.execute(
                    """
                    SELECT id, interaction_count, favorite_categories,
                           preferred_price_min, preferred_price_max,
                           (profile_vector IS NOT NULL) as has_vector,
                           profile_vector::text
                    FROM user_recommendation_profiles
                    WHERE session_id = %s OR (%s::uuid IS NOT NULL AND user_id = %s::uuid)
                    ORDER BY updated_at DESC LIMIT 1
                    """,
                    (effective_session, user_id, user_id),
                )
                profile_row = cur.fetchone()

        n_interactions = profile_row[1] if profile_row else 0
        preferred_category = None
        has_vector = False
        profile_vec_str = None

        if profile_row:
            try:
                cats = profile_row[2] if isinstance(profile_row[2], list) else json.loads(profile_row[2] or "[]")
                if cats:
                    preferred_category = cats[0]
            except Exception:
                pass
            has_vector = bool(profile_row[5])
            profile_vec_str = profile_row[6]

        # Dynamic weights calculation
        if n_interactions <= 0:
            mode = "COLD_START"
            vector_w = 0.0
            title = "Gợi ý nổi bật dành cho bạn"
            subtitle = "Sản phẩm công nghệ bán chạy và được đánh giá cao nhất"
        elif n_interactions <= 2:
            mode = "EXPLORING"
            vector_w = 0.10
            title = "Khám phá thêm dành cho bạn"
            subtitle = "Gợi ý mở rộng dựa trên sản phẩm bạn vừa xem gần đây"
        elif n_interactions <= 5:
            mode = "EXPLORING"
            vector_w = 0.30
            title = f"Gợi ý {preferred_category} phù hợp với bạn" if preferred_category else "Gợi ý phù hợp với bạn"
            subtitle = "Dựa trên sở thích công nghệ và tầm giá bạn quan tâm"
        elif n_interactions <= 10:
            mode = "PERSONALIZED"
            vector_w = 0.50
            title = f"Dành riêng cho bạn - {preferred_category}" if preferred_category else "Dành riêng cho bạn"
            subtitle = "Cá nhân hóa theo hành vi mua sắm và sở thích cấu hình"
        else:
            mode = "PERSONALIZED"
            vector_w = 0.60
            title = f"Dành riêng cho bạn - {preferred_category}" if preferred_category else "Dành riêng cho bạn"
            subtitle = "Thuật toán học sâu từ lịch sử tương tác và quan tâm của bạn"

        # Lấy sản phẩm nổi bật / cold-start
        trending_items = self._fetch_trending_items(purchased_ids, safe_limit)

        if mode == "COLD_START" or not has_vector or not profile_vec_str:
            return ForYouResponse(
                success=True,
                message="Lấy danh sách sản phẩm gợi ý dành riêng cho bạn thành công",
                mode=mode,
                title=title,
                subtitle=subtitle,
                interactionCount=n_interactions,
                preferredCategory=preferred_category,
                data=trending_items,
            )

        # Lấy sản phẩm theo vector người dùng
        vector_items = self._fetch_vector_items(profile_vec_str, purchased_ids, safe_limit * 2, preferred_category)

        # Kết hợp theo trọng số
        target_vec_count = max(1, int(round(safe_limit * vector_w)))
        final_items: list[RecommendationItem] = []
        seen_ids = set()

        for item in vector_items:
            if len(final_items) >= target_vec_count:
                break
            if item.product.id not in seen_ids:
                seen_ids.add(item.product.id)
                final_items.append(item)

        for item in trending_items:
            if len(final_items) >= safe_limit:
                break
            if item.product.id not in seen_ids:
                seen_ids.add(item.product.id)
                final_items.append(item)

        for item in vector_items:
            if len(final_items) >= safe_limit:
                break
            if item.product.id not in seen_ids:
                seen_ids.add(item.product.id)
                final_items.append(item)

        return ForYouResponse(
            success=True,
            message="Lấy danh sách sản phẩm gợi ý dành riêng cho bạn thành công",
            mode=mode,
            title=title,
            subtitle=subtitle,
            interactionCount=n_interactions,
            preferredCategory=preferred_category,
            data=final_items,
        )

    def _fetch_trending_items(self, excluded_ids: list[str], limit: int) -> list[RecommendationItem]:
        """Truy xuất các sản phẩm thịnh hành, bán chạy nhất cho Cold Start."""
        with get_database_connection() as conn:
            with conn.cursor() as cur:
                exclude_clause = ""
                params: list[Any] = []
                if excluded_ids:
                    exclude_clause = "AND p.id != ALL(%s::uuid[])"
                    params.append(excluded_ids)

                sql = f"""
                    SELECT p.id, p.name, p.slug, p.sku, p.brand, p.short_description, p.description,
                           p.thumbnail_url, p.price, p.original_price, p.stock_quantity,
                           p.rating_average, p.review_count, p.featured, p.hot, p.specifications,
                           c.id, c.name, c.slug, c.description, c.image_url, c.display_order
                    FROM products p
                    JOIN categories c ON p.category_id = c.id
                    WHERE p.active = true AND c.active = true AND p.stock_quantity > 0
                      {exclude_clause}
                    ORDER BY p.featured DESC, p.hot DESC, p.rating_average DESC, p.review_count DESC, p.created_at DESC
                    LIMIT %s
                """
                params.append(limit)
                cur.execute(sql, tuple(params))
                rows = cur.fetchall()

        results = []
        for idx, r in enumerate(rows):
            cat = CategoryDetail(
                id=str(r[16]),
                name=r[17],
                slug=r[18],
                description=r[19],
                imageUrl=r[20],
                displayOrder=r[21] or 0,
            )
            price = float(r[8])
            orig_price = float(r[9]) if r[9] else None
            discount_pct = round((orig_price - price) / orig_price * 100) if orig_price and orig_price > price else 0

            prod = ProductDetail(
                id=str(r[0]),
                name=r[1],
                slug=r[2],
                sku=r[3],
                brand=r[4],
                shortDescription=r[5],
                description=r[6],
                thumbnailUrl=r[7],
                category=cat,
                price=price,
                originalPrice=orig_price,
                discountPercent=discount_pct,
                stockQuantity=r[10],
                ratingAverage=float(r[11] or 0.0),
                reviewCount=r[12] or 0,
                featured=bool(r[13]),
                hot=bool(r[14]),
                onSale=discount_pct > 0,
                inStock=r[10] > 0,
                active=True,
                specifications=r[15] if isinstance(r[15], dict) else {},
            )
            badge = "BEST" if idx == 0 else ("HOT" if idx < 3 else None)
            reason = "Top 1 sản phẩm bán chạy nhất" if idx == 0 else "Được cộng đồng công nghệ quan tâm và đánh giá cao"

            results.append(
                RecommendationItem(
                    product=prod,
                    badge=badge,
                    reason=reason,
                    keySpecs={},
                    score=round(max(0.5, 0.95 - idx * 0.05), 2),
                )
            )
        return results

    def _fetch_vector_items(
        self,
        vec_literal: str,
        excluded_ids: list[str],
        limit: int,
        preferred_category: str | None = None,
    ) -> list[RecommendationItem]:
        """Truy xuất các sản phẩm theo User Profile Vector (pgvector cosine similarity)."""
        with get_database_connection() as conn:
            with conn.cursor() as cur:
                exclude_clause = ""
                params: list[Any] = [vec_literal]
                if excluded_ids:
                    exclude_clause = "AND p.id != ALL(%s::uuid[])"
                    params.append(excluded_ids)
                params.append(limit)

                sql = f"""
                    SELECT p.id, p.name, p.slug, p.sku, p.brand, p.short_description, p.description,
                           p.thumbnail_url, p.price, p.original_price, p.stock_quantity,
                           p.rating_average, p.review_count, p.featured, p.hot, p.specifications,
                           c.id, c.name, c.slug, c.description, c.image_url, c.display_order,
                           1 - (p.embedding <=> %s::vector) as similarity
                    FROM products p
                    JOIN categories c ON p.category_id = c.id
                    WHERE p.active = true AND c.active = true AND p.stock_quantity > 0
                      AND p.embedding IS NOT NULL
                      {exclude_clause}
                    ORDER BY p.embedding <=> %s::vector
                    LIMIT %s
                """
                # vec_literal is used twice in query
                cur.execute(sql, (vec_literal, *( [excluded_ids] if excluded_ids else [] ), vec_literal, limit))
                rows = cur.fetchall()

        results = []
        for idx, r in enumerate(rows):
            cat = CategoryDetail(
                id=str(r[16]),
                name=r[17],
                slug=r[18],
                description=r[19],
                imageUrl=r[20],
                displayOrder=r[21] or 0,
            )
            price = float(r[8])
            orig_price = float(r[9]) if r[9] else None
            discount_pct = round((orig_price - price) / orig_price * 100) if orig_price and orig_price > price else 0
            sim = float(r[22])
            match_pct = round(sim * 100)

            prod = ProductDetail(
                id=str(r[0]),
                name=r[1],
                slug=r[2],
                sku=r[3],
                brand=r[4],
                shortDescription=r[5],
                description=r[6],
                thumbnailUrl=r[7],
                category=cat,
                price=price,
                originalPrice=orig_price,
                discountPercent=discount_pct,
                stockQuantity=r[10],
                ratingAverage=float(r[11] or 0.0),
                reviewCount=r[12] or 0,
                featured=bool(r[13]),
                hot=bool(r[14]),
                onSale=discount_pct > 0,
                inStock=r[10] > 0,
                active=True,
                specifications=r[15] if isinstance(r[15], dict) else {},
            )
            badge = "FOR_YOU" if idx == 0 else ("CHOICE" if idx < 3 else None)
            if idx == 0:
                reason = f"Phù hợp {match_pct}% với gu công nghệ của bạn"
            elif preferred_category and cat.name.lower() == preferred_category.lower():
                reason = f"Đúng danh mục {preferred_category} bạn đang tìm kiếm"
            else:
                reason = f"Cấu hình và tầm giá tương thích hành vi gần đây ({match_pct}%)"

            results.append(
                RecommendationItem(
                    product=prod,
                    badge=badge,
                    reason=reason,
                    keySpecs={},
                    score=round(sim, 3),
                )
            )
        return results


_personalized_service: PersonalizedService | None = None


def get_personalized_service() -> PersonalizedService:
    global _personalized_service
    if _personalized_service is None:
        _personalized_service = PersonalizedService()
    return _personalized_service
