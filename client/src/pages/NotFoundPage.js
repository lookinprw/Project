// src/pages/NotFoundPage.js
import React from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-xl shadow-md">
        <div className="flex flex-col items-center">
          <Search className="text-gray-400 w-16 h-16 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            404 - ไม่พบหน้าที่คุณต้องการ
          </h1>
          <p className="text-gray-600 text-center mb-6">
            หน้าที่คุณกำลังค้นหาอาจถูกย้าย ลบ หรือไม่มีอยู่ในระบบ
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

export default NotFoundPage;
