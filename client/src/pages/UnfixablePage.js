import React from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import UnfixableProblems from "../components/problems/UnfixableProblems";
import UnfixablePDFButton from "../components/problems/UnfixablePDFButton";

function UnfixablePage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">รายการที่ไม่สามารถแก้ไขได้</h1>
          <UnfixablePDFButton />
        </div>
        <UnfixableProblems />
      </div>
    </DashboardLayout>
  );
}

export default UnfixablePage;
