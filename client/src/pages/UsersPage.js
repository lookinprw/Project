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

  // Function to trigger a refresh
  const refreshUserData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with buttons */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้งาน</h1>
          <div className="space-x-4">
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              {showPasswordForm ? "ดูรายการผู้ใช้" : "รีเซ็ตรหัสผ่าน"}
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              {showCreateForm ? "ดูรายการผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}
            </button>
          </div>
        </div>

        {/* Content Section */}
        {showCreateForm ? (
          <UserCreateForm
            onSuccess={() => {
              setShowCreateForm(false);
              refreshUserData(); // Refresh data after adding a user
            }}
          />
        ) : showPasswordForm ? (
          <ForgotPasswordForm />
        ) : (
          <UserList
            key={refreshTrigger} // Force remount when refreshTrigger changes
            onStatusChange={refreshUserData} // Pass refresh callback
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default UsersPage;
