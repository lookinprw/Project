import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { User, Eye, EyeOff } from "lucide-react";
import api from "../../utils/axios";

function UserProfileForm() {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleProfileUpdate = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.patch(`/users/${user.id}`, formData);

      if (response.data.success) {
        // Update the local user context
        setUser(currentUser => ({
          ...currentUser,
          ...response.data.user
        }));

        // Update localStorage
        const storedUser = JSON.parse(localStorage.getItem('user'));
        localStorage.setItem('user', JSON.stringify({
          ...storedUser,
          ...response.data.user
        }));

        setSuccess("อัพเดทข้อมูลสำเร็จ");
        setIsEditing(false);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "เกิดข้อผิดพลาดในการอัพเดทข้อมูล");
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
      setError(err.response?.data?.message || "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
        <h2 className="text-2xl font-bold">ข้อมูลโปรไฟล์</h2>
      </div>

      <div className="p-6 space-y-6">
        {(error || success) && (
          <div
            className={`p-4 rounded-lg ${
              error ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-100 p-4 rounded-full">
              <User className="h-8 w-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">
                {!isEditing ? (
                  `${user.firstname} ${user.lastname}`
                ) : (
                  <div className="flex space-x-4">
                    <input
                      type="text"
                      value={formData.firstname}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          firstname: e.target.value,
                        })
                      }
                      className="border rounded px-2 py-1 w-32"
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
                      className="border rounded px-2 py-1 w-32"
                      placeholder="นามสกุล"
                    />
                  </div>
                )}
              </h2>
              <p className="text-gray-600">รหัสผู้ใช้: {user.username}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">สาขา</p>
              {!isEditing ? (
                <p className="font-medium">
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
                  className="border rounded px-2 py-1 w-full"
                >
                  <option value="ITD">เทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล</option>
                  <option value="MIT">นวัตกรรมสารสนเทศทางการแพทย์</option>
                </select>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">บทบาท</p>
              <div
                className={`inline-flex px-3 py-1 rounded-full text-sm font-medium
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

        <div className="flex justify-end space-x-4">
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium"
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
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "กำลังบันทึก..." : isEditing ? "บันทึก" : "แก้ไขข้อมูล"}
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
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
          )}
        </div>

        {showPasswordForm && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">เปลี่ยนรหัสผ่าน</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
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
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
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
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-4">
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
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "กำลังบันทึก..." : "เปลี่ยนรหัสผ่าน"}
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