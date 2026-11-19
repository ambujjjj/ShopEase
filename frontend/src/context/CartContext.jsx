
import { createContext, useState, useEffect } from "react";

export const CartContext = createContext();

export function CartProvider({ children }) {

  // Restore cart items from localStorage when the app starts
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem("cartItems");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error("Failed to restore cart:", error);
      return [];
    }
  });

  // Save cart items whenever they change
  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  // Add a product to the cart
  const addToCart = (product) => {
    if (product.stock <= 0) {
      window.alert("This product is out of stock!");
      return;
    }

    const existingProduct = cartItems.find(
      (item) => item.id === product.id
    );

    if (existingProduct && existingProduct.quantity >= product.stock) {
      window.alert(
        `Only ${product.stock} units of ${product.name} are available!`
      );
      return;
    }

    setCartItems((previousItems) => {
      const existingProduct = previousItems.find(
        (item) => item.id === product.id
      );

      if (existingProduct) {
        return previousItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...previousItems, { ...product, quantity: 1 }];
    });
  };

  // Remove a product from the cart
  const removeFromCart = (productId) => {
    setCartItems((previousItems) =>
      previousItems.filter((item) => item.id !== productId)
    );
  };

  // Increase product quantity
  const increaseQuantity = (productId) => {
    const existingProduct = cartItems.find(
      (item) => item.id === productId
    );

    if (!existingProduct) return;

    if (existingProduct.quantity >= existingProduct.stock) {
      window.alert(
        `Only ${existingProduct.stock} units are available!`
      );
      return;
    }

    setCartItems((previousItems) =>
      previousItems.map((item) =>
        item.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  // Decrease product quantity
  const decreaseQuantity = (productId) => {
    setCartItems((previousItems) =>
      previousItems
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Calculate total number of items
  const totalItems = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Calculate total cart price
  const totalPrice = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  // Clear the entire cart after placing an order
  const clearCart = () => {
    setCartItems([]);
  };

  // Provide cart data and functions to all components
  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    totalItems,
    totalPrice,
    clearCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
