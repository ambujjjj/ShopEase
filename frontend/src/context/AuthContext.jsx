
import {
    createContext,
    useState,
    useEffect,
  } from "react";
  
  import { getCurrentUser } from "../services/authService";
  
  export const AuthContext = createContext();
  
  export function AuthProvider({ children }) {
  
    // Restore saved JWT token
    const [token, setToken] = useState(() => {
      return localStorage.getItem("token") || null;
    });
  
    const [user, setUser] = useState(null);
  
    // Track whether authentication is being checked
    const [loading, setLoading] = useState(true);
  
    // Verify saved token with the backend
    useEffect(() => {
      const verifyUser = async () => {
        if (!token) {
          setLoading(false);
          return;
        }
  
        try {
          const data = await getCurrentUser(token);
          setUser(data.user);
        } catch (error) {
          console.error("Session verification failed:", error.message);
  
          // Remove invalid or expired authentication
          localStorage.removeItem("token");
          localStorage.removeItem("user");
  
          setToken(null);
          setUser(null);
        } finally {
          setLoading(false);
        }
      };
  
      verifyUser();
    }, [token]);
  
    // Save user and token after successful login
    const login = (userData, authToken) => {
      setUser(userData);
      setToken(authToken);
  
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("token", authToken);
    };
  
    // Logout user
    const logout = () => {
      setUser(null);
      setToken(null);
  
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    };
  
    const isAuthenticated = Boolean(user && token);
  
    const value = {
      user,
      token,
      loading,
      isAuthenticated,
      login,
      logout,
    };
  
    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    );
  }
  