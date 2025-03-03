import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import EquipmentList from "../components/equipment/EquipmentList";
import EquipmentForm from "../components/equipment/EquipmentForm";
import CsvImporter from "../components/equipment/CsvImporter";
import { Plus, Database, Upload, ArrowLeft } from "lucide-react";

function EquipmentPage() {
  const [activeView, setActiveView] = useState("list"); // list, form, import
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleViewChange = (view) => {
    setActiveView(view);
    if (view !== "form") {
      setEditingEquipment(null);
    }
  };

  // Function to handle edit button click from EquipmentList
  const handleEdit = (equipment) => {
    setEditingEquipment(equipment);
    setActiveView("form");
  };

  // Function called after form completion or CSV import is done
  const handleComplete = () => {
    setActiveView("list");
    setEditingEquipment(null);
  };

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-0 min-h-screen bg-gray-50/50 sm:bg-transparent">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between sm:items-center space-y-3 sm:space-y-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            {activeView === "list"
              ? "จัดการครุภัณฑ์"
              : activeView === "form"
              ? editingEquipment
                ? "แก้ไขครุภัณฑ์"
                : "เพิ่มครุภัณฑ์ใหม่"
              : "นำเข้าข้อมูลจาก CSV"}
          </h1>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {activeView === "list" ? (
              <>
                <button
                  onClick={() => handleViewChange("import")}
                  className="flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">นำเข้าจาก CSV</span>
                  <span className="sm:hidden">นำเข้า CSV</span>
                </button>
                <button
                  onClick={() => handleViewChange("form")}
                  className="flex items-center px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-xs sm:text-sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">เพิ่มครุภัณฑ์ใหม่</span>
                  <span className="sm:hidden">เพิ่ม</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handleViewChange("list")}
                className="flex items-center px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-xs sm:text-sm"
              >
                {isMobile ? (
                  <>
                    <ArrowLeft className="w-3 h-3 mr-1" />
                    <span>กลับ</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    <span>ดูรายการครุภัณฑ์</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4 sm:space-y-8">
          {activeView === "form" && (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm sm:shadow">
              <EquipmentForm
                equipment={editingEquipment}
                onComplete={handleComplete}
                isMobile={isMobile}
              />
            </div>
          )}

          {activeView === "import" && (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm sm:shadow">
              <CsvImporter onComplete={handleComplete} isMobile={isMobile} />
            </div>
          )}

          {activeView === "list" && (
            <EquipmentList onEdit={handleEdit} isMobile={isMobile} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default EquipmentPage;
