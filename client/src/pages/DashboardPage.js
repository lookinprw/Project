import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import ProblemForm from "../components/problems/ProblemForm";
import { User, Monitor, HardDrive, HelpCircle, Filter } from "lucide-react";
import api from "../utils/axios";
import { StatusSelect } from "../components/problems/StatusSelect";

function DashboardPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [filters, setFilters] = useState({
    status: [],
    type: [],
  });

  const isStaff =
    currentUser &&
    ["admin", "equipment_manager", "equipment_assistant"].includes(
      currentUser.role
    );

  const tableHeaders = [
    "ลำดับ",
    "วันที่",
    "รหัสครุภัณฑ์",
    "อุปกรณ์",
    "ห้อง",
    "ปัญหา",
    "ประเภทปัญหา",
    "ผู้แจ้ง",
    "รับงาน",
    "ผู้รับผิดชอบ",
    !isStaff ? "สถานะ" : "จัดการ",
  ].filter(Boolean);

  const getProblemTypeDetails = (type) => {
    switch (type) {
      case "hardware":
        return {
          icon: <HardDrive className="w-4 h-4" />,
          label: "ฮาร์ดแวร์",
          bgColor: "bg-red-100",
          textColor: "text-red-800",
          borderColor: "border-red-200",
        };
      case "software":
        return {
          icon: <Monitor className="w-4 h-4" />,
          label: "ซอฟต์แวร์",
          bgColor: "bg-blue-100",
          textColor: "text-blue-800",
          borderColor: "border-blue-200",
        };
      default:
        return {
          icon: <HelpCircle className="w-4 h-4" />,
          label: "อื่นๆ",
          bgColor: "bg-gray-100",
          textColor: "text-gray-800",
          borderColor: "border-gray-200",
        };
    }
  };

  // In DashboardPage.js, modify the fetchProblems function
  // In DashboardPage.js, modify the fetchProblems function
  const fetchProblems = async () => {
    try {
      setLoading(true);
      const [statusesRes, problemsRes] = await Promise.all([
        api.get("/status"),
        api.get("/problems"),
      ]);

      if (statusesRes.data.success && problemsRes.data.success) {
        // Filter statuses for the dropdown/filter options only
        let filteredStatuses = statusesRes.data.data;
        if (currentUser?.role === "equipment_assistant") {
          filteredStatuses = filteredStatuses.filter(
            (status) => ![1, 7, 8].includes(status.id)
          );
        }
        setStatuses(filteredStatuses);

        let filteredProblems = problemsRes.data.data;

        // Original equipment assistant filtering logic
        if (currentUser?.role === "equipment_assistant") {
          filteredProblems = filteredProblems.filter(
            (problem) =>
              problem.status_id === 1 || // Keep this to show pending problems
              (problem.status_id === 2 &&
                problem.assigned_to === currentUser.id) ||
              problem.reported_by === currentUser.id
          );
        }

        if (filters.status.length > 0) {
          filteredProblems = filteredProblems.filter((problem) =>
            filters.status.includes(problem.status_id)
          );
        }

        if (filters.type.length > 0) {
          filteredProblems = filteredProblems.filter((problem) =>
            filters.type.includes(problem.problem_type)
          );
        }

        setProblems(filteredProblems);
      }
    } catch (err) {
      setError(err.message || "ไม่สามารถดึงข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    fetchProblems();
  }, [currentUser, navigate, filters]);

  const handleAssign = async (problemId) => {
    try {
      const response = await api.patch(`/problems/${problemId}/assign`);
      if (response.data.success) {
        await fetchProblems();
      }
    } catch (err) {
      setError("ไม่สามารถรับมอบหมายงานได้");
    }
  };

  const renderStatusColumn = (problem) => {
    if (isStaff) {
      return (
        <StatusSelect
          problem={{
            id: problem.id,
            status_id: problem.status_id,
            status_color: problem.status_color,
            status_name: problem.status_name,
            equipment_id: problem.equipment_id,
          }}
          statuses={statuses}
          onStatusChange={fetchProblems}
        />
      );
    }
    return (
      <span
        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
        style={{
          backgroundColor: problem.status_color,
          color: "#000000",
        }}
      >
        {problem.status_name}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <div className="inline-block animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full" />
            <p className="mt-4 text-lg text-gray-600">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50/50 p-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                ระบบแจ้งปัญหาครุภัณฑ์คอมพิวเตอร์
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                จัดการและติดตามการแจ้งปัญหาครุภัณฑ์ทั้งหมด
              </p>
            </div>
            <button
              onClick={() => setShowProblemForm(!showProblemForm)}
              className="px-6 py-2.5 rounded-lg text-white font-medium bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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

        {/* Main Content */}
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
          <>
            {/* Filter Section */}
            {isStaff && (
              <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-medium">ตัวกรอง</h3>
                </div>

                <div className="flex flex-wrap gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      สถานะ
                    </label>
                    <div className="space-x-4">
                      {statuses.map((status) => (
                        <label
                          key={status.id}
                          className="inline-flex items-center"
                        >
                          <input
                            type="checkbox"
                            checked={filters.status.includes(status.id)}
                            onChange={() => {
                              setFilters((prev) => ({
                                ...prev,
                                status: prev.status.includes(status.id)
                                  ? prev.status.filter((s) => s !== status.id)
                                  : [...prev.status, status.id],
                              }));
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">
                            {status.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ประเภทปัญหา
                    </label>
                    <div className="space-x-4">
                      {[
                        { value: "hardware", label: "ฮาร์ดแวร์" },
                        { value: "software", label: "ซอฟต์แวร์" },
                      ].map((type) => (
                        <label
                          key={type.value}
                          className="inline-flex items-center"
                        >
                          <input
                            type="checkbox"
                            checked={filters.type.includes(type.value)}
                            onChange={() => {
                              setFilters((prev) => ({
                                ...prev,
                                type: prev.type.includes(type.value)
                                  ? prev.type.filter((t) => t !== type.value)
                                  : [...prev.type, type.value],
                              }));
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">
                            {type.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Table Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      {tableHeaders.map((header, index) => (
                        <th
                          key={index}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {problems.map((problem, index) => {
                      const typeDetails = getProblemTypeDetails(
                        problem.problem_type
                      );

                      return (
                        <tr
                          key={problem.id}
                          className="hover:bg-gray-50/50 transition-colors duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(problem.created_at).toLocaleDateString(
                              "th-TH"
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {problem.equipment_id || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {problem.equipment_name || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {problem.equipment_room || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {problem.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div
                              className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-sm ${typeDetails.bgColor} ${typeDetails.textColor} border ${typeDetails.borderColor}`}
                            >
                              {typeDetails.icon}
                              <span>{typeDetails.label}</span>
                            </div>
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
                            {problem.status_id === 1 && isStaff ? (
                              <button
                                onClick={() => handleAssign(problem.id)}
                                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                              >
                                รับเรื่อง
                              </button>
                            ) : (
                              <span className="text-sm text-gray-500">
                                {problem.status_id === 1
                                  ? "รอรับเรื่อง"
                                  : "รับเรื่องแล้ว"}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">
                                {problem.assigned_to_name || "-"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderStatusColumn(problem)}
                          </td>
                        </tr>
                      );
                    })}
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;
