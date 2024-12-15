import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import ProblemForm from "../components/problems/ProblemForm";
import { Activity, User } from "lucide-react";
import api from "../utils/axios";
import { StatusSelect } from "../components/problems/StatusSelect";

function DashboardPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [updating, setUpdating] = useState(null);

  const isStaff =
    currentUser &&
    ["admin", "equipment_manager", "equipment_assistant"].includes(
      currentUser.role
    );
  const canManageStatus =
    currentUser && ["admin", "equipment_manager"].includes(currentUser.role);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        await fetchProblems();
        if (isStaff) {
          await fetchStaffList();
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
        setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      }
    };
    loadInitialData();
  }, [currentUser, isStaff, navigate]);

  const tableHeaders = [
    "อุปกรณ์",
    "รหัสครุภัณฑ์",
    "ห้อง",
    "ปัญหา",
    "ผู้แจ้ง",
    "ผู้รับผิดชอบ",
    "สถานะ",
    isStaff && "จัดการ",
  ].filter(Boolean);

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "รอดำเนินการ";
      case "in_progress":
        return "กำลังดำเนินการ";
      case "resolved":
        return "เสร็จสิ้น";
      case "cannot_fix":
        return "ไม่สามารถแก้ไขได้";
      default:
        return status;
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300";
      case "in_progress":
        return "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300";
      case "resolved":
        return "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300";
      case "cannot_fix":
        return "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300";
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300";
    }
  };

  const fetchStaffList = async () => {
    try {
      if (!isStaff) return;

      const response = await api.get("/users", {
        params: {
          role: ["equipment_manager", "equipment_assistant"],
        },
      });

      if (response.data.success && Array.isArray(response.data.data)) {
        const filteredStaff = response.data.data.filter(
          (user) =>
            user &&
            user.role &&
            ["admin", "equipment_manager", "equipment_assistant"].includes(
              user.role
            )
        );
        setStaffList(filteredStaff);
      } else {
        console.warn("Invalid staff data received:", response.data);
        setStaffList([]);
      }
    } catch (err) {
      console.error("Error fetching staff list:", err);
      if (err.response?.status !== 403) {
        setError("ไม่สามารถดึงข้อมูลเจ้าหน้าที่ได้");
      }
      setStaffList([]);
    }
  };

  const fetchProblems = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/problems");

      if (response.data.success) {
        setProblems(response.data.data);
      } else {
        throw new Error(response.data.message || "Failed to fetch problems");
      }
    } catch (err) {
      console.error("Error fetching problems:", err);
      setError(err.message || "ไม่สามารถดึงข้อมูลปัญหาได้");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (problemId) => {
    if (!currentUser || updating) return;

    try {
      const problem = problems.find((p) => p.id === problemId);

      if (!problem) {
        setError("ไม่พบข้อมูลปัญหา");
        return;
      }

      if (problem.assigned_to) {
        handleReassign(problemId);
        return;
      }

      setUpdating(problemId);
      setError("");

      const response = await api.patch(`/problems/${problemId}/assign`);

      if (response.data.success) {
        await fetchProblems();
      }
    } catch (err) {
      console.error("Assignment error:", err.response?.data);
      setError(
        err.response?.data?.message || "เกิดข้อผิดพลาดในการรับมอบหมายงาน"
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleReassign = async (problemId) => {
    try {
      const problem = problems.find((p) => p.id === problemId);
      if (!problem) {
        setError("ไม่พบข้อมูลปัญหา");
        return;
      }

      if (!["admin", "equipment_manager"].includes(currentUser.role)) {
        setError("ไม่มีสิทธิ์ในการมอบหมายงานใหม่");
        return;
      }

      setSelectedProblem(problem);
      setShowReassignModal(true);
    } catch (error) {
      console.error("Error preparing reassignment:", error);
      setError("ไม่สามารถเตรียมการมอบหมายงานได้");
    }
  };

  const handleReassignSubmit = async (newStaffId) => {
    if (!selectedProblem || !newStaffId || updating) return;

    try {
      setUpdating(true);
      setError("");

      const response = await api.patch(
        `/problems/${selectedProblem.id}/reassign`,
        {
          assigned_to: parseInt(newStaffId),
        }
      );

      if (response.data.success) {
        await fetchProblems();
        setShowReassignModal(false);
        setSelectedProblem(null);
      } else {
        throw new Error(response.data.message || "Failed to reassign problem");
      }
    } catch (err) {
      console.error("Error reassigning problem:", err);
      setError(err.message || "ไม่สามารถมอบหมายงานใหม่ได้");
    } finally {
      setUpdating(false);
    }
  };

  const ReassignModal = ({ problem, staff, onReassign, onClose }) => {
    const [selectedStaffId, setSelectedStaffId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validStaff = Array.isArray(staff) ? staff : [];

    const handleSubmit = async () => {
      if (!selectedStaffId) return;

      setIsSubmitting(true);
      try {
        await onReassign(selectedStaffId);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">มอบหมายงานใหม่</h3>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">ข้อมูลปัจจุบัน:</p>
              <p className="text-sm">
                <strong>อุปกรณ์:</strong> {problem.equipment_name}
              </p>
              <p className="text-sm">
                <strong>รหัสครุภัณฑ์:</strong> {problem.equipment_id}
              </p>
              <p className="text-sm">
                <strong>ผู้รับผิดชอบปัจจุบัน:</strong>{" "}
                {problem.assigned_to_name || "ยังไม่มีผู้รับผิดชอบ"}
              </p>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              เลือกผู้รับผิดชอบใหม่
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isSubmitting}
            >
              <option value="">เลือกผู้รับผิดชอบ</option>
              {validStaff
                .filter((s) => s && s.id && s.id !== problem?.assigned_to)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstname} {s.lastname} ({getRoleLabel(s.role)})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 
                       disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedStaffId || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "กำลังบันทึก..." : "ยืนยัน"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getRoleLabel = (role) => {
    if (!role) return "ไม่ระบุ";

    const roleLabels = {
      admin: "ผู้ดูแลระบบ",
      equipment_manager: "ผู้จัดการครุภัณฑ์",
      equipment_assistant: "ผู้ช่วยดูแลครุภัณฑ์",
    };
    return roleLabels[role] || role;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-lg text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50/50 p-6">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ระบบแจ้งปัญหาครุภัณฑ์
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                จัดการและติดตามการแจ้งปัญหาครุภัณฑ์ทั้งหมด
              </p>
            </div>
            <button
              onClick={() => setShowProblemForm(!showProblemForm)}
              className="px-6 py-2.5 rounded-lg text-white font-medium
                       bg-gradient-to-r from-indigo-600 to-indigo-700 
                       hover:from-indigo-700 hover:to-indigo-800
                       shadow-md hover:shadow-lg
                       transform transition-all duration-200 hover:scale-105
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {showProblemForm ? (
                <span className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  ดูรายการแจ้งปัญหา
                </span>
              ) : (
                <span className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  แจ้งปัญหาใหม่
                </span>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {showProblemForm ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <ProblemForm
              onClose={() => {
                setShowProblemForm(false);
                fetchProblems();
              }}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    {tableHeaders.map((header, index) => (
                      <th
                        key={index}
                        className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {problems.map((problem) => (
                    <tr
                      key={problem.id}
                      className="hover:bg-gray-50/50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {problem.equipment_name || "N/A"}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {problem.equipment_id || "N/A"}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {problem.room || "N/A"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">
                          {problem.description}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {problem.reporter_name}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {problem.assigned_to_name ? (
                          <div className="flex items-center">
                            <Activity className="h-4 w-4 text-green-400 mr-2" />
                            <div>
                              <span className="text-sm text-gray-900">
                                {problem.assigned_to_name}
                              </span>
                              {(problem.assigned_to === currentUser.id ||
                                currentUser.role === "admin") && (
                                <button
                                  onClick={() => handleReassign(problem.id)}
                                  className="ml-2 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                >
                                  มอบหมายใหม่
                                </button>
                              )}
                            </div>
                          </div>
                        ) : isStaff ? (
                          <button
                            onClick={() => handleAssign(problem.id)}
                            disabled={updating === problem.id}
                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded 
                                 text-indigo-700 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-50"
                          >
                            {updating === problem.id
                              ? "กำลังรับเรื่อง..."
                              : "รับเรื่อง"}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-500">
                            ยังไม่มีผู้รับผิดชอบ
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                            problem.status
                          )}`}
                        >
                          {getStatusText(problem.status)}
                        </span>
                      </td>

                      {isStaff && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusSelect
                            problem={problem}
                            onStatusChange={() => fetchProblems()}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {problems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg
                    className="w-16 h-16 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="mt-4 text-lg font-medium text-gray-900">
                    ไม่พบรายการแจ้งปัญหา
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    เริ่มต้นแจ้งปัญหาโดยคลิกที่ปุ่ม "แจ้งปัญหาใหม่"
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {showReassignModal && selectedProblem && (
          <ReassignModal
            problem={selectedProblem}
            staff={staffList}
            onReassign={handleReassignSubmit}
            onClose={() => {
              setShowReassignModal(false);
              setSelectedProblem(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;
