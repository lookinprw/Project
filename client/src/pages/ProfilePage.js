// src/pages/ProfilePage.js
import React, { useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { User, MessageSquare, Copy, Check } from "lucide-react";
import UserProfileForm from "../components/users/UserProfileForm";

function ProfilePage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyLineId = () => {
    if (user?.line_user_id) {
      navigator.clipboard.writeText(user.line_user_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
              <h1 className="text-2xl font-bold">ข้อมูลโปรไฟล์</h1>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* User Info Card */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="flex items-center mb-4">
                  <div className="bg-indigo-100 p-3 rounded-full">
                    <User className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-semibold">{`${user?.firstname} ${user?.lastname}`}</h2>
                    <p className="text-gray-500 text-sm">{user?.student_id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">สาขา</p>
                    <p className="font-medium">
                      {user?.branch === "ITD"
                        ? "เทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล"
                        : "นวัตกรรมสารสนเทศทางการแพทย์"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">บทบาท</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      {user?.role === "admin"
                        ? "ผู้ดูแลระบบ"
                        : user?.role === "equipment_manager"
                        ? "ผู้จัดการครุภัณฑ์"
                        : user?.role === "equipment_assistant"
                        ? "ผู้ช่วยดูแลครุภัณฑ์"
                        : "นักศึกษา"}
                    </span>
                  </div>
                </div>
              </div>

              {/* LINE Connection Card */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-semibold">การเชื่อมต่อ LINE</h2>
                    <p className="text-gray-500 text-sm">
                      สถานะการเชื่อมต่อกับ LINE Official Account
                    </p>
                  </div>
                </div>

                {user?.line_user_id ? (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">LINE User ID</p>
                        <p className="font-medium font-mono">
                          {user.line_user_id}
                        </p>
                      </div>
                      <button
                        onClick={copyLineId}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                        title="คัดลอก LINE ID"
                      >
                        {copied ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <Copy className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <div className="mt-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                        เชื่อมต่อแล้ว
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-600 mb-4">
                      คุณยังไม่ได้เชื่อมต่อกับ LINE Official Account
                      กรุณาทำตามขั้นตอนดังนี้:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 ml-2">
                      <li>เพิ่มเพื่อน LINE Official Account ของระบบ</li>
                      <li>พิมพ์ !id ในแชท</li>
                      <li>คัดลอก LINE User ID ที่ได้</li>
                      <li>นำ ID มากรอกในระบบเพื่อเชื่อมต่อ</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <UserProfileForm />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ProfilePage;
