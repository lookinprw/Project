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
        api.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${parsedUser.token}`;
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
    setLoading(false);
    setUser(null);
    localStorage.clear();
    delete api.defaults.headers.common["Authorization"];
    window.location.href = "/login";
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      if (!user?.refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await api.post("/users/refresh-token", {
        refreshToken: user.refreshToken,
      });

      if (response.data.success && response.data.token) {
        const updatedUser = {
          ...user,
          token: response.data.token,
          refreshToken: response.data.refreshToken || user.refreshToken,
        };

        localStorage.setItem("user", JSON.stringify(updatedUser));
        api.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${response.data.token}`;
        setUser(updatedUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      logout();
      return false;
    }
  }, [user, logout]);

  const refreshUserData = useCallback(async () => {
    try {
      if (!user?.id || !user?.token) return false;

      const response = await api.get(`/users/${user.id}`);
      if (response.data.success) {
        const updatedUser = {
          ...user,
          ...response.data.user,
          token: user.token,
          refreshToken: user.refreshToken,
        };

        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
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
      return false;
    }
  }, [user, refreshToken]);

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

        api.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${userData.token}`;
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      }

      return { success: false, error: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Error logging in",
      };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      if (!user || initialized) return;
      try {
        setLoading(true);
        await refreshUserData();
      } catch (error) {
        console.error("Auth initialization error:", error);
        logout();
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initialize();
  }, []);

  const value = {
    user,
    login,
    logout,
    loading,
    refreshUserData,
    refreshToken,
    isAdmin: user?.role === "admin",
    isStaff: ["admin", "equipment_manager", "equipment_assistant"].includes(
      user?.role
    ),
  };

  if (!user) {
    return (
      <AuthContext.Provider value={{ ...value, loading: false }}>
        {children}
      </AuthContext.Provider>
    );
  }

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
