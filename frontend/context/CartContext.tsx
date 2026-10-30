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
} from "@/lib/api/cart";
import { broadcastTabEvent, subscribeTabSync } from "@/lib/auth/tab-sync";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/auth";

export type { CartItem };

export interface PendingCartItem {
  productId: string;
  quantity: number;
  optimisticItem?: Partial<CartItem>;
}

export const PENDING_BUNDLE_KEY = "techwise_pending_bundle_items";

const isSameProduct = (id1?: string, id2?: string) =>
  !!id1 && !!id2 && id1.trim().toLowerCase() === id2.trim().toLowerCase();

const isSameItem = (id1?: string, id2?: string) =>
  !!id1 && !!id2 && id1.trim().toLowerCase() === id2.trim().toLowerCase();

export function getPendingBundleItems(): PendingCartItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      sessionStorage.getItem(PENDING_BUNDLE_KEY) ||
      localStorage.getItem(PENDING_BUNDLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error("Failed to parse pending bundle items", err);
  }
  return null;
}

export function clearPendingBundleItems(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_BUNDLE_KEY);
    localStorage.removeItem(PENDING_BUNDLE_KEY);
    sessionStorage.removeItem("pending_cart_product_id");
    sessionStorage.removeItem("pending_cart_color");
    sessionStorage.removeItem("pending_cart_config");
  } catch {}
}

export function setPendingBundleItems(items: PendingCartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(items);
    sessionStorage.setItem(PENDING_BUNDLE_KEY, serialized);
    localStorage.setItem(PENDING_BUNDLE_KEY, serialized);
    sessionStorage.removeItem("pending_cart_product_id");
    sessionStorage.removeItem("pending_cart_color");
    sessionStorage.removeItem("pending_cart_config");
  } catch {}
}

export function addPendingCartItem(item: PendingCartItem): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getPendingBundleItems() || [];
    const index = existing.findIndex((it) => isSameProduct(it.productId, item.productId));
    if (index >= 0) {
      existing[index].quantity = (existing[index].quantity || 1) + (item.quantity || 1);
      if (item.optimisticItem) {
        existing[index].optimisticItem = {
          ...existing[index].optimisticItem,
          ...item.optimisticItem,
        };
      }
    } else {
      existing.push(item);
    }
    setPendingBundleItems(existing);
  } catch (err) {
    console.error("Failed to add pending cart item", err);
  }
}

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
  addMultipleToCart: (items: PendingCartItem[]) => Promise<void>;
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
  const { isSignedIn, isLoading: isAuthLoading } = useAuth();
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
  const pendingDeleteProductIdsRef = useRef<Set<string>>(new Set());
  const deleteQueueRef = useRef<string[]>([]);
  const isProcessingDeleteQueueRef = useRef(false);

  const fetchCartFromServer = useCallback(async () => {
    if (!getToken()) {
      setCart(EMPTY_CART);
      setRequiresLogin(true);
      setIsLoaded(true);
      return;
    }

    // If deletions are actively in flight, don't overwrite with stale server data
    if (
      pendingDeleteIdsRef.current.size > 0 ||
      pendingDeleteProductIdsRef.current.size > 0
    ) {
      return;
    }

    try {
      const data = await getCart();
      setCart((currentCart) => {
        // Exclude any items that are currently pending deletion
        const validServerItems = data.items.filter(
          (item) =>
            !pendingDeleteIdsRef.current.has(item.id) &&
            !pendingDeleteProductIdsRef.current.has(item.productId)
        );

        // Keep any pending optimistic items not yet present in data, unless deleted
        const tempItems = currentCart.items.filter(
          (item) =>
            item.id.startsWith("temp-") &&
            !pendingDeleteIdsRef.current.has(item.id) &&
            !pendingDeleteProductIdsRef.current.has(item.productId)
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

  const addMultipleToCart = useCallback(
    async (items: PendingCartItem[]) => {
      if (!items || items.length === 0) return;

      if (!isSignedIn && !getToken()) {
        setRequiresLogin(true);
        return;
      }

      // 1. Optimistically update cart with all items in one batch
      setCart((prev) => {
        let newItems = [...prev.items];

        for (const it of items) {
          const tempId = it.optimisticItem?.id ?? `temp-${it.productId}`;
          pendingDeleteProductIdsRef.current.delete(it.productId);
          pendingDeleteIdsRef.current.delete(tempId);

          const existingIndex = newItems.findIndex((existing) =>
            isSameProduct(existing.productId, it.productId)
          );

          const quantityToAdd = it.quantity || 1;

          if (existingIndex >= 0) {
            const existing = newItems[existingIndex];
            const newQty = existing.quantity + quantityToAdd;
            newItems[existingIndex] = {
              ...existing,
              quantity: newQty,
              subtotal: existing.unitPrice * newQty,
            };
          } else {
            const unitPrice =
              it.optimisticItem?.unitPrice ??
              it.optimisticItem?.originalPrice ??
              0;
            newItems.push({
              id: tempId,
              productId: it.productId,
              name: it.optimisticItem?.name ?? "Sản phẩm",
              sku: it.optimisticItem?.sku,
              slug: it.optimisticItem?.slug,
              thumbnailUrl: it.optimisticItem?.thumbnailUrl,
              unitPrice,
              originalPrice: it.optimisticItem?.originalPrice,
              quantity: quantityToAdd,
              subtotal: unitPrice * quantityToAdd,
              stockQuantity: it.optimisticItem?.stockQuantity ?? 999,
              available: it.optimisticItem?.available ?? true,
            });
          }
        }

        const updatedCart: CartData = {
          ...prev,
          items: newItems,
          totalItems: newItems.length,
          totalQuantity: newItems.reduce((sum, item) => sum + item.quantity, 0),
          totalAmount: newItems.reduce((sum, item) => sum + item.subtotal, 0),
        };

        broadcastTabEvent({
          type: "CART_UPDATED",
          payload: { cart: updatedCart, timestamp: Date.now() },
        });

        return updatedCart;
      });

      // 2. Mark product IDs as pending
      setPendingProductIds((prev) => {
        const next = new Set(prev);
        items.forEach((it) => next.add(it.productId));
        return next;
      });

      // 3. Sequentially post each item to server
      try {
        for (const it of items) {
          try {
            await addCartItem(it.productId, it.quantity || 1);
          } catch (err) {
            if (err instanceof CartAuthRequiredError) {
              setRequiresLogin(true);
              break;
            }
            console.error(`Lỗi khi thêm sản phẩm combo (${it.productId}) vào giỏ:`, err);
          }
        }
        setRequiresLogin(false);
      } finally {
        setPendingProductIds((prev) => {
          const next = new Set(prev);
          items.forEach((it) => next.delete(it.productId));
          return next;
        });
        await fetchCartFromServer();
      }
    },
    [isSignedIn, fetchCartFromServer]
  );

  const isProcessingBundleRef = useRef(false);

  const processPendingBundleIfAny = useCallback(async () => {
    if (isProcessingBundleRef.current) return;
    const pendingBundle = getPendingBundleItems();
    if (!pendingBundle || pendingBundle.length === 0) return;

    isProcessingBundleRef.current = true;

    try {
      // Add all pending items to cart (optimistically updates state & pushes to server)
      await addMultipleToCart(pendingBundle);
      clearPendingBundleItems();
      setRequiresLogin(false);
    } catch (err) {
      console.error("Lỗi khi xử lý sản phẩm chờ sau khi đăng nhập:", err);
      await fetchCartFromServer();
    } finally {
      isProcessingBundleRef.current = false;
      setIsLoaded(true);
    }
  }, [addMultipleToCart, fetchCartFromServer]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isSignedIn) {
      invalidateCartCache();
      setCart(EMPTY_CART);
      setRequiresLogin(true);
      setIsLoaded(true);

      updateTimeoutsRef.current.forEach((t) => clearTimeout(t));
      updateTimeoutsRef.current.clear();
      pendingQuantitiesRef.current.clear();
      inFlightItemIdsRef.current.clear();
      pendingDeleteIdsRef.current.clear();
      pendingDeleteProductIdsRef.current.clear();
      deleteQueueRef.current = [];
      return;
    }

    setRequiresLogin(false);

    const pendingBundle = getPendingBundleItems();
    if (pendingBundle && pendingBundle.length > 0) {
      processPendingBundleIfAny();
    } else {
      fetchCartFromServer();
    }
  }, [isSignedIn, isAuthLoading, fetchCartFromServer, processPendingBundleIfAny]);

  useEffect(() => {
    const handleLogin = () => {
      invalidateCartCache();
      const pendingBundle = getPendingBundleItems();
      if (pendingBundle && pendingBundle.length > 0) {
        processPendingBundleIfAny();
      } else {
        fetchCartFromServer();
      }
    };
    const handleLogout = () => {
      invalidateCartCache();
      setCart(EMPTY_CART);
      setRequiresLogin(true);
    };

    const unsubscribeSync = subscribeTabSync((event) => {
      if (event.type === "CART_UPDATED") {
        if (!isSignedIn) return;
        invalidateCartCache();
        // If this tab is in the middle of active deletions, debounce updates or in-flight mutations,
        // do not overwrite this tab's optimistic state
        if (
          pendingDeleteIdsRef.current.size > 0 ||
          pendingDeleteProductIdsRef.current.size > 0 ||
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
        isSignedIn &&
        document.visibilityState === "visible" &&
        pendingDeleteIdsRef.current.size === 0 &&
        pendingDeleteProductIdsRef.current.size === 0 &&
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
  }, [isSignedIn, fetchCartFromServer]);

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
        // Defensive check: NEVER send temp-* to server!
        if (!nextId || nextId.startsWith("temp-")) {
          pendingDeleteIdsRef.current.delete(nextId);
          continue;
        }

        try {
          await removeCartItem(nextId);
        } catch (err) {
          console.error("[Cart] Error removing item from server:", nextId, err);
          if (err instanceof CartAuthRequiredError) {
            setRequiresLogin(true);
            pendingDeleteIdsRef.current.clear();
            pendingDeleteProductIdsRef.current.clear();
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
      if (
        pendingDeleteIdsRef.current.size === 0 &&
        pendingDeleteProductIdsRef.current.size === 0
      ) {
        broadcastTabEvent({
          type: "CART_UPDATED",
          payload: { cart: cartRef.current, timestamp: Date.now() },
        });
      }
    }
  }, [fetchCartFromServer]);

  const addToCart = useCallback(
    async (
      productId: string,
      quantity = 1,
      optimisticItem?: Partial<CartItem>
    ) => {
      if (!isSignedIn && !getToken()) {
        setRequiresLogin(true);
        addPendingCartItem({
          productId,
          quantity,
          optimisticItem,
        });
        return;
      }

      const tempId = optimisticItem?.id ?? `temp-${productId}`;

      // Reset any previous pending deletion for this product if user adds it again
      pendingDeleteProductIdsRef.current.delete(productId);
      pendingDeleteIdsRef.current.delete(tempId);

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
            id: tempId,
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

        // Check if user clicked delete while addCartItem was in flight
        const wasDeletedWhileInFlight =
          pendingDeleteProductIdsRef.current.has(productId) ||
          pendingDeleteIdsRef.current.has(tempId);

        if (wasDeletedWhileInFlight) {
          pendingDeleteProductIdsRef.current.delete(productId);
          pendingDeleteIdsRef.current.delete(tempId);

          const serverItem = data.items.find((it) =>
            isSameProduct(it.productId, productId)
          );

          if (serverItem) {
            pendingDeleteIdsRef.current.add(serverItem.id);
            if (!deleteQueueRef.current.includes(serverItem.id)) {
              deleteQueueRef.current.push(serverItem.id);
            }
            processDeleteQueue();
          }

          setCart((currentCart) => {
            const filtered = currentCart.items.filter(
              (it) =>
                !isSameProduct(it.productId, productId) &&
                (!serverItem || it.id !== serverItem.id)
            );
            return {
              ...currentCart,
              items: filtered,
              totalItems: filtered.length,
              totalQuantity: filtered.reduce((sum, it) => sum + it.quantity, 0),
              totalAmount: filtered.reduce((sum, it) => sum + it.subtotal, 0),
            };
          });

          return;
        }

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

          if (
            pendingDeleteIdsRef.current.has(serverItem.id) ||
            pendingDeleteProductIdsRef.current.has(productId)
          ) {
            return currentCart;
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
        pendingDeleteProductIdsRef.current.delete(productId);
        pendingDeleteIdsRef.current.delete(tempId);

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
    [isSignedIn, commitQuantityUpdate, processDeleteQueue]
  );

  const removeFromCart = useCallback(
    async (itemId: string) => {
      if (!isSignedIn) {
        setRequiresLogin(true);
        return;
      }

      const existingTimeout = updateTimeoutsRef.current.get(itemId);
      if (existingTimeout) clearTimeout(existingTimeout);
      updateTimeoutsRef.current.delete(itemId);
      pendingQuantitiesRef.current.delete(itemId);

      // Track item as pending deletion so it can never be resurrected by an in-flight GET
      pendingDeleteIdsRef.current.add(itemId);

      // Check if this is an optimistic temporary item
      let tempProductId: string | null = null;
      if (itemId.startsWith("temp-")) {
        tempProductId = itemId.replace("temp-", "");
        pendingDeleteProductIdsRef.current.add(tempProductId);
      }

      // Optimistically remove from cart immediately
      setCart((prev) => {
        const items = prev.items.filter((item) => {
          if (item.id === itemId) return false;
          if (tempProductId && isSameProduct(item.productId, tempProductId)) return false;
          return true;
        });
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

      // If it is a temporary item:
      if (tempProductId) {
        // Check if the server item ID is already present in cartRef
        const realItem = cartRef.current.items.find(
          (it) => isSameProduct(it.productId, tempProductId) && !it.id.startsWith("temp-")
        );
        if (realItem) {
          pendingDeleteIdsRef.current.add(realItem.id);
          if (!deleteQueueRef.current.includes(realItem.id)) {
            deleteQueueRef.current.push(realItem.id);
          }
          processDeleteQueue();
        }
        // If real item is not yet known, addToCart's in-flight resolution will catch it via pendingDeleteProductIdsRef
        return;
      }

      // Normal server item deletion: queue for sequential server deletion
      if (!deleteQueueRef.current.includes(itemId)) {
        deleteQueueRef.current.push(itemId);
      }
      processDeleteQueue();
    },
    [isSignedIn, processDeleteQueue]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (!isSignedIn) {
        setRequiresLogin(true);
        return;
      }

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
    [isSignedIn, commitQuantityUpdate, removeFromCart]
  );

  useEffect(() => {
    const timeouts = updateTimeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  const clearCart = useCallback(async () => {
    if (!isSignedIn) {
      setRequiresLogin(true);
      return;
    }

    updateTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    updateTimeoutsRef.current.clear();
    pendingQuantitiesRef.current.clear();
    deleteQueueRef.current = [];
    pendingDeleteIdsRef.current.clear();
    pendingDeleteProductIdsRef.current.clear();

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
  }, [isSignedIn, fetchCartFromServer]);

  const getItemByProductId = useCallback(
    (productId: string) => {
      if (!isSignedIn) return undefined;
      return cart.items.find((item) => isSameProduct(item.productId, productId));
    },
    [isSignedIn, cart.items]
  );

  const isAddingToCart = useCallback(
    (productId: string) => pendingProductIds.has(productId),
    [pendingProductIds]
  );

  const value: CartContextValue = {
    items: isSignedIn ? cart.items : [],
    cartId: isSignedIn ? cart.cartId : "",
    totalItems: isSignedIn ? cart.totalItems : 0,
    totalQuantity: isSignedIn ? cart.totalQuantity : 0,
    totalAmount: isSignedIn ? cart.totalAmount : 0,
    isLoaded: isLoaded && !isAuthLoading,
    requiresLogin: !isSignedIn || requiresLogin,
    addToCart,
    addMultipleToCart,
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