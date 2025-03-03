import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import UserList from "../components/users/UserList";
import UserCreateForm from "../components/users/UserCreateForm";
import ForgotPasswordForm from "../components/users/ForgotPasswordForm";
import { useAuth } from "../context/AuthContext";

function UsersPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add a refresh trigger
  const { user: currentUser } = useAuth();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Function to trigger a refresh
  const refreshUserData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header with buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            จัดการผู้ใช้งาน
          </h1>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="w-full sm:w-auto px-4 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700"
            >
              {showPasswordForm ? "ดูรายการผู้ใช้" : "รีเซ็ตรหัสผ่าน"}
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700"
            >
              {showCreateForm ? "ดูรายการผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}
            </button>
          </div>
        </div>

        {/* Content Section */}
        {showCreateForm ? (
          <UserCreateForm
            isMobile={isMobile}
            onSuccess={() => {
              setShowCreateForm(false);
              refreshUserData(); // Refresh data after adding a user
            }}
          />
        ) : showPasswordForm ? (
          <ForgotPasswordForm isMobile={isMobile} />
        ) : (
          <UserList
            isMobile={isMobile}
            key={refreshTrigger} // Force remount when refreshTrigger changes
            onStatusChange={refreshUserData} // Pass refresh callback
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default UsersPage;
