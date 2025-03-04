import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { User, Eye, EyeOff } from "lucide-react";
import api from "../utils/axios";

function ProfilePage() {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [formData, setFormData] = useState({
    firstname: user?.firstname || "",
    lastname: user?.lastname || "",
    branch: user?.branch || "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleProfileUpdate = async () => {
    setLoading(true);
    setError("");

    try {
      console.log("Updating profile with data:", formData); // Debug log

      const response = await api.patch(`/users/${user.id}`, {
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        branch: formData.branch,
      });

      if (response.data.success) {
        // Update the global user state with the new data
        setUser((prevUser) => ({
          ...prevUser,
          ...response.data.user,
        }));

        setSuccess("อัพเดทข้อมูลสำเร็จ");
        setIsEditing(false);

        // Update localStorage
        const currentUser = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...currentUser,
            ...response.data.user,
          })
        );

        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Profile update error:", err); // Debug log
      setError(
        err.response?.data?.message || "เกิดข้อผิดพลาดในการอัพเดทข้อมูล"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Add debug log
      console.log("Sending password change request:", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      const response = await api.post("/users/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.data.success) {
        setSuccess("เปลี่ยนรหัสผ่านสำเร็จ");
        setShowPasswordForm(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Password change error:", err.response); // Add this debug log
      setError(
        err.response?.data?.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-gray-100">
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-t-xl sm:rounded-t-2xl">
              <h1 className="text-lg sm:text-2xl font-bold">ข้อมูลโปรไฟล์</h1>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {(error || success) && (
                <div
                  className={`p-3 sm:p-4 rounded-lg text-sm ${
                    error
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {error || success}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-0">
                <div className="bg-indigo-100 p-3 sm:p-4 rounded-full w-16 h-16 sm:w-auto sm:h-auto flex items-center justify-center">
                  <User className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600" />
                </div>
                <div className="sm:ml-4">
                  <h2 className="text-xl sm:text-2xl font-semibold">
                    {!isEditing ? (
                      `${user?.firstname} ${user?.lastname}`
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2 sm:space-x-4">
                        <input
                          type="text"
                          value={formData.firstname}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              firstname: e.target.value,
                            })
                          }
                          className="border rounded px-2 py-1 w-full sm:w-32"
                          placeholder="ชื่อ"
                        />
                        <input
                          type="text"
                          value={formData.lastname}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lastname: e.target.value,
                            })
                          }
                          className="border rounded px-2 py-1 w-full sm:w-32"
                          placeholder="นามสกุล"
                        />
                      </div>
                    )}
                  </h2>
                  <p className="text-gray-600 text-sm sm:text-base">
                    ชื่อผู้ใช้: {user?.username}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-6">
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    สาขา
                  </h3>
                  {!isEditing ? (
                    <p className="text-sm sm:text-base text-gray-900 font-medium">
                      {user?.branch === "ITD"
                        ? "เทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล"
                        : "นวัตกรรมสารสนเทศทางการแพทย์"}
                    </p>
                  ) : (
                    <select
                      value={formData.branch}
                      onChange={(e) =>
                        setFormData({ ...formData, branch: e.target.value })
                      }
                      className="border rounded px-2 py-1 w-full text-sm sm:text-base"
                    >
                      <option value="ITD">
                        เทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล
                      </option>
                      <option value="IMI">นวัตกรรมสารสนเทศทางการแพทย์</option>
                    </select>
                  )}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-500 mb-1 sm:mb-2">
                    บทบาท
                  </h3>
                  <div
                    className={`inline-flex px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium
                    ${
                      user?.role === "admin"
                        ? "bg-red-100 text-red-800"
                        : user?.role === "equipment_manager"
                        ? "bg-blue-100 text-blue-800"
                        : user?.role === "equipment_assistant"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {user?.role === "admin"
                      ? "ผู้ดูแลระบบ"
                      : user?.role === "equipment_manager"
                      ? "ผู้จัดการครุภัณฑ์"
                      : user?.role === "equipment_assistant"
                      ? "ผู้ช่วยดูแลครุภัณฑ์"
                      : "นักศึกษา"}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end sm:space-x-4">
                {!showPasswordForm && (
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="w-full sm:w-auto px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium text-center sm:text-left text-sm sm:text-base"
                  >
                    เปลี่ยนรหัสผ่าน
                  </button>
                )}
                <button
                  onClick={() => {
                    if (isEditing) {
                      handleProfileUpdate();
                    } else {
                      setIsEditing(true);
                    }
                  }}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm sm:text-base"
                >
                  {loading
                    ? "กำลังบันทึก..."
                    : isEditing
                    ? "บันทึก"
                    : "แก้ไขข้อมูล"}
                </button>
                {isEditing && (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        firstname: user?.firstname || "",
                        lastname: user?.lastname || "",
                        branch: user?.branch || "",
                      });
                    }}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Password Change Form */}
          {showPasswordForm && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-gray-100 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
                เปลี่ยนรหัสผ่าน
              </h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    รหัสผ่านปัจจุบัน
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff size={isMobile ? 18 : 20} />
                      ) : (
                        <Eye size={isMobile ? 18 : 20} />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    รหัสผ่านใหม่
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    ยืนยันรหัสผ่านใหม่
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                    required
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm sm:text-base"
                  >
                    {loading ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ProfilePage;
