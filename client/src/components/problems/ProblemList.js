import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/axios";
import { StatusSelect } from "./StatusSelect";
import { PROBLEM_STATUS, getStatusBadgeColor } from "../../utils/constants";

function ProblemList() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProblems();
  }, []);

  const handleAssign = async (problemId) => {
    try {
      const response = await api.patch(`/problems/${problemId}/assign`, {
        assigned_to: currentUser.id,
      });

      if (response.data.success) {
        fetchProblems(); // Refresh list
      }
    } catch (error) {
      setError("ไม่สามารถรับมอบหมายงานได้");
    }
  };

  const fetchProblems = async () => {
    try {
      const response = await api.get("/problems");
      if (response.data.success) {
        setProblems(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching problems:", error);
      setError("ไม่สามารถดึงข้อมูลปัญหาได้");
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "รอดำเนินการ";
      case "in_progress":
        return "กำลังดำเนินการ";
      case "resolved":
        return "เสร็จสิ้น";
      default:
        return status;
    }
  };

  const handleStatusChange = () => {
    fetchProblems(); // Refresh the list after status change
  };

  if (loading)
    return <div className="text-center py-4">กำลังโหลดข้อมูล...</div>;
  if (error)
    return <div className="text-center py-4 text-red-600">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
                สถานะ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ผู้รับผิดชอบ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {problems.map((problem) => (
              <tr key={problem.id}>
                {/* Existing columns */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {problem.equipment_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {problem.equipment_id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {problem.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-2" />
                    <div className="text-sm text-gray-900">
                      {problem.reporter_name}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {problem.assigned_to_name ? (
                    <div className="flex items-center">
                      <Activity className="h-4 w-4 text-green-400 mr-2" />
                      <div className="text-sm text-gray-900">
                        {problem.assigned_to_name}
                      </div>
                    </div>
                  ) : isStaff ? (
                    <button
                      onClick={() => handleAssign(problem.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      รับเรื่อง
                    </button>
                  ) : (
                    <span className="text-sm text-gray-500">
                      ยังไม่มีผู้รับผิดชอบ
                    </span>
                  )}
                </td>
                {/* Status column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {isStaff ? (
                    <StatusSelect
                      problem={problem}
                      onStatusChange={handleStatusChange}
                    />
                  ) : (
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full 
                        ${getStatusBadgeColor(problem.status)}`}
                    >
                      {PROBLEM_STATUS[problem.status]}
                    </span>
                  )}
                </td>
                {/* Management column */}
                {isStaff && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <select
                      value={problem.status}
                      onChange={(e) =>
                        handleStatusUpdate(problem.id, e.target.value)
                      }
                      className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    >
                      <option value="pending">รอดำเนินการ</option>
                      <option value="in_progress">กำลังดำเนินการ</option>
                      <option value="resolved">เสร็จสิ้น</option>
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProblemList;
