// src/utils/axios.js
import axios from "axios";

class AuthAPI {
  constructor() {
    const baseURL =
      process.env.REACT_APP_API_URL || "http://localhost:3001/api";

    this.api = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
      crossDomain: true,
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const user = this.getCurrentUser();
        if (user?.token) {
          const token = user.token.startsWith("Bearer ")
            ? user.token
            : `Bearer ${user.token}`;
          config.headers.Authorization = token;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        console.log('API Error:', error.response?.data); // Add debug log
    
        // For login endpoint errors
        if (error.config.url.includes('/login')) {
          const errorData = {
            success: false,
            type: "error",
            message: error.response?.data?.message || "รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
          };
          console.log('Login error formatted:', errorData); // Add debug log
          return Promise.reject(errorData);
        }
    
        // Network errors (no response)
        if (!error.response) {
          const networkError = {
            success: false,
            type: "error",
            message: "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง"
          };
          return Promise.reject(networkError);
        }
    
        // Pass through server error response
        const serverError = {
          success: false,
          type: "error",
          message: error.response?.data?.message || "เกิดข้อผิดพลาดในการดำเนินการ"
        };
        return Promise.reject(serverError);
      }
    );
  }

  getCurrentUser() {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) return null;

      const user = JSON.parse(userData);
      return user;
    } catch (error) {
      console.error("Error parsing user data:", error);
      localStorage.removeItem("user");
      return null;
    }
  }

  clearAuth() {
    localStorage.removeItem("user");
    delete this.api.defaults.headers.Authorization;
    // Note: Removed window.location.href to avoid page refresh
  }
}


const authAPI = new AuthAPI();
export default authAPI.api;
