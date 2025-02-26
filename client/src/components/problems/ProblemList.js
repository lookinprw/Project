import React, { useState, useEffect } from "react";
import { Edit, Trash2, Search as SearchIcon } from "lucide-react";
import api from "../../utils/axios";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import ConfirmationDialog from "../common/ConfirmationDialog";
import ProblemForm from "./ProblemForm";

function ProblemList() {
  const { user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const [problems, setProblems] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // For editing problems
  const [editingProblem, setEditingProblem] = useState(null);

  // For confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    itemId: null,
    isLoading: false,
    confirmButtonClass: "",
    confirmText: "",
  });

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const [problemsRes, statusesRes] = await Promise.all([
        api.get("/problems"),
        api.get("/status"),
      ]);

      setProblems(problemsRes.data.data || []);
      setStatuses(statusesRes.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      showError("ไม่สามารถดึงข้อมูลได้");
      setLoading(false);
    }
  };

  const getStatusDetails = (statusId) => {
    return (
      statuses.find((s) => s.id === statusId) || {
        name: "ไม่ระบุ",
        color: "#666666",
      }
    );
  };

  const handleStatusChange = async (problemId, newStatusId) => {
    try {
      await api.patch(`/problems/${problemId}/status`, {
        status_id: newStatusId,
      });
      showSuccess("อัพเดทสถานะสำเร็จ");
      fetchProblems();
    } catch (error) {
      console.error("Error updating status:", error);
      showError("ไม่สามารถอัพเดทสถานะได้");
    }
  };

  const handleEditProblem = (problem) => {
    setEditingProblem(problem);
  };

  const handleDeleteProblem = (problemId) => {
    // Check if user can delete this problem
    const problem = problems.find((p) => p.id === problemId);

    // Only allow delete if user is equipment_manager or is the reporter
    const canDelete =
      user.role === "admin" ||
      user.role === "equipment_manager" ||
      (problem && problem.reported_by === user.id);

    if (!canDelete) {
      showError("คุณไม่มีสิทธิ์ลบรายการนี้");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "ยืนยันการลบรายการ",
      message: "คุณต้องการลบรายการแจ้งปัญหานี้ใช่หรือไม่?",
      itemId: problemId,
      isLoading: false,
      confirmButtonClass: "bg-red-600 hover:bg-red-700",
      confirmText: "ลบ",
    });
  };

  const confirmDeleteProblem = async () => {
    setConfirmDialog((prev) => ({ ...prev, isLoading: true }));

    try {
      await api.delete(`/problems/${confirmDialog.itemId}`);
      showSuccess("ลบรายการสำเร็จ");
      fetchProblems();
    } catch (error) {
      console.error("Error deleting problem:", error);
      showError(error.response?.data?.message || "ไม่สามารถลบรายการได้");
    } finally {
      setConfirmDialog((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));
    }
  };

  // Function to check if user can modify a problem
  const canModifyProblem = (problem) => {
    if (!problem || !user) return false;

    // Admin and equipment_manager can modify any problem
    if (user.role === "admin" || user.role === "equipment_manager") {
      return true;
    }

    // Users can only modify their own problems
    return problem.reported_by === user.id;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  // If editing a problem, show the edit form
  if (editingProblem) {
    return (
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">แก้ไขรายการแจ้งปัญหา</h2>
          <ProblemForm
            problem={editingProblem}
            onComplete={() => {
              setEditingProblem(null);
              fetchProblems();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ลำดับ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                วันที่
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                อุปกรณ์
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                รหัสครุภัณฑ์
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ห้อง
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ปัญหา
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ประเภทปัญหา
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ผู้แจ้ง
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                สถานะ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                จัดการ
              </th>
            </tr>
          </thead>
          <tbody>
            {problems.map((problem, index) => (
              <tr key={problem.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(problem.created_at).toLocaleDateString("th-TH")}
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
                  {problem.problem_type === "hardware"
                    ? "ฮาร์ดแวร์"
                    : problem.problem_type === "software"
                    ? "ซอฟต์แวร์"
                    : "อื่นๆ"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {problem.reporter_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user &&
                  (user.role === "admin" ||
                    user.role === "equipment_manager" ||
                    user.role === "equipment_assistant") ? (
                    <select
                      value={problem.status_id}
                      onChange={(e) =>
                        handleStatusChange(problem.id, parseInt(e.target.value))
                      }
                      className="block w-40 py-1 px-2 border rounded-md text-sm font-medium"
                      style={{ backgroundColor: problem.status_color }}
                    >
                      {statuses.map((status) => (
                        <option
                          key={status.id}
                          value={status.id}
                          style={{ backgroundColor: "white" }}
                        >
                          {status.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className="inline-flex px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: problem.status_color,
                        color: "#000000",
                      }}
                    >
                      {problem.status_name}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  {canModifyProblem(problem) && (
                    <>
                      <button
                        onClick={() => handleEditProblem(problem)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        title="แก้ไข"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteProblem(problem.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="ลบ"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {problems.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">ไม่มีรายการแจ้งปัญหา</p>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDeleteProblem}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isLoading={confirmDialog.isLoading}
        confirmText={confirmDialog.confirmText}
        cancelText="ยกเลิก"
        confirmButtonClass={confirmDialog.confirmButtonClass}
      />
    </div>
  );
}

export default ProblemList;
