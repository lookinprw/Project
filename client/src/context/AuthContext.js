import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../utils/axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    try {
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      if (parsedUser?.token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${parsedUser.token}`;
      }
      return parsedUser;
    } catch (error) {
      console.error("Error parsing saved user:", error);
      localStorage.removeItem("user");
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
    delete api.defaults.headers.common["Authorization"];
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      if (!user?.token) return false;

      const response = await api.get("/users/me");
      if (response.data.success) {
        const userData = {
          ...response.data.user,
          token: response.data.token,
          refreshToken: response.data.refreshToken,
        };
        localStorage.setItem("user", JSON.stringify(userData));
        api.defaults.headers.common["Authorization"] = `Bearer ${userData.token}`;
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error refreshing user data:", error);
      if (error.response?.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          return await refreshUserData();
        }
      }
      logout();
      return false;
    }
  }, [user, logout]);

  const refreshToken = useCallback(async () => {
    try {
      if (!user?.refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await api.post("/users/refresh-token", {
        refreshToken: user.refreshToken,
      });

      if (response.data.success) {
        const userData = {
          ...user,
          ...response.data.user,
          token: response.data.token,
          refreshToken: response.data.refreshToken,
        };

        localStorage.setItem("user", JSON.stringify(userData));
        api.defaults.headers.common["Authorization"] = `Bearer ${response.data.token}`;
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout();
      return false;
    }
  }, [user, logout]);

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await api.post("/users/login", credentials);
      
      if (response.data.success) {
        const userData = {
          ...response.data.user,
          token: response.data.token,
          refreshToken: response.data.refreshToken,
        };

        api.defaults.headers.common["Authorization"] = `Bearer ${userData.token}`;
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        return response.data;
      }

      return {
        success: false,
        type: "error",
        message: response.data.message || "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        type: "error",
        message: error.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง"
      };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !initialized) return;

    const refreshInterval = setInterval(() => {
      refreshUserData();
    }, 2 * 60 * 1000); // Check every 2 minutes

    return () => clearInterval(refreshInterval);
  }, [user, initialized, refreshUserData]);

  useEffect(() => {
    const initialize = async () => {
      if (!user || initialized) return;
      
      try {
        setLoading(true);
        
        if (window.location.pathname === '/login') {
          setInitialized(true);
          return;
        }

        const isValid = await refreshUserData();
        if (!isValid) {
          logout();
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        logout();
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initialize();
  }, [user, initialized, refreshUserData, logout]);

  const value = {
    user,
    setUser,
    login,
    logout,
    loading,
    refreshUserData,
    refreshToken,
    isAdmin: user?.role === "admin",
    isStaff: ["admin", "equipment_manager", "equipment_assistant"].includes(user?.role),
  };

  return (
    <AuthContext.Provider value={{ ...value, loading: loading || !initialized }}>
      {loading && !initialized ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

// Add the useAuth hook export
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;