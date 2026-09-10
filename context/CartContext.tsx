"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  getCart,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCartApi,
  CartAuthRequiredError,
  type CartItem,
  type CartData,
} from "@/lib/cart-api";

export type { CartItem };

interface CartContextValue {
  items: CartItem[];
  cartId?: string;
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
  isLoaded: boolean;
  // true khi chưa đăng nhập -> mọi thao tác giỏ hàng cần đăng nhập trước
  requiresLogin: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getItemByProductId: (productId: string) => CartItem | undefined;
  // true khi đang có request addCartItem cho đúng productId này đang chạy
  // -> AddToCart.tsx dùng để show spinner/disable nút, tránh cảm giác
  // "bấm không phản hồi" trong lúc chờ network (đặc biệt lúc backend
  // Railway cold-start, có thể mất vài giây cho request đầu tiên).
  isAddingToCart: (productId: string) => boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const EMPTY_CART: CartData = {
  cartId: "",
  items: [],
  totalItems: 0,
  totalQuantity: 0,
  totalAmount: 0,
  updatedAt: "",
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartData>(EMPTY_CART);
  const [isLoaded, setIsLoaded] = useState(false);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [pendingProductIds, setPendingProductIds] = useState<Set<string>>(
    new Set()
  );

  // Debounce cho updateQuantity: giữ nút +/- bấm liên tiếp trước đây bắn
  // 1 request PUT cho MỖI lần click (thấy rõ trên Network tab: 5 request
  // tuần tự ~600-800ms/request cho 5 lần bấm). Giờ chỉ gửi request THẬT
  // SỰ sau khi người dùng ngừng bấm 1 khoảng ngắn, còn UI cập nhật ngay
  // (optimistic) để cảm giác bấm mượt tức thì.
  const UPDATE_DEBOUNCE_MS = 500;
  const updateTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const pendingQuantitiesRef = useRef<Map<string, number>>(new Map());
  // Đánh dấu item nào đang có request PUT/DELETE bay tới server. Nếu 2
  // request cho CÙNG 1 item chạy chồng lên nhau, response có thể về
  // KHÔNG đúng thứ tự gửi đi (request cũ chạy lâu hơn, về sau) -> response
  // cũ (giá trị nhỏ hơn/lớn hơn) ghi đè lên state mới hơn, gây hiện tượng
  // UI nhảy ngược tạm thời rồi mới đúng lại. Ref này đảm bảo tại một thời
  // điểm chỉ có tối đa 1 request cho mỗi item, request tiếp theo phải đợi
  // request hiện tại xong.
  const inFlightItemIdsRef = useRef<Set<string>>(new Set());

  // Lấy giỏ hàng từ server. Tách riêng thành hàm để có thể gọi lại mỗi
  // khi user vừa đăng nhập (event "auth:login"), không chỉ lúc mount —
  // trước đây requiresLogin chỉ được xác định 1 lần lúc mount nên nếu
  // user đăng nhập xong (không reload trang), requiresLogin vẫn treo
  // ở true và AddToCart cứ điều hướng nhầm sang trang đăng nhập.
  const fetchCartFromServer = useCallback(async () => {
    try {
      const data = await getCart();
      setCart(data);
      setRequiresLogin(false);
    } catch (err) {
      if (err instanceof CartAuthRequiredError) {
        setRequiresLogin(true);
        setCart(EMPTY_CART);
      } else {
        console.error("Lỗi lấy giỏ hàng:", err);
      }
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchCartFromServer();

    // auth:login/auth:logout do lib/auth.ts bắn ra sau setToken/clearToken
    // -> đồng bộ lại trạng thái giỏ hàng ngay trong cùng tab, không cần
    // reload trang.
    const handleLogin = () => {
      fetchCartFromServer();
    };
    const handleLogout = () => {
      setCart(EMPTY_CART);
      setRequiresLogin(true);
    };

    window.addEventListener("auth:login", handleLogin);
    window.addEventListener("auth:logout", handleLogout);
    return () => {
      window.removeEventListener("auth:login", handleLogin);
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, [fetchCartFromServer]);

  const addToCart = useCallback(async (productId: string, quantity = 1) => {
    setPendingProductIds((prev) => new Set(prev).add(productId));
    try {
      const data = await addCartItem(productId, quantity);
      setCart(data);
      setRequiresLogin(false);
    } catch (err) {
      if (err instanceof CartAuthRequiredError) {
        setRequiresLogin(true);
      } else {
        console.error("Lỗi thêm sản phẩm vào giỏ:", err);
      }
    } finally {
      setPendingProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }, []);

  // Gửi request thật lên server, dùng giá trị quantity MỚI NHẤT đã ghi
  // nhận. Nếu đã có 1 request khác cho item này đang bay -> bỏ qua lần
  // gọi này (giá trị mới nhất vẫn còn trong pendingQuantitiesRef, sẽ được
  // gửi ngay khi request hiện tại xong, xem finally bên dưới) thay vì bắn
  // thêm 1 request song song.
  const commitQuantityUpdate = useCallback(
    async (itemId: string) => {
      updateTimeoutsRef.current.delete(itemId);

      if (inFlightItemIdsRef.current.has(itemId)) {
        return;
      }

      const quantity = pendingQuantitiesRef.current.get(itemId);
      if (quantity === undefined) return;

      inFlightItemIdsRef.current.add(itemId);
      try {
        let data: CartData;
        if (quantity <= 0) {
          await removeCartItem(itemId);
          data = await getCart();
        } else {
          data = await updateCartItemQuantity(itemId, quantity);
        }

        // Trong lúc request này bay, nếu người dùng đã bấm thêm (giá trị
        // pending hiện tại KHÁC giá trị vừa gửi) -> response này đã lỗi
        // thời. Áp dụng nó sẽ đè state đã tiến xa hơn về một giá trị cũ
        // hơn, gây "nhảy loạn" (vd giảm từ 5 xuống 1, response xác nhận
        // quantity=4 về sau khiến UI bật ngược lên 4 trước khi nhảy lại
        // xuống 1). Bỏ qua, để request kế tiếp (bắn ngay ở finally) tự
        // mang về giá trị đúng cuối cùng.
        const stillLatest = pendingQuantitiesRef.current.get(itemId) === quantity;
        if (stillLatest) {
          setCart(data);
          pendingQuantitiesRef.current.delete(itemId);
        }
      } catch (err) {
        if (err instanceof CartAuthRequiredError) {
          setRequiresLogin(true);
        } else {
          console.error("Lỗi cập nhật số lượng:", err);
          // Optimistic update có thể đã sai lệch so với server (vd hết
          // hàng giữa chừng) -> đồng bộ lại cho chắc.
          fetchCartFromServer();
        }
      } finally {
        inFlightItemIdsRef.current.delete(itemId);
        // Trong lúc request vừa rồi chạy, nếu người dùng bấm thêm (còn
        // giá trị pending khác giá trị vừa gửi) -> gửi tiếp NGAY, không
        // cần đợi thêm 500ms debounce nữa.
        if (pendingQuantitiesRef.current.has(itemId)) {
          commitQuantityUpdate(itemId);
        }
      }
    },
    [fetchCartFromServer]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const clampedQty = Math.max(0, quantity);

      // 1. Cập nhật UI ngay lập tức (optimistic), chưa gọi API.
      // Về 0 -> xoá HẲN khỏi mảng items ngay, không chỉ set quantity:0 —
      // nếu chỉ set quantity:0, những nơi render trực tiếp theo mảng
      // items (vd trang /cart) sẽ vẫn hiển thị dòng đó cho tới khi
      // getCart() thật sự trả về sau debounce + network (~1s), gây cảm
      // giác "phải đợi mới mất".
      setCart((prev) => {
        const items =
          clampedQty <= 0
            ? prev.items.filter((item) => item.id !== itemId)
            : prev.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      quantity: clampedQty,
                      subtotal: item.unitPrice * clampedQty,
                    }
                  : item
              );
        return {
          ...prev,
          items,
          totalItems: items.length,
          totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
          totalAmount: items.reduce((sum, i) => sum + i.subtotal, 0),
        };
      });

      // 2. Ghi nhận giá trị mới nhất, huỷ timeout cũ (nếu có) và đặt lại
      // -> nhiều lần bấm liên tiếp chỉ tạo ra 1 request duy nhất, gửi đi
      // sau khi người dùng ngừng bấm UPDATE_DEBOUNCE_MS.
      pendingQuantitiesRef.current.set(itemId, clampedQty);

      const existingTimeout = updateTimeoutsRef.current.get(itemId);
      if (existingTimeout) clearTimeout(existingTimeout);

      const timeout = setTimeout(() => {
        commitQuantityUpdate(itemId);
      }, UPDATE_DEBOUNCE_MS);
      updateTimeoutsRef.current.set(itemId, timeout);
    },
    [commitQuantityUpdate]
  );

  // Huỷ hết timeout đang chờ khi CartProvider unmount, tránh gọi setState
  // sau khi component đã gỡ bỏ.
  useEffect(() => {
    return () => {
      updateTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      updateTimeoutsRef.current.clear();
    };
  }, []);

  const removeFromCart = useCallback(async (itemId: string) => {
    // Huỷ mọi debounce update số lượng đang chờ cho item này, tránh nó
    // commit lại sau khi item đã bị xoá.
    const existingTimeout = updateTimeoutsRef.current.get(itemId);
    if (existingTimeout) clearTimeout(existingTimeout);
    updateTimeoutsRef.current.delete(itemId);
    pendingQuantitiesRef.current.delete(itemId);

    try {
      await removeCartItem(itemId);
      // Endpoint DELETE chưa xác nhận trả về cart mới nhất -> gọi lại GET
      // để đảm bảo state khớp thực tế trên server.
      const data = await getCart();
      setCart(data);
    } catch (err) {
      if (err instanceof CartAuthRequiredError) {
        setRequiresLogin(true);
      } else {
        console.error("Lỗi xóa sản phẩm khỏi giỏ:", err);
      }
    }
  }, []);

  const clearCart = useCallback(async () => {
    // Huỷ toàn bộ debounce đang chờ vì cả giỏ sắp bị xoá.
    updateTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    updateTimeoutsRef.current.clear();
    pendingQuantitiesRef.current.clear();

    try {
      await clearCartApi();
      const data = await getCart();
      setCart(data);
    } catch (err) {
      if (err instanceof CartAuthRequiredError) {
        setRequiresLogin(true);
      } else {
        console.error("Lỗi xóa toàn bộ giỏ hàng:", err);
      }
    }
  }, []);

  const getItemByProductId = useCallback(
    (productId: string) => cart.items.find((item) => item.productId === productId),
    [cart.items]
  );

  const isAddingToCart = useCallback(
    (productId: string) => pendingProductIds.has(productId),
    [pendingProductIds]
  );

  const value: CartContextValue = {
    items: cart.items,
    cartId: cart.cartId,
    totalItems: cart.totalItems,
    totalQuantity: cart.totalQuantity,
    totalAmount: cart.totalAmount,
    isLoaded,
    requiresLogin,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getItemByProductId,
    isAddingToCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart phải được dùng bên trong CartProvider");
  }
  return context;
};