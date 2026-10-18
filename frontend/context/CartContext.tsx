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
  invalidateCartCache,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCartApi,
  CartAuthRequiredError,
  type CartItem,
  type CartData,
} from "@/lib/cart-api";
import { broadcastTabEvent, subscribeTabSync } from "@/lib/tab-sync";

export type { CartItem };

interface CartContextValue {
  items: CartItem[];
  cartId?: string;
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
  isLoaded: boolean;

  requiresLogin: boolean;
  addToCart: (
    productId: string,
    quantity?: number,
    optimisticItem?: Partial<CartItem>
  ) => Promise<void>;
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

const isSameProduct = (id1?: string, id2?: string) =>
  !!id1 && !!id2 && id1.trim().toLowerCase() === id2.trim().toLowerCase();

const isSameItem = (id1?: string, id2?: string) =>
  !!id1 && !!id2 && id1.trim().toLowerCase() === id2.trim().toLowerCase();

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartData>(EMPTY_CART);
  const cartRef = useRef<CartData>(EMPTY_CART);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

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
  const pendingDeleteIdsRef = useRef<Set<string>>(new Set());
  const deleteQueueRef = useRef<string[]>([]);
  const isProcessingDeleteQueueRef = useRef(false);

  const fetchCartFromServer = useCallback(async () => {
    // If deletions are actively in flight, don't overwrite with stale server data
    if (pendingDeleteIdsRef.current.size > 0) {
      return;
    }

    try {
      const data = await getCart();
      setCart((currentCart) => {
        // Exclude any items that are currently pending deletion
        const validServerItems = data.items.filter(
          (item) => !pendingDeleteIdsRef.current.has(item.id)
        );

        // Keep any pending optimistic items not yet present in data
        const tempItems = currentCart.items.filter((item) =>
          item.id.startsWith("temp-")
        );
        if (
          tempItems.length === 0 &&
          validServerItems.length === data.items.length
        ) {
          return data;
        }

        const merged = [...validServerItems];
        for (const temp of tempItems) {
          if (!merged.some((it) => isSameProduct(it.productId, temp.productId))) {
            merged.push(temp);
          }
        }
        return {
          ...data,
          items: merged,
          totalItems: merged.length,
          totalQuantity: merged.reduce((s, it) => s + it.quantity, 0),
          totalAmount: merged.reduce((s, it) => s + it.subtotal, 0),
        };
      });
      setRequiresLogin(false);
    } catch (err) {
      if (err instanceof CartAuthRequiredError) {
        setRequiresLogin(true);
        setCart(EMPTY_CART);
      }
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchCartFromServer();

    const handleLogin = () => {
      invalidateCartCache();
      fetchCartFromServer();
    };
    const handleLogout = () => {
      invalidateCartCache();
      setCart(EMPTY_CART);
      setRequiresLogin(true);
    };

    const unsubscribeSync = subscribeTabSync((event) => {
      if (event.type === "CART_UPDATED") {
        invalidateCartCache();
        // If this tab is in the middle of active deletions, debounce updates or in-flight mutations,
        // do not overwrite this tab's optimistic state
        if (
          pendingDeleteIdsRef.current.size > 0 ||
          pendingQuantitiesRef.current.size > 0 ||
          inFlightItemIdsRef.current.size > 0
        ) {
          return;
        }

        if (event.payload?.cart) {
          setCart(event.payload.cart);
        } else {
          fetchCartFromServer();
        }
      }
    });

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        pendingDeleteIdsRef.current.size === 0 &&
        deleteQueueRef.current.length === 0
      ) {
        invalidateCartCache();
        fetchCartFromServer();
      }
    };

    window.addEventListener("auth:login", handleLogin);
    window.addEventListener("auth:logout", handleLogout);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribeSync();
      window.removeEventListener("auth:login", handleLogin);
      window.removeEventListener("auth:logout", handleLogout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchCartFromServer]);

  const addToCart = useCallback(
    async (
      productId: string,
      quantity = 1,
      optimisticItem?: Partial<CartItem>
    ) => {
      // Optimistically update cart state immediately
      setCart((prev) => {
        const existingIndex = prev.items.findIndex((item) =>
          isSameProduct(item.productId, productId)
        );

        let newItems: CartItem[];
        if (existingIndex >= 0) {
          newItems = prev.items.map((item, idx) => {
            if (idx === existingIndex) {
              const newQty = item.quantity + quantity;
              return {
                ...item,
                quantity: newQty,
                subtotal: item.unitPrice * newQty,
              };
            }
            return item;
          });
        } else {
          const unitPrice =
            optimisticItem?.unitPrice ??
            optimisticItem?.originalPrice ??
            0;
          const newItem: CartItem = {
            id: optimisticItem?.id ?? `temp-${productId}`,
            productId,
            name: optimisticItem?.name ?? "Sản phẩm",
            sku: optimisticItem?.sku,
            slug: optimisticItem?.slug,
            thumbnailUrl: optimisticItem?.thumbnailUrl,
            unitPrice,
            originalPrice: optimisticItem?.originalPrice,
            quantity,
            subtotal: unitPrice * quantity,
            stockQuantity: optimisticItem?.stockQuantity ?? 999,
            available: optimisticItem?.available ?? true,
          };
          newItems = [...prev.items, newItem];
        }

        return {
          ...prev,
          items: newItems,
          totalItems: newItems.length,
          totalQuantity: newItems.reduce((sum, it) => sum + it.quantity, 0),
          totalAmount: newItems.reduce((sum, it) => sum + it.subtotal, 0),
        };
      });

      setPendingProductIds((prev) => new Set(prev).add(productId));
      try {
        const data = await addCartItem(productId, quantity);

        setCart((currentCart) => {
          const serverItem = data.items.find((it) =>
            isSameProduct(it.productId, productId)
          );
          if (!serverItem) {
            return {
              ...data,
              items: currentCart.items,
              totalItems: currentCart.items.length,
              totalQuantity: currentCart.items.reduce((sum, it) => sum + it.quantity, 0),
              totalAmount: currentCart.items.reduce((sum, it) => sum + it.subtotal, 0),
            };
          }

          // Replace temp item with serverItem, preserving latest local quantity
          const mergedItems = currentCart.items.map((item) => {
            if (isSameProduct(item.productId, productId)) {
              const latestQty = item.quantity;
              return {
                ...serverItem,
                quantity: latestQty,
                subtotal: serverItem.unitPrice * latestQty,
              };
            }
            return item;
          });

          if (!mergedItems.some((it) => isSameProduct(it.productId, productId))) {
            mergedItems.push(serverItem);
          }

          return {
            ...data,
            items: mergedItems,
            totalItems: mergedItems.length,
            totalQuantity: mergedItems.reduce((sum, it) => sum + it.quantity, 0),
            totalAmount: mergedItems.reduce((sum, it) => sum + it.subtotal, 0),
          };
        });

        // Transfer any pending quantity debounce from temp ID to real server ID
        const tempId = `temp-${productId}`;
        const serverItem = data.items.find((it) =>
          isSameProduct(it.productId, productId)
        );
        if (serverItem && pendingQuantitiesRef.current.has(tempId)) {
          const pendingQty = pendingQuantitiesRef.current.get(tempId)!;
          pendingQuantitiesRef.current.delete(tempId);
          pendingQuantitiesRef.current.set(serverItem.id, pendingQty);

          const existingTimeout = updateTimeoutsRef.current.get(tempId);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            updateTimeoutsRef.current.delete(tempId);
            const timeout = setTimeout(() => {
              commitQuantityUpdate(serverItem.id);
            }, UPDATE_DEBOUNCE_MS);
            updateTimeoutsRef.current.set(serverItem.id, timeout);
          }
        }

        setRequiresLogin(false);
        broadcastTabEvent({
          type: "CART_UPDATED",
          payload: { cart: data, timestamp: Date.now() },
        });
      } catch (err) {
        // Rollback ONLY this specific product instead of wiping entire cart
        setCart((currentCart) => {
          const filtered = currentCart.items.filter(
            (it) => !isSameProduct(it.productId, productId)
          );
          return {
            ...currentCart,
            items: filtered,
            totalItems: filtered.length,
            totalQuantity: filtered.reduce((sum, it) => sum + it.quantity, 0),
            totalAmount: filtered.reduce((sum, it) => sum + it.subtotal, 0),
          };
        });

        if (err instanceof CartAuthRequiredError) {
          setRequiresLogin(true);
        }
      } finally {
        setPendingProductIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    []
  );

  const commitQuantityUpdate = useCallback(
    async (itemId: string) => {
      updateTimeoutsRef.current.delete(itemId);

      if (inFlightItemIdsRef.current.has(itemId)) {
        return;
      }

      const quantity = pendingQuantitiesRef.current.get(itemId);
      if (quantity === undefined) return;

      // If itemId is temporary (optimistic item before server response), resolve real item id
      let targetId = itemId;
      if (targetId.startsWith("temp-")) {
        const tempProductId = targetId.replace("temp-", "");
        const realItem = cartRef.current.items.find(
          (it) => isSameProduct(it.productId, tempProductId) && !it.id.startsWith("temp-")
        );
        if (realItem) {
          targetId = realItem.id;
          pendingQuantitiesRef.current.delete(itemId);
          pendingQuantitiesRef.current.set(targetId, quantity);
        } else {
          // If item is no longer in local cart, cancel update
          if (!cartRef.current.items.some((it) => isSameProduct(it.productId, tempProductId))) {
            pendingQuantitiesRef.current.delete(itemId);
            return;
          }
          const timeout = setTimeout(() => {
            commitQuantityUpdate(itemId);
          }, 150);
          updateTimeoutsRef.current.set(itemId, timeout);
          return;
        }
      }

      inFlightItemIdsRef.current.add(targetId);
      try {
        let data: CartData | undefined;
        if (quantity <= 0) {
          await removeCartItem(targetId);
        } else {
          data = await updateCartItemQuantity(targetId, quantity);
        }

        const stillLatest =
          pendingQuantitiesRef.current.get(targetId) === quantity ||
          pendingQuantitiesRef.current.get(itemId) === quantity;

        if (stillLatest) {
          if (data) {
            setCart((currentCart) => {
              const updatedItem = data!.items.find((it) => isSameItem(it.id, targetId));
              const merged = currentCart.items.map((it) => {
                if (isSameItem(it.id, targetId) || isSameItem(it.id, itemId)) {
                  return {
                    ...(updatedItem ?? it),
                    quantity,
                    subtotal: (updatedItem?.unitPrice ?? it.unitPrice) * quantity,
                  };
                }
                return it;
              });
              return {
                ...currentCart,
                items: merged,
                totalItems: merged.length,
                totalQuantity: merged.reduce((sum, it) => sum + it.quantity, 0),
                totalAmount: merged.reduce((sum, it) => sum + it.subtotal, 0),
              };
            });
            broadcastTabEvent({
              type: "CART_UPDATED",
              payload: { cart: data, timestamp: Date.now() },
            });
          } else {
            broadcastTabEvent({
              type: "CART_UPDATED",
              payload: { timestamp: Date.now() },
            });
          }
          pendingQuantitiesRef.current.delete(targetId);
          pendingQuantitiesRef.current.delete(itemId);
        }
      } catch (err) {
        if (err instanceof CartAuthRequiredError) {
          pendingQuantitiesRef.current.delete(targetId);
          pendingQuantitiesRef.current.delete(itemId);
          setRequiresLogin(true);
        } else {
          pendingQuantitiesRef.current.delete(targetId);
          pendingQuantitiesRef.current.delete(itemId);
          fetchCartFromServer();
        }
      } finally {
        inFlightItemIdsRef.current.delete(targetId);

        if (
          pendingQuantitiesRef.current.has(targetId) ||
          pendingQuantitiesRef.current.has(itemId)
        ) {
          commitQuantityUpdate(targetId);
        }
      }
    },
    [fetchCartFromServer]
  );

  const processDeleteQueue = useCallback(async () => {
    if (isProcessingDeleteQueueRef.current) return;
    isProcessingDeleteQueueRef.current = true;

    try {
      while (deleteQueueRef.current.length > 0) {
        const nextId = deleteQueueRef.current.shift()!;
        try {
          await removeCartItem(nextId);
        } catch (err) {
          console.error("[Cart] Error removing item from server:", nextId, err);
          if (err instanceof CartAuthRequiredError) {
            setRequiresLogin(true);
            pendingDeleteIdsRef.current.clear();
            deleteQueueRef.current = [];
            break;
          }
          // Failed to delete on server: clear from pending & refetch
          pendingDeleteIdsRef.current.delete(nextId);
          fetchCartFromServer();
        } finally {
          pendingDeleteIdsRef.current.delete(nextId);
        }
      }
    } finally {
      isProcessingDeleteQueueRef.current = false;
      // When all queued deletes are complete, broadcast final cart state
      if (pendingDeleteIdsRef.current.size === 0) {
        broadcastTabEvent({
          type: "CART_UPDATED",
          payload: { cart: cartRef.current, timestamp: Date.now() },
        });
      }
    }
  }, [fetchCartFromServer]);

  const removeFromCart = useCallback(
    async (itemId: string) => {
      const existingTimeout = updateTimeoutsRef.current.get(itemId);
      if (existingTimeout) clearTimeout(existingTimeout);
      updateTimeoutsRef.current.delete(itemId);
      pendingQuantitiesRef.current.delete(itemId);

      // Track item as pending deletion so it can never be resurrected by an in-flight GET
      pendingDeleteIdsRef.current.add(itemId);

      // Optimistically remove from cart immediately
      setCart((prev) => {
        const items = prev.items.filter((item) => item.id !== itemId);
        const updatedCart: CartData = {
          ...prev,
          items,
          totalItems: items.length,
          totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
          totalAmount: items.reduce((sum, i) => sum + i.subtotal, 0),
        };
        // Broadcast immediately to duplicate tabs so they see the deletion instantly
        broadcastTabEvent({
          type: "CART_UPDATED",
          payload: { cart: updatedCart, timestamp: Date.now() },
        });
        return updatedCart;
      });

      // Queue for sequential server deletion
      if (!deleteQueueRef.current.includes(itemId)) {
        deleteQueueRef.current.push(itemId);
      }
      processDeleteQueue();
    },
    [processDeleteQueue]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const clampedQty = Math.max(0, quantity);

      if (clampedQty <= 0) {
        removeFromCart(itemId);
        return;
      }

      setCart((prev) => {
        const items = prev.items.map((item) =>
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
    [commitQuantityUpdate, removeFromCart]
  );

  useEffect(() => {
    const timeouts = updateTimeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  const clearCart = useCallback(async () => {

    updateTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    updateTimeoutsRef.current.clear();
    pendingQuantitiesRef.current.clear();
    deleteQueueRef.current = [];
    pendingDeleteIdsRef.current.clear();

    const emptyCartData: CartData = { ...EMPTY_CART, cartId: cartRef.current.cartId };
    setCart(emptyCartData);
    broadcastTabEvent({
      type: "CART_UPDATED",
      payload: {
        cart: emptyCartData,
        timestamp: Date.now(),
      },
    });

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
    (productId: string) =>
      cart.items.find((item) => isSameProduct(item.productId, productId)),
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