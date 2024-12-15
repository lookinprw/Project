import React from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import UnfixableProblems from "../components/problems/UnfixableProblems";

function UnfixablePage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-6">
          รายการที่ไม่สามารถแก้ไขได้
        </h1>
        <UnfixableProblems />
      </div>
    </DashboardLayout>
  );
}

export default UnfixablePage;
