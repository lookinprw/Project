// src/utils/axios.js
import axios from "axios";

class AuthAPI {
  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.isRefreshing = false;
    this.failedQueue = [];

    this.api.interceptors.request.use(
      (config) => {
        const user = this.getCurrentUser();
        if (user?.token) {
          // Make sure token is properly formatted
          const token = user.token.startsWith("Bearer ")
            ? user.token
            : `Bearer ${user.token}`;

          config.headers.Authorization = token;
          console.log(
            "Setting Authorization header:",
            token.substring(0, 20) + "..."
          );
        } else {
          console.log("No token found in user data");
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        console.log("Response error:", error.response?.status);

        // Only try refresh if 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.api(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const user = this.getCurrentUser();
            console.log("Refreshing token for user:", user?.id);

            if (!user?.refreshToken) {
              throw new Error("No refresh token available");
            }

            const refreshResponse = await axios.post(
              `${this.api.defaults.baseURL}/users/refresh-token`,
              { refreshToken: user.refreshToken },
              { skipAuthRefresh: true } // Skip interceptor for this request
            );

            if (refreshResponse.data.success) {
              const { token: newToken, refreshToken: newRefreshToken } =
                refreshResponse.data;

              // Update user in localStorage
              const updatedUser = {
                ...user,
                token: newToken,
                refreshToken: newRefreshToken,
              };
              localStorage.setItem("user", JSON.stringify(updatedUser));

              // Update headers
              this.api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
              originalRequest.headers.Authorization = `Bearer ${newToken}`;

              // Process queue
              this.failedQueue.forEach((prom) => prom.resolve(newToken));
              this.failedQueue = [];

              return this.api(originalRequest);
            } else {
              throw new Error("Token refresh failed");
            }
          } catch (error) {
            this.failedQueue.forEach((prom) => prom.reject(error));
            this.failedQueue = [];
            this.clearAuth();
            throw error;
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  getCurrentUser() {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return null;

      const user = JSON.parse(userData);
      console.log("Current user data:", {
        id: user.id,
        hasToken: !!user.token,
        hasRefreshToken: !!user.refreshToken,
      });
      return user;
    } catch (error) {
      console.error("Error parsing user data:", error);
      localStorage.removeItem("user");
      return null;
    }
  }

  clearAuth() {
    console.log("Clearing auth data");
    localStorage.removeItem("user");
    delete this.api.defaults.headers.common.Authorization;
    window.location.href = "/login";
  }
}

const authAPI = new AuthAPI();
export default authAPI.api;
