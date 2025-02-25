import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  AlertCircle,
  User,
  Lock,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../assets/logo.png";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    console.log("Error state changed:", error);
  }, [error]);

  // Special accounts configuration
  const specialAccounts = {
    admin: {
      username: "admin",
      role: "admin",
      redirectPath: "/users",
    },
    support: {
      username: "support",
      role: "equipment_manager",
      redirectPath: "/dashboard",
    },
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username) {
      newErrors.username = "กรุณากรอกรหัสผู้ใช้";
    } else {
      const isSpecialAccount = Object.values(specialAccounts).some(
        (account) => account.username === formData.username
      );

      if (!isSpecialAccount) {
        if (formData.username.includes(" ")) {
          newErrors.username = "รหัสผู้ใช้ต้องไม่มีช่องว่าง";
        } else if (formData.username.length < 8) {
          newErrors.username = "รหัสผู้ใช้ต้องมีความยาวอย่างน้อย 8 ตัวอักษร";
        }
      }
    }

    if (!formData.password) {
      newErrors.password = "กรุณากรอกรหัสผ่าน";
    }

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field-specific error when typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // Don't clear error state on input change
    // Remove the error clearing code from here
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await login(formData);
      console.log("Login result:", result);

      if (result.success) {
        const specialAccount = Object.values(specialAccounts).find(
          (account) => account.username === formData.username
        );

        if (specialAccount) {
          navigate(specialAccount.redirectPath, { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } else {
        // Don't wrap the result in another object
        console.log("Setting error state:", result);
        setError(result);
        setIsLoading(false); // Make sure to set loading to false before setting error
      }
    } catch (err) {
      console.error("Login error:", err);
      setError({
        type: "error",
        message: err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
      });
      setIsLoading(false);
    }
  };

  console.log("Current error state:", error);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            src={Logo}
            alt="Logo"
            className="h-32 w-auto sm:h-40 md:h-48 lg:h-56 object-contain hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border border-gray-100">
          {error && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                error.type === "success"
                  ? "bg-green-50 border-l-4 border-green-400"
                  : "bg-red-50 border-l-4 border-red-400"
              } flex items-center`}
            >
              <div
                className={`flex items-center ${
                  error.type === "success" ? "text-green-800" : "text-red-800"
                }`}
              >
                {error.type === "success" ? (
                  <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                )}
                <span>{error.message}</span>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                รหัสผู้ใช้
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    fieldErrors.username ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200`}
                  placeholder="กรอกรหัสผู้ใช้"
                />
              </div>
              {fieldErrors.username && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.username}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                รหัสผ่าน
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-10 py-2 border ${
                    fieldErrors.password ? "border-red-500" : "border-gray-300"
                  } rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200`}
                  placeholder="กรอกรหัสผ่าน"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-200 transform hover:scale-[1.02]"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  กำลังเข้าสู่ระบบ...
                </div>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-gray-500">ยังไม่มีบัญชี?</span>
              </div>
              <div className="text-sm">
                <Link
                  to="/register"
                  className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
                >
                  ลงทะเบียนใช้งาน
                </Link>
              </div>
            </div>
          </form>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              หากลืมรหัสผ่าน
            </h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>โปรดติดต่อ นักวิชาการสาขาเทคโนโลยีสารสนเทศ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
