"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
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

  requiresLogin: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  getItemByProductId: (productId: string) => CartItem | undefined;

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

  const UPDATE_DEBOUNCE_MS = 500;
  const updateTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const pendingQuantitiesRef = useRef<Map<string, number>>(new Map());

  const inFlightItemIdsRef = useRef<Set<string>>(new Set());

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

      }
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchCartFromServer();

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

      }
    } finally {
      setPendingProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }, []);

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
        let data: CartData | undefined;
        if (quantity <= 0) {
          await removeCartItem(itemId);
        } else {
          data = await updateCartItemQuantity(itemId, quantity);
        }

        const stillLatest = pendingQuantitiesRef.current.get(itemId) === quantity;
        if (stillLatest) {
          if (data) setCart(data);
          pendingQuantitiesRef.current.delete(itemId);
        }
      } catch (err) {
        if (err instanceof CartAuthRequiredError) {
          pendingQuantitiesRef.current.delete(itemId);
          setRequiresLogin(true);
        } else if (pendingQuantitiesRef.current.get(itemId) === quantity) {
          pendingQuantitiesRef.current.delete(itemId);
          fetchCartFromServer();
        }
      } finally {
        inFlightItemIdsRef.current.delete(itemId);

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

  useEffect(() => {
    const timeouts = updateTimeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  const removeFromCart = useCallback(
    async (itemId: string) => {

      const existingTimeout = updateTimeoutsRef.current.get(itemId);
      if (existingTimeout) clearTimeout(existingTimeout);
      updateTimeoutsRef.current.delete(itemId);
      pendingQuantitiesRef.current.delete(itemId);

      setCart((prev) => {
        const items = prev.items.filter((item) => item.id !== itemId);
        return {
          ...prev,
          items,
          totalItems: items.length,
          totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
          totalAmount: items.reduce((sum, i) => sum + i.subtotal, 0),
        };
      });

      try {
        await removeCartItem(itemId);
      } catch (err) {
        if (err instanceof CartAuthRequiredError) {
          setRequiresLogin(true);
        } else {

          fetchCartFromServer();
        }
      }
    },
    [fetchCartFromServer]
  );

  const clearCart = useCallback(async () => {

    updateTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    updateTimeoutsRef.current.clear();
    pendingQuantitiesRef.current.clear();

    setCart((prev) => ({ ...EMPTY_CART, cartId: prev.cartId }));

    try {
      await clearCartApi();
    } catch (err) {
      if (err instanceof CartAuthRequiredError) {
        setRequiresLogin(true);
      } else {

        fetchCartFromServer();
      }
    }
  }, [fetchCartFromServer]);

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