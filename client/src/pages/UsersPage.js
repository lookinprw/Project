import React from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import UserList from "../components/users/UserList";

function UsersPage() {
  return (
    <DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">จัดการผู้ใช้งาน</h1>
      </div>
      <UserList />
    </DashboardLayout>
  );
}

export default UsersPage;
