// src/pages/UnauthorizedPage.js
import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-xl shadow-md">
        <div className="flex flex-col items-center">
          <ShieldAlert className="text-red-500 w-16 h-16 mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            ไม่มีสิทธิ์เข้าถึง
          </h1>
          <p className="text-gray-600 text-center mb-6">
            คุณไม่มีสิทธิ์เข้าถึงหน้านี้
            โปรดติดต่อผู้ดูแลระบบหากคุณเชื่อว่านี่เป็นข้อผิดพลาด
          </p>
          <div className="flex space-x-4">
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              กลับสู่หน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
