
const adminOnly = (req, res, next) => {
    // Check whether the user is authenticated
    if (!req.user) {
      return res.status(401).json({
        message: "Not authorized. Please login first.",
      });
    }
  
    // Check whether the user has admin privileges
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admin privileges required.",
      });
    }
  
    // Allow admin to continue
    next();
  };
  
  module.exports = adminOnly;
  