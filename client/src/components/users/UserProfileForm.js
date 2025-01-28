import React from "react";
import { useAuth } from "../../context/AuthContext";

function UserProfileForm() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
        <h2 className="text-2xl font-bold">ข้อมูลโปรไฟล์</h2>
      </div>

      <div className="p-6">
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">รหัสผู้ใช้</p>
              <p className="font-medium">{user.student_id}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">ชื่อ-นามสกุล</p>
              <p className="font-medium">{`${user.firstname} ${user.lastname}`}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">สาขา</p>
              <p className="font-medium">
                {user.branch === "ITD"
                  ? "เทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล"
                  : "นวัตกรรมสารสนเทศทางการแพทย์"}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">บทบาท</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                {user.role === "admin"
                  ? "ผู้ดูแลระบบ"
                  : user.role === "equipment_manager"
                  ? "ผู้จัดการครุภัณฑ์"
                  : user.role === "equipment_assistant"
                  ? "ผู้ช่วยดูแลครุภัณฑ์"
                  : "นักศึกษา"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfileForm;
