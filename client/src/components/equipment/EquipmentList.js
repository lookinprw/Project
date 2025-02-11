import React, { useState, useEffect } from "react";
import { Edit, Trash2, Search as SearchIcon } from "lucide-react";
import api from "../../utils/axios";

function EquipmentList({ onEdit }) {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEquipment, setFilteredEquipment] = useState([]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await api.get("/equipment");
      if (response.data.success) {
        setEquipment(response.data.data);
        setFilteredEquipment(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
      setError("ไม่สามารถดึงข้อมูลครุภัณฑ์ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    const filtered = equipment.filter((item) => {

      const searchLower = searchQuery.toLowerCase();
      const equipmentId = item.equipment_id?.toLowerCase() || "";
      const name = item.name?.toLowerCase() || ""; // Note: changed from item.name to item.equipment_name
      const type = item.type?.toLowerCase() || "";
      const room = item.room?.toLowerCase() || "";
      const status = getStatusText(item.status)?.toLowerCase() || "";

      return (
        equipmentId.includes(searchLower) ||
        name.includes(searchLower) ||
        type.includes(searchLower) ||
        room.includes(searchLower) ||
        status.includes(searchLower)
      );
    });
    setFilteredEquipment(filtered);
  }, [searchQuery, equipment]);

  const handleDelete = async (id) => {
    if (window.confirm("คุณต้องการลบครุภัณฑ์นี้ใช่หรือไม่?")) {
      try {
        const response = await api.delete(`/equipment/${id}`);
        if (response.data.success) {
          fetchEquipment(); // Refresh the list
        }
      } catch (error) {
        console.error("Error deleting equipment:", error);
        setError(error.response?.data?.message || "ไม่สามารถลบครุภัณฑ์ได้");
      }
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "maintenance":
        return "bg-yellow-100 text-yellow-700";
      case "inactive":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "ใช้งานได้";
      case "maintenance":
        return "ซ่อมบำรุง";
      case "inactive":
        return "ไม่พร้อมใช้งาน";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        {/* Search Section */}
        <div className="mb-6">
          <div className="max-w-md">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              ค้นหาครุภัณฑ์
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาด้วยรหัส, ชื่อ, ประเภท, ห้อง หรือสถานะ..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white 
                          placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              พบ {filteredEquipment.length} รายการ{" "}
              {searchQuery && `จากการค้นหา "${searchQuery}"`}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  รหัสครุภัณฑ์
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ชื่อ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ประเภท
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ห้อง
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEquipment.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.equipment_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.room}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 text-sm font-medium rounded-md ${getStatusBadgeColor(
                        item.status
                      )}`}
                    >
                      {getStatusText(item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                    <button
                      onClick={() => onEdit(item)}
                      className="text-indigo-600 hover:text-indigo-900 transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEquipment.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchQuery
                  ? "ไม่พบรายการที่ตรงกับการค้นหา"
                  : "ไม่พบรายการครุภัณฑ์"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EquipmentList;
