import React, { useState, useEffect } from "react";
import api from "../../utils/axios";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

function UnfixableProblems({ isMobile }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedItems, setExpandedItems] = useState([]);

  const fetchUnfixableProblems = async () => {
    try {
      setLoading(true);
      const response = await api.get("/problems/unfixable");
      if (response.data.success) {
        setProblems(response.data.data);
      }
    } catch (err) {
      setError("ไม่สามารถดึงข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnfixableProblems();
  }, []);

  // Toggle expanded item for mobile view
  const toggleExpandItem = (id) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  // Render mobile card view for each problem
  const renderMobileCard = (problem, index) => {
    const isExpanded = expandedItems.includes(problem.id);

    return (
      <div
        key={problem.id}
        className="bg-white rounded-lg shadow-sm p-4 mb-3 border border-gray-100"
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium text-sm">
              {problem.equipment_name || "N/A"}
            </div>
            <div className="text-xs text-gray-500">
              รหัส: {problem.equipment_id || "N/A"}
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
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <div className="text-xs text-gray-500">ห้อง</div>
                <div className="text-sm">{problem.equipment_room || "N/A"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ผู้แจ้ง</div>
                <div className="text-sm">{problem.reporter_name || "N/A"}</div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs text-gray-500">ปัญหา</div>
              <div className="text-sm">{problem.description}</div>
            </div>

            <div className="mb-3">
              <div className="text-xs text-gray-500">เหตุผล</div>
              <div className="text-sm text-red-600">{problem.comment}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">ผู้รับผิดชอบ</div>
              <div className="text-sm">{problem.assigned_to_name || "N/A"}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-t-lg">{error}</div>
      )}

      {/* Mobile View */}
      {isMobile && (
        <div className="p-4">
          {problems.length > 0 ? (
            problems.map((problem, index) => renderMobileCard(problem, index))
          ) : (
            <div className="text-center py-8 bg-white rounded-lg shadow-sm">
              <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                ไม่พบรายการที่ไม่สามารถแก้ไขได้
              </p>
            </div>
          )}
        </div>
      )}

      {/* Desktop View */}
      {!isMobile && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ลำดับ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  รหัสครุภัณฑ์
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  อุปกรณ์
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ห้อง
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ปัญหา
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  เหตุผล
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ผู้แจ้ง
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ผู้รับผิดชอบ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {problems.map((problem, index) => (
                <tr key={problem.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {problem.equipment_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {problem.equipment_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {problem.equipment_room}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {problem.description}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600">
                    {problem.comment}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {problem.reporter_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {problem.assigned_to_name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {problems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              ไม่พบรายการที่ไม่สามารถแก้ไขได้
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UnfixableProblems;
