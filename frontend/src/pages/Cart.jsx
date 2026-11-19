
import { useContext } from "react";
import { Link } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import "./Cart.css";

function Cart() {
  const {
    cartItems,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    totalPrice,
  } = useContext(CartContext);

  if (cartItems.length === 0) {
    return (
      <div className="empty-cart">
        <h1>Your Cart is Empty</h1>
        <p>Looks like you haven't added anything yet.</p>
        <Link to="/products">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Shopping Cart</h1>

      <div className="cart-container">
        <div className="cart-items">
          {cartItems.map((item) => (
            <div className="cart-item" key={item.id}>
              <img src={item.image} alt={item.name} />

              <div className="cart-item-info">
                <h3>{item.name}</h3>
                <p>₹{item.price}</p>

                <div className="quantity-controls">
                  <button onClick={() => decreaseQuantity(item.id)}>
                    -
                  </button>

                  <span>{item.quantity}</span>

                  <button onClick={() => increaseQuantity(item.id)}>
                    +
                  </button>
                </div>

                <button
                  className="remove-button"
                  onClick={() => removeFromCart(item.id)}
                >
                  Remove
                </button>
              </div>

              <div className="cart-item-total">
                ₹{item.price * item.quantity}
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h2>Order Summary</h2>

          <div className="summary-row">
            <span>Total Items</span>
            <span>
              {cartItems.reduce(
                (total, item) => total + item.quantity,
                0
              )}
            </span>
          </div>

          <div className="summary-row">
            <span>Total Price</span>
            <span>₹{totalPrice}</span>
          </div>

          <Link to="/checkout" className="checkout-button">
  Proceed to Checkout
</Link>
        </div>
      </div>
    </div>
  );
}

export default Cart;
