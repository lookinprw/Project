import React, { useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import EquipmentList from "../components/equipment/EquipmentList";
import EquipmentForm from "../components/equipment/EquipmentForm";
import CsvImporter from "../components/equipment/CsvImporter";
import { Plus, Database, Upload } from "lucide-react";

function EquipmentPage() {
  const [activeView, setActiveView] = useState("list"); // list, form, import
  const [editingEquipment, setEditingEquipment] = useState(null);

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
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">จัดการครุภัณฑ์</h1>

        <div className="flex items-center space-x-3">
          {activeView === "list" ? (
            <>
              <button
                onClick={() => handleViewChange("import")}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Upload className="w-4 h-4 mr-2" />
                นำเข้าจาก CSV
              </button>
              <button
                onClick={() => handleViewChange("form")}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มครุภัณฑ์ใหม่
              </button>
            </>
          ) : (
            <button
              onClick={() => handleViewChange("list")}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <Database className="w-4 h-4 mr-2" />
              ดูรายการครุภัณฑ์
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {activeView === "form" && (
          <EquipmentForm
            equipment={editingEquipment}
            onComplete={handleComplete}
          />
        )}

        {activeView === "import" && <CsvImporter onComplete={handleComplete} />}

        {activeView === "list" && <EquipmentList onEdit={handleEdit} />}
      </div>
    </DashboardLayout>
  );
}

export default EquipmentPage;
