// src/components/users/UserList.js
import React, { useState, useEffect } from "react";
import {
  Search as SearchIcon,
  ToggleLeft,
  ToggleRight,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import api from "../../utils/axios";
import Pagination from "../common/Pagination";
import ConfirmationDialog from "../common/ConfirmationDialog";

function UserList({ onStatusChange }) {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useAlert();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Status filter
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "active", "inactive"

  // Confirmation dialogs state
  const [statusConfirm, setStatusConfirm] = useState({
    isOpen: false,
    title: "",
    message: "",
    userId: null,
    username: "",
    newStatus: "",
    isLoading: false,
  });

  const [roleConfirm, setRoleConfirm] = useState({
    isOpen: false,
    title: "",
    message: "",
    userId: null,
    username: "",
    newRole: "",
    newRoleText: "",
    isLoading: false,
  });

  // Updated role options with your desired order
  const ROLE_OPTIONS = {
    reporter: "ผู้แจ้งปัญหา",
    equipment_assistant: "ผู้ช่วยดูแลครุภัณฑ์",
    equipment_manager: "ผู้จัดการครุภัณฑ์",
    admin: "ผู้ดูแลระบบ",
  };

  // Role priority for sorting (lower number = higher in list)
  const ROLE_PRIORITY = {
    reporter: 1,
    equipment_assistant: 2,
    equipment_manager: 3,
    admin: 4,
  };

  // User status options
  const STATUS_OPTIONS = {
    active: "กำลังใช้งาน",
    inactive: "ยุติการใช้งาน",
  };

  // Handle search input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter users based on search query and status
  useEffect(() => {
    let filtered = users.filter((user) => {
      // First apply the search filter
      const matchesSearch = !debouncedSearch
        ? true
        : (user.username || "")
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          (user.firstname || "")
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          (user.lastname || "")
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          (user.branch || "")
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase()) ||
          (getRoleText(user.role) || "")
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase());

      // Then apply the status filter
      const matchesStatus =
        statusFilter === "all" ? true : user.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Calculate pages after filtering
    setFilteredUsers(filtered);
    setTotalPages(Math.ceil(filtered.length / pageSize));
  }, [debouncedSearch, statusFilter, users, pageSize]);

  const getAvailableRoles = (currentUserRole) => {
    if (currentUserRole === "admin") {
      return ROLE_OPTIONS;
    } else if (currentUserRole === "equipment_manager") {
      return {
        reporter: ROLE_OPTIONS.reporter,
        equipment_assistant: ROLE_OPTIONS.equipment_assistant,
      };
    }
    return {};
  };

  const canModifyRole = (targetUser) => {
    if (currentUser.role === "admin") return true;
    if (currentUser.role === "equipment_manager") {
      return !["admin", "equipment_manager"].includes(targetUser.role);
    }
    return false;
  };

  const canChangeStatus = (targetUser) => {
    if (targetUser.username === currentUser.username) return false;
    if (targetUser.role === "admin" && currentUser.role !== "admin")
      return false;
    if (currentUser.role === "admin") return true;
    if (currentUser.role === "equipment_manager") {
      return !["admin", "equipment_manager"].includes(targetUser.role);
    }
    return false;
  };

  const getRoleText = (role) => ROLE_OPTIONS[role] || role;

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-700";
      case "equipment_manager":
        return "bg-blue-100 text-blue-700";
      case "equipment_assistant":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusBadgeColor = (status) => {
    if (status === "inactive") {
      return "bg-gray-700 text-white";
    }
    return "bg-green-100 text-green-800";
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const printUserStatuses = (users) => {
    console.log("--- User Statuses ---");
    users.forEach((user) => {
      console.log(
        `${user.username}: ${user.status} (typeof: ${typeof user.status})`
      );
    });
    console.log("--------------------");
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Add a timestamp parameter to prevent caching
      const timestamp = new Date().getTime();
      const response = await api.get(`/users?_t=${timestamp}`);

      if (response.data.success) {
        console.log("Raw API response:", response.data.data);

        // Process users to ensure status is normalized
        const processedUsers = response.data.data.map((user) => {
          // Log each user's status for debugging
          console.log(`User ${user.username} has status: ${user.status}`);

          return {
            ...user,

            status: user.status === "inactive" ? "inactive" : "active",
          };
        });

        const sortedUsers = [...processedUsers].sort((a, b) => {
          return (ROLE_PRIORITY[a.role] || 99) - (ROLE_PRIORITY[b.role] || 99);
        });

        setUsers(sortedUsers);
        setFilteredUsers(sortedUsers);
        setTotalPages(Math.ceil(sortedUsers.length / pageSize));
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      showError("ไม่สามารถดึงข้อมูลผู้ใช้งานได้");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChangeClick = (userId, username, newRole) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser || !canModifyRole(targetUser) || updating) return;

    if (newRole === "equipment_manager" && currentUser.role !== "admin") {
      showError(
        "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถกำหนดสิทธิ์ผู้จัดการครุภัณฑ์ได้"
      );
      return;
    }

    setRoleConfirm({
      isOpen: true,
      title: "ยืนยันการเปลี่ยนสิทธิ์การใช้งาน",
      message: `คุณต้องการเปลี่ยนสิทธิ์การใช้งานของ "${username}" เป็น "${getRoleText(
        newRole
      )}" ใช่หรือไม่?`,
      userId,
      username,
      newRole,
      newRoleText: getRoleText(newRole),
      isLoading: false,
    });
  };

  const handleConfirmRoleChange = async () => {
    setRoleConfirm((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await api.patch(`/users/${roleConfirm.userId}/role`, {
        role: roleConfirm.newRole,
      });

      if (response.data.success) {
        await fetchUsers(); // Fetch fresh data after role change
        showSuccess(
          `เปลี่ยนสิทธิ์ผู้ใช้เป็น ${roleConfirm.newRoleText} สำเร็จ`
        );
      }
    } catch (err) {
      console.error("Error updating role:", err);
      showError(
        err.response?.data?.message || "ไม่สามารถอัพเดทสิทธิ์การใช้งาน"
      );
    } finally {
      setRoleConfirm((prev) => ({ ...prev, isOpen: false, isLoading: false }));
    }
  };

  const handleStatusChangeClick = (userId, username, currentStatus) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser || !canChangeStatus(targetUser) || updating) {
      showError("ไม่สามารถเปลี่ยนสถานะผู้ใช้นี้ได้");
      return;
    }

    const newStatus = currentStatus === "active" ? "inactive" : "active";

    setStatusConfirm({
      isOpen: true,
      title: "ยืนยันการเปลี่ยนสถานะผู้ใช้",
      message: `คุณต้องการเปลี่ยนสถานะของ "${username}" เป็น "${STATUS_OPTIONS[newStatus]}" ใช่หรือไม่?`,
      userId,
      username,
      newStatus,
      isLoading: false,
    });
  };

  const handleConfirmStatusChange = async () => {
    setStatusConfirm((prev) => ({ ...prev, isLoading: true }));

    try {
      console.log(
        "Sending status change request for user ID:",
        statusConfirm.userId
      );
      console.log("New status:", statusConfirm.newStatus);

      const response = await api.patch(
        `/users/${statusConfirm.userId}/status`,
        {
          status: statusConfirm.newStatus,
        }
      );

      console.log("Status change response:", response.data);

      if (response.data.success) {
        // Update the user in the local state instead of reloading
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === statusConfirm.userId
              ? { ...user, status: statusConfirm.newStatus }
              : user
          )
        );

        // Also update filtered users to ensure immediate UI update
        setFilteredUsers((prevFiltered) =>
          prevFiltered.map((user) =>
            user.id === statusConfirm.userId
              ? { ...user, status: statusConfirm.newStatus }
              : user
          )
        );

        showSuccess(
          `เปลี่ยนสถานะผู้ใช้เป็น ${
            STATUS_OPTIONS[statusConfirm.newStatus]
          } สำเร็จ`
        );
      } else {
        throw new Error(response.data.message || "Unknown error");
      }
    } catch (err) {
      console.error("Complete error object:", err);
      showError(
        err.response?.data?.message || "ไม่สามารถเปลี่ยนสถานะผู้ใช้งาน"
      );
    } finally {
      setStatusConfirm((prev) => ({
        ...prev,
        isOpen: false,
        isLoading: false,
      }));
    }
  };
  // Get paginated data
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading && users.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        <p className="mt-2 text-gray-600">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
          {/* Search input */}
          <div className="md:max-w-md w-full">
            <label
              htmlFor="search"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              ค้นหาผู้ใช้งาน
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
                placeholder="ค้นหาด้วยรหัสผู้ใช้, ชื่อ, นามสกุล, สาขา..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white 
                          placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">สถานะ:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 text-sm rounded-full ${
                  statusFilter === "all"
                    ? "bg-indigo-100 text-indigo-800 font-medium"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1 text-sm rounded-full ${
                  statusFilter === "active"
                    ? "bg-green-100 text-green-800 font-medium"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                กำลังใช้งาน
              </button>
              <button
                onClick={() => setStatusFilter("inactive")}
                className={`px-3 py-1 text-sm rounded-full ${
                  statusFilter === "inactive"
                    ? "bg-gray-700 text-white font-medium"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                ยุติการใช้งาน
              </button>
            </div>
          </div>
        </div>

        {/* Add refresh button and results count */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">
            พบ {filteredUsers.length} รายการ{" "}
            {debouncedSearch && `จากการค้นหา "${debouncedSearch}"`}
            {statusFilter !== "all" &&
              ` สถานะ: ${STATUS_OPTIONS[statusFilter]}`}
          </p>

          <button
            onClick={fetchUsers}
            className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 12a9 9 0 0 0 15 6.7L21 16"></path>
              <path d="M21 22v-6h-6"></path>
            </svg>
            รีเฟรช
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ชื่อผู้ใช้
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ชื่อ-นามสกุล
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  หลักสูตร
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สิทธิ์การใช้งาน
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
              {paginatedUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50 ${
                    user.status === "inactive" ? "bg-gray-50" : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center">
                      {user.status === "inactive" ? (
                        <AlertTriangle className="h-4 w-4 text-gray-400 mr-2" />
                      ) : user.role === "admin" ? (
                        <Shield className="h-4 w-4 text-red-500 mr-2" />
                      ) : null}
                      <span
                        className={
                          user.status === "inactive" ? "text-gray-500" : ""
                        }
                      >
                        {user.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={
                        user.status === "inactive" ? "text-gray-500" : ""
                      }
                    >
                      {user.firstname} {user.lastname}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={
                        user.status === "inactive" ? "text-gray-500" : ""
                      }
                    >
                      {user.branch}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChangeClick(
                          user.id,
                          user.username,
                          e.target.value
                        )
                      }
                      disabled={
                        !canModifyRole(user) ||
                        updating === user.id ||
                        user.status === "inactive"
                      }
                      className={`block w-40 py-1 px-2 border rounded-md text-sm font-medium
                        ${getRoleBadgeColor(
                          user.role
                        )} border-0 focus:ring-2 focus:ring-indigo-500
                        ${user.status === "inactive" ? "opacity-60" : ""}`}
                    >
                      <option value={user.role}>
                        {ROLE_OPTIONS[user.role]}
                      </option>
                      {canModifyRole(user) &&
                        user.status === "active" &&
                        Object.entries(getAvailableRoles(currentUser.role))
                          .filter(([key]) => key !== user.role)
                          .map(([key, value]) => (
                            <option key={key} value={key}>
                              {value}
                            </option>
                          ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                        ${getStatusBadgeColor(user.status)}`}
                    >
                      {user.status === "inactive"
                        ? "ยุติการใช้งาน"
                        : "กำลังใช้งาน"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() =>
                        handleStatusChangeClick(
                          user.id,
                          user.username,
                          user.status
                        )
                      }
                      disabled={!canChangeStatus(user)}
                      className={`text-gray-600 hover:text-gray-900 
                        disabled:opacity-50 disabled:cursor-not-allowed 
                        transition-colors`}
                      title={
                        !canChangeStatus(user)
                          ? "ไม่สามารถเปลี่ยนสถานะผู้ใช้นี้ได้"
                          : user.status === "inactive"
                          ? "เปิดใช้งานบัญชีนี้"
                          : "ยุติการใช้งานบัญชีนี้"
                      }
                    >
                      {user.status === "inactive" ? (
                        <ToggleLeft size={24} className="text-gray-400" />
                      ) : (
                        <ToggleRight size={24} className="text-green-500" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchQuery || statusFilter !== "all"
                  ? "ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข"
                  : "ไม่พบข้อมูลผู้ใช้งาน"}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          className="mt-6"
        />
      </div>

      {/* Status Change Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={statusConfirm.isOpen}
        onClose={() => setStatusConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmStatusChange}
        title={statusConfirm.title}
        message={statusConfirm.message}
        isLoading={statusConfirm.isLoading}
        confirmText="ยืนยัน"
        cancelText="ยกเลิก"
        confirmButtonClass={
          statusConfirm.newStatus === "active"
            ? "bg-green-600 hover:bg-green-700"
            : "bg-gray-600 hover:bg-gray-700"
        }
      />

      {/* Role Change Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={roleConfirm.isOpen}
        onClose={() => setRoleConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmRoleChange}
        title={roleConfirm.title}
        message={roleConfirm.message}
        isLoading={roleConfirm.isLoading}
        confirmText="เปลี่ยน"
        cancelText="ยกเลิก"
        confirmButtonClass="bg-indigo-600 hover:bg-indigo-700"
      />
    </div>
  );
}

export default UserList;
