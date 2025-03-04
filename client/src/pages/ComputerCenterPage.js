// pages/ComputerCenterPage.js
import React, { useState, useEffect } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import api from "../utils/axios";
import { useAlert } from "../context/AlertContext";
import ConfirmationDialog from "../components/common/ConfirmationDialog";

function ComputerCenterPage() {
  const { showSuccess, showError } = useAlert();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [expandedItems, setExpandedItems] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    isLoading: false,
    confirmButtonClass: "",
    confirmText: "",
    confirmAction: null,
    showCommentField: false,
    icon: null,
  });

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Toggle expanded item for mobile view
  const toggleExpandItem = (id) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Fetch only referred_to_cc problems
  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusesRes, problemsRes] = await Promise.all([
        api.get("/status"),
        api.get("/problems"),
      ]);

      if (statusesRes.data.success) {
        setStatuses(statusesRes.data.data);
      }

      if (problemsRes.data.success) {
        const referredProblems = problemsRes.data.data.filter(
          (problem) => problem.status_id === 7 // Computer Center ID
        );
        setProblems(referredProblems);
      }
    } catch (err) {
      showError("ไม่สามารถดึงข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = async (statusId) => {
    if (selectedProblems.length === 0) {
      showError("กรุณาเลือกรายการที่ต้องการอัพเดทสถานะ");
      return;
    }

    const statusMessages = {
      8: "ชำรุดเสียหาย",
      3: "เสร็จสิ้น",
    };

    const confirmMessage = statusMessages[statusId];
    if (!confirmMessage) {
      showError("ไม่พบสถานะที่ต้องการ");
      return;
    }

    // Use custom confirmation dialog
    setConfirmDialog({
      isOpen: true,
      title: "ยืนยันการเปลี่ยนสถานะ",
      message: `ยืนยันการเปลี่ยนสถานะเป็น ${confirmMessage} จำนวน ${selectedProblems.length} รายการ?`,
      confirmText: "ยืนยัน",
      cancelText: "ยกเลิก",
      confirmButtonClass:
        statusId === 8
          ? "bg-red-600 hover:bg-red-700"
          : "bg-green-600 hover:bg-green-700",
      icon: <AlertCircle className="h-6 w-6 text-red-600" />,
      isLoading: false,
      showCommentField: false,
      confirmAction: async () => {
        try {
          setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
          setUpdating(true);

          await Promise.all(
            selectedProblems.map((problemId) =>
              api.patch(`/problems/${problemId}/status`, {
                status_id: statusId,
                comment: confirmMessage,
              })
            )
          );

          showSuccess(`อัพเดทสถานะเป็น ${confirmMessage} สำเร็จ`);
          setSelectedProblems([]);
          await fetchData();
        } catch (err) {
          console.error("Error updating status:", err);
          showError("ไม่สามารถอัพเดทสถานะได้");
        } finally {
          setUpdating(false);
          setConfirmDialog((prev) => ({
            ...prev,
            isOpen: false,
            isLoading: false,
          }));
        }
      },
    });
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedProblems(problems.map((p) => p.id));
    } else {
      setSelectedProblems([]);
    }
  };

  const handleSelectProblem = (problemId) => {
    setSelectedProblems((prev) => {
      if (prev.includes(problemId)) {
        return prev.filter((id) => id !== problemId);
      } else {
        return [...prev, problemId];
      }
    });
  };

  // Render mobile card for each problem
  const renderMobileCard = (problem, index) => {
    const isExpanded = expandedItems.includes(problem.id);

    return (
      <div
        key={problem.id}
        className="bg-white rounded-lg shadow-sm p-4 mb-3 border border-gray-100"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              checked={selectedProblems.includes(problem.id)}
              onChange={() => handleSelectProblem(problem.id)}
              className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <div className="font-medium text-sm">
                {problem.equipment_name || "N/A"}
              </div>
              <div className="text-xs text-gray-500">
                รหัส: {problem.equipment_id || "N/A"}
              </div>
            </div>
          </div>

          <button
            onClick={() => toggleExpandItem(problem.id)}
            className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 pl-6">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <div className="text-xs text-gray-500">ห้อง</div>
                <div className="text-sm">{problem.equipment_room || "N/A"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">วันที่ส่งซ่อม</div>
                <div className="text-sm">
                  {new Date(problem.updated_at).toLocaleDateString("th-TH")}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs text-gray-500">ปัญหา</div>
              <div className="text-sm">{problem.description}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              รายการส่งซ่อมศูนย์คอมพิวเตอร์
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              {problems.length > 0
                ? `พบ ${problems.length} รายการที่ส่งซ่อมศูนย์คอมพิวเตอร์`
                : "ไม่พบรายการที่ส่งซ่อมศูนย์คอมพิวเตอร์"}
            </p>
          </div>

          {problems.length > 0 && (
            <div className="flex space-x-2 sm:space-x-4">
              <button
                onClick={() => handleBulkStatusUpdate(8)}
                disabled={updating || selectedProblems.length === 0}
                className="px-3 sm:px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                ชำรุดเสียหาย
              </button>
              <button
                onClick={() => handleBulkStatusUpdate(3)}
                disabled={updating || selectedProblems.length === 0}
                className="px-3 sm:px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                เสร็จสิ้น
              </button>
            </div>
          )}
        </div>

        {/* Mobile View */}
        {isMobile && (
          <div className="space-y-1">
            {problems.length > 0 ? (
              problems.map((problem, index) => renderMobileCard(problem, index))
            ) : (
              <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                <div className="text-gray-500 text-sm">
                  ไม่พบรายการที่ส่งซ่อมศูนย์คอมพิวเตอร์
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desktop View */}
        {!isMobile && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <input
                      type="checkbox"
                      checked={
                        selectedProblems.length === problems.length &&
                        problems.length > 0
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ลำดับ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    อุปกรณ์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    รหัสครุภัณฑ์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ห้อง
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ปัญหา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    วันที่ส่งซ่อม
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {problems.map((problem, index) => (
                  <tr key={problem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProblems.includes(problem.id)}
                        onChange={() => handleSelectProblem(problem.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {problem.equipment_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {problem.equipment_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {problem.equipment_room}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {problem.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(problem.updated_at).toLocaleDateString("th-TH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {problems.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500">
                  ไม่พบรายการที่ส่งซ่อมศูนย์คอมพิวเตอร์
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (confirmDialog.confirmAction) {
            confirmDialog.confirmAction();
          }
        }}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isLoading={confirmDialog.isLoading}
        confirmText={confirmDialog.confirmText}
        cancelText="ยกเลิก"
        confirmButtonClass={confirmDialog.confirmButtonClass}
        showCommentField={confirmDialog.showCommentField}
        confirmAction={confirmDialog.confirmAction}
        icon={confirmDialog.icon}
      />
    </DashboardLayout>
  );
}

export default ComputerCenterPage;
