// src/components/users/UserCreateForm.js
import React, { useState, useEffect } from "react";
import { User, Key, UserPlus, AtSign, UserCheck } from "lucide-react";
import api from "../../utils/axios";
import { useAlert } from "../../context/AlertContext";
import ConfirmationDialog from "../common/ConfirmationDialog";

function UserCreateForm({ onSuccess }) {
  const { showSuccess, showError } = useAlert();
  const [isMobile, setIsMobile] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    firstname: "",
    lastname: "",
    branch: "ITD",
    role: "reporter",
  });

  const [loading, setLoading] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    isLoading: false,
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (
      !formData.username?.trim() ||
      !formData.password?.trim() ||
      !formData.firstname?.trim() ||
      !formData.lastname?.trim()
    ) {
      showError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    // Show confirmation dialog
    setConfirmDialog({
      isOpen: true,
      title: "ยืนยันการเพิ่มผู้ใช้",
      message: `คุณต้องการเพิ่มผู้ใช้ ${formData.firstname} ${formData.lastname} (${formData.username}) ใช่หรือไม่?`,
      isLoading: false,
    });
  };

  const handleConfirmSubmit = async () => {
    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await api.post("/users/new", {
        username: formData.username.trim(),
        password: formData.password.trim(),
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        branch: formData.branch.trim(),
        role: formData.role.trim(),
      });

      if (response.data.success) {
        showSuccess("เพิ่มผู้ใช้สำเร็จ");
        onSuccess?.();
        setFormData({
          username: "",
          password: "",
          firstname: "",
          lastname: "",
          branch: "ITD",
          role: "reporter",
        });
      }
    } catch (err) {
      console.error("Error creating user:", err);
      showError(
        err.response?.data?.message || "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้"
      );
    } finally {
      setConfirmDialog((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-700";
      case "equipment_manager":
        return "bg-blue-100 text-blue-700";
      case "equipment_assistant":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case "admin":
        return "ผู้ดูแลระบบ";
      case "equipment_manager":
        return "ผู้จัดการครุภัณฑ์";
      case "equipment_assistant":
        return "ผู้ช่วยดูแลครุภัณฑ์";
      case "reporter":
        return "ผู้แจ้งปัญหา";
      default:
        return role;
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center">
          <UserPlus className="h-5 w-5 mr-2" />
          เพิ่มผู้ใช้ใหม่
        </h2>
      </div>

      <div className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="username"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
              >
                ชื่อผู้ใช้
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AtSign className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="username"
                  id="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  required
                  placeholder="กรอกชื่อผู้ใช้"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
              >
                รหัสผ่าน
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="password"
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  required
                  placeholder="กรอกรหัสผ่าน"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="firstname"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
              >
                ชื่อ
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="firstname"
                  id="firstname"
                  value={formData.firstname}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  required
                  placeholder="กรอกชื่อ"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="lastname"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
              >
                นามสกุล
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="lastname"
                  id="lastname"
                  value={formData.lastname}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                  required
                  placeholder="กรอกนามสกุล"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="branch"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
              >
                หลักสูตร
              </label>
              <select
                id="branch"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
              >
                <option value="ITD">เทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล</option>
                <option value="MIT">นวัตกรรมสารสนเทศทางการแพทย์</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
              >
                บทบาท
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={`block w-full pl-3 pr-10 py-2 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm ${getRoleBadgeColor(
                  formData.role
                )}`}
              >
                <option value="reporter">ผู้แจ้งปัญหา</option>
                <option value="equipment_assistant">ผู้ช่วยดูแลครุภัณฑ์</option>
                <option value="equipment_manager">ผู้จัดการครุภัณฑ์</option>
                <option value="admin">ผู้ดูแลระบบ</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3">
            <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-0 sm:mr-auto text-center sm:text-left">
              * ช่องที่มีเครื่องหมายดอกจันทร์ (*) จำเป็นต้องกรอก
            </p>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto mt-3 sm:mt-0 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 text-xs sm:text-sm"
            >
              {loading ? "กำลังบันทึก..." : "เพิ่มผู้ใช้"}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmSubmit}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isLoading={confirmDialog.isLoading}
        confirmText="เพิ่มผู้ใช้"
        cancelText="ยกเลิก"
        confirmButtonClass="bg-indigo-600 hover:bg-indigo-700"
      />
    </div>
  );
}

export default UserCreateForm;
