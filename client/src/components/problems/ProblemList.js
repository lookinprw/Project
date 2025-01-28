import React, { useState, useEffect } from "react";
import { Trash2, Search as SearchIcon } from "lucide-react";
import api from "../../utils/axios";

function ProblemList() {
  const [problems, setProblems] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/problems"), api.get("/status")]).then(
      ([problemsRes, statusesRes]) => {
        setProblems(problemsRes.data.data);
        setStatuses(statusesRes.data.data);
        setLoading(false);
      }
    );
  }, []);

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
      const response = await api.get("/problems");
      setProblems(response.data.data);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th>อุปกรณ์</th>
              <th>รหัสครุภัณฑ์</th>
              <th>ห้อง</th>
              <th>ปัญหา</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((problem) => {
              const status = getStatusDetails(problem.status_id);
              return (
                <tr key={problem.id}>
                  <td>{problem.equipment_name}</td>
                  <td>{problem.equipment_id}</td>
                  <td>{problem.room}</td>
                  <td>{problem.description}</td>
                  <td>
                    <select
                      value={problem.status_id}
                      onChange={(e) =>
                        handleStatusChange(problem.id, e.target.value)
                      }
                      style={{ backgroundColor: status.color }}
                      className="rounded px-2 py-1 text-white"
                    >
                      {statuses.map((status) => (
                        <option
                          key={status.id}
                          value={status.id}
                          style={{ backgroundColor: status.color }}
                        >
                          {status.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      {/* Add edit/delete buttons if needed */}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProblemList;
