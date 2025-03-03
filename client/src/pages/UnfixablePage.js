import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import UnfixableProblems from "../components/problems/UnfixableProblems";
import UnfixablePDFButton from "../components/problems/UnfixablePDFButton";

function UnfixablePage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0">
          <h1 className="text-xl sm:text-2xl font-semibold">
            รายการที่ไม่สามารถแก้ไขได้
          </h1>
          <div className="w-full sm:w-auto">
            <UnfixablePDFButton isMobile={isMobile} />
          </div>
        </div>
        <UnfixableProblems isMobile={isMobile} />
      </div>
    </DashboardLayout>
  );
}

export default UnfixablePage;
