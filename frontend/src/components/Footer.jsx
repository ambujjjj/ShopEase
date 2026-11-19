
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">

      <div className="footer-section">
        <h2>ShopEase</h2>
        <p>Your one-stop destination for online shopping.</p>
      </div>

      <div className="footer-section">
        <h3>Quick Links</h3>
        <ul>
          <li>Home</li>
          <li>Products</li>
          <li>About Us</li>
          <li>Contact</li>
        </ul>
      </div>

      <div className="footer-section">
        <h3>Customer Service</h3>
        <ul>
          <li>My Account</li>
          <li>My Orders</li>
          <li>Returns</li>
          <li>Help Center</li>
        </ul>
      </div>

      <div className="footer-section">
        <h3>Contact Us</h3>
        <p>Email: support@shopease.com</p>
        <p>Phone: +91 9876543210</p>
      </div>

      <div className="footer-bottom">
        <p>© 2026 ShopEase. All rights reserved.</p>
      </div>

    </footer>
  );
}

export default Footer;
