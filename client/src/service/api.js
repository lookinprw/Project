import api from "../utils/axios";

export const problemService = {
  getProblems: async () => {
    const response = await api.get("/problems");
    return response.data;
  },

  getProblem: async (id) => {
    const response = await api.get(`/problems/${id}`);
    return response.data;
  },

  createProblem: async (problemData) => {
    const formData = new FormData();
    Object.keys(problemData).forEach((key) => {
      if (key === "file" && problemData[key]) {
        formData.append("file", problemData[key]);
      } else {
        formData.append(key, problemData[key]);
      }
    });

    const response = await api.post("/problems", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  updateProblem: async (id, problemData) => {
    const response = await api.put(`/problems/${id}`, problemData);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/problems/${id}/status`, { status });
    return response.data;
  },

  deleteProblem: async (id) => {
    const response = await api.delete(`/problems/${id}`);
    return response.data;
  },
};

// Update auth service to match your interceptor's expectations
export const authService = {
  login: async (credentials) => {
    try {
      const response = await api.post("/users/login", credentials);
      if (response.data.success) {
        // Store the complete user object including tokens
        const userData = {
          ...response.data.user,
          token: response.data.token,
          refreshToken: response.data.refreshToken,
        };
        localStorage.setItem("user", JSON.stringify(userData));
        return {
          success: true,
          user: userData,
        };
      }
      return {
        success: false,
        error: response.data.message,
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  },

  logout: () => {
    api.clearAuth();
    window.location.href = "/login";
  },

  register: async (userData) => {
    try {
      const response = await api.post("/users/register", userData);
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },

  isAuthenticated: () => {
    return api.isAuthenticated();
  },

  getCurrentUser: () => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  },

  // Add this if you need to manually refresh token
  refreshToken: async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await api.post("/users/refresh-token", {
        refreshToken: user.refreshToken,
      });

      if (response.data.success && response.data.token) {
        user.token = response.data.token;
        localStorage.setItem("user", JSON.stringify(user));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh error:", error);
      return false;
    }
  },
};

export default {
  problem: problemService,
  auth: authService,
};
