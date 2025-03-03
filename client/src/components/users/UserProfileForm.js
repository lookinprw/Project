import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { User, Eye, EyeOff, Edit, Save, X, Key, School } from "lucide-react";
import api from "../../utils/axios";

function UserProfileForm() {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  // Check if screen is mobile on component mount and window resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check initially
    checkIfMobile();

    // Add listener for window resize
    window.addEventListener("resize", checkIfMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const handleProfileUpdate = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.patch(`/users/${user.id}`, formData);

      if (response.data.success) {
        // Update the local user context
        setUser((currentUser) => ({
          ...currentUser,
          ...response.data.user,
        }));

        // Update localStorage
        const storedUser = JSON.parse(localStorage.getItem("user"));
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...storedUser,
            ...response.data.user,
          })
        );

        setSuccess("อัพเดทข้อมูลสำเร็จ");
        setIsEditing(false);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
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
      setError(
        err.response?.data?.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center">
          <User className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
          ข้อมูลโปรไฟล์
        </h2>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {(error || success) && (
          <div
            className={`p-3 sm:p-4 rounded-lg ${
              error ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="bg-indigo-100 p-3 sm:p-4 rounded-full">
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold">
                {!isEditing ? (
                  `${user.firstname} ${user.lastname}`
                ) : (
                  <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                    <input
                      type="text"
                      value={formData.firstname}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          firstname: e.target.value,
                        })
                      }
                      className="border rounded px-2 py-1 w-full sm:w-32 text-sm sm:text-base"
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
                      className="border rounded px-2 py-1 w-full sm:w-32 text-sm sm:text-base"
                      placeholder="นามสกุล"
                    />
                  </div>
                )}
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                รหัสผู้ใช้: {user.username}
              </p>
            </div>
          </div>

          {/* Mobile action buttons placed here for better mobile layout */}
          {isMobile && (
            <div className="flex mt-4 space-x-2">
              {!showPasswordForm && (
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="flex-1 px-3 py-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium border border-indigo-200 rounded-md hover:bg-indigo-50 flex items-center justify-center"
                >
                  <Key className="h-3.5 w-3.5 mr-1" />
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
                className="flex-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  "กำลังบันทึก..."
                ) : isEditing ? (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    บันทึก
                  </>
                ) : (
                  <>
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    แก้ไข
                  </>
                )}
              </button>
              {isEditing && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      firstname: user.firstname,
                      lastname: user.lastname,
                      branch: user.branch,
                    });
                  }}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  ยกเลิก
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center text-xs sm:text-sm text-gray-500">
                <School className="h-4 w-4 mr-1" />
                สาขา
              </div>
              {!isEditing ? (
                <p className="font-medium text-sm sm:text-base">
                  {user.branch === "ITD"
                    ? "เทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล"
                    : "นวัตกรรมสารสนเทศทางการแพทย์"}
                </p>
              ) : (
                <select
                  value={formData.branch}
                  onChange={(e) =>
                    setFormData({ ...formData, branch: e.target.value })
                  }
                  className="border rounded px-2 py-1.5 w-full text-sm sm:text-base focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ITD">
                    เทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล
                  </option>
                  <option value="MIT">นวัตกรรมสารสนเทศทางการแพทย์</option>
                </select>
              )}
            </div>
            <div className="space-y-2">
              <p className="flex items-center text-xs sm:text-sm text-gray-500">
                <User className="h-4 w-4 mr-1" />
                บทบาท
              </p>
              <div
                className={`inline-flex px-3 py-1 rounded-full text-xs sm:text-sm font-medium
                ${
                  user.role === "admin"
                    ? "bg-red-100 text-red-800"
                    : user.role === "equipment_manager"
                    ? "bg-blue-100 text-blue-800"
                    : user.role === "equipment_assistant"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {user.role === "admin"
                  ? "ผู้ดูแลระบบ"
                  : user.role === "equipment_manager"
                  ? "ผู้จัดการครุภัณฑ์"
                  : user.role === "equipment_assistant"
                  ? "ผู้ช่วยดูแลครุภัณฑ์"
                  : "นักศึกษา"}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop action buttons */}
        {!isMobile && (
          <div className="flex justify-end space-x-4">
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium flex items-center"
              >
                <Key className="h-4 w-4 mr-2" />
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                "กำลังบันทึก..."
              ) : isEditing ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  บันทึก
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  แก้ไขข้อมูล
                </>
              )}
            </button>
            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    firstname: user.firstname,
                    lastname: user.lastname,
                    branch: user.branch,
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <X className="h-4 w-4 mr-2" />
                ยกเลิก
              </button>
            )}
          </div>
        )}

        {showPasswordForm && (
          <div className="mt-4 sm:mt-6 border-t pt-4 sm:pt-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center">
              <Key className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              เปลี่ยนรหัสผ่าน
            </h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
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
                    className="w-full px-3 py-2 border rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
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
                  className="w-full px-3 py-2 border rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">
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
                  className="w-full px-3 py-2 border rounded-md text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row-reverse sm:justify-start sm:space-x-4 sm:space-x-reverse space-y-2 sm:space-y-0">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-xs sm:text-sm"
                >
                  {loading ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
                </button>
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
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfileForm;
