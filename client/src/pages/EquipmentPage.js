// src/pages/EquipmentPage.js
import React, { useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import EquipmentList from "../components/equipment/EquipmentList";
import EquipmentForm from "../components/equipment/EquipmentForm";

function EquipmentPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);

  return (
    <DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">จัดการครุภัณฑ์</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingEquipment(null);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          {showForm ? "ดูรายการครุภัณฑ์" : "เพิ่มครุภัณฑ์ใหม่"}
        </button>
      </div>

      <div className="space-y-8">
        {showForm ? (
          <EquipmentForm
            equipment={editingEquipment}
            onComplete={() => {
              setShowForm(false);
              setEditingEquipment(null);
            }}
          />
        ) : (
          <EquipmentList
            onEdit={(equipment) => {
              setEditingEquipment(equipment);
              setShowForm(true);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default EquipmentPage;
