// components/layout/Sidebar.js
import React from "react";
import {
  MessageCircle,
  Wrench,
  Settings,
  Monitor,
  AlertCircle,
  Users,
  LogOut,
  User,
  ChevronRight,
  Menu,
  BarChart2,
  Clock,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ isOpen, toggleSidebar, user, isMobile }) => {
  const { logout } = useAuth();
  const location = useLocation();

  const role = user?.role;
  const isAdmin = role === "admin";
  const isEquipManager = role === "equipment_manager";
  const isEquipAssistant = role === "equipment_assistant";

  const isActivePath = (path) => location.pathname === path;

  const getRoleText = (role) => {
    const roleLabels = {
      admin: "ผู้ดูแลระบบ",
      reporter: "ผู้แจ้งปัญหา",
      equipment_manager: "ผู้จัดการครุภัณฑ์",
      equipment_assistant: "ผู้ช่วยดูแลครุภัณฑ์",
    };
    return roleLabels[role] || role;
  };

  const menuItems = [
    // Admin only sees Users Management
    {
      path: "/users",
      icon: <Users size={isMobile ? 18 : 20} />,
      text: "จัดการผู้ใช้",
      shortText: "จัดการผู้ใช้",
      show: isAdmin,
    },

    // Equipment Manager Menu Items
    {
      path: "/dashboard",
      icon: <MessageCircle size={isMobile ? 18 : 20} />,
      text: "แจ้งปัญหา",
      shortText: "แจ้งปัญหา",
      show: !isAdmin,
    },

    {
      path: "/equipment",
      icon: <Wrench size={isMobile ? 18 : 20} />,
      text: "จัดการครุภัณฑ์",
      shortText: "ครุภัณฑ์",
      show: isEquipManager,
    },

    {
      path: "/status",
      icon: <Settings size={isMobile ? 18 : 20} />,
      text: "จัดการสถานะ",
      shortText: "สถานะ",
      show: isEquipManager,
    },

    {
      path: "/unfixable",
      icon: <AlertCircle size={isMobile ? 18 : 20} />,
      text: "รายงานที่ไม่สามารถแก้ไขได้",
      shortText: "ไม่สามารถแก้ไข",
      show: isEquipManager,
    },

    {
      path: "/computer-center",
      icon: <Monitor size={isMobile ? 18 : 20} />,
      text: "รายการส่งซ่อมศูนย์คอมพิวเตอร์",
      shortText: "ส่งซ่อมศูนย์ฯ",
      show: isEquipManager,
    },

    {
      path: "/problem-analytics",
      icon: <BarChart2 size={isMobile ? 18 : 20} />,
      text: "รายงานการวิเคราะห์ปัญหา",
      shortText: "วิเคราะห์",
      show: isEquipManager,
    },

    // Assignment History for Equipment Assistants
    {
      path: "/assignment-history",
      icon: <Clock size={isMobile ? 18 : 20} />,
      text: "ประวัติการซ่อมบำรุง",
      shortText: "ประวัติซ่อม",
      show: isEquipAssistant,
    },
  ];

  // Determine sidebar position and width based on device and state
  const sidebarClasses = isMobile
    ? `fixed left-0 top-0 bottom-0 bg-gradient-to-b from-indigo-600 to-indigo-800 text-white z-50 
       transition-transform duration-300 shadow-xl
       ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}`
    : `fixed left-0 top-0 bottom-0 bg-gradient-to-b from-indigo-600 to-indigo-800 text-white z-50 
       transition-all duration-300 shadow-xl
       ${isOpen ? "w-64" : "w-20"}`;

  return (
    <aside className={sidebarClasses}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-indigo-500/30">
        <div className={`${isOpen ? "block" : "hidden"} truncate`}>
          <h2 className="font-bold text-xl">IT - PRSA</h2>
        </div>
        <button
          onClick={toggleSidebar}
          className={`p-2 hover:bg-indigo-700 rounded-lg transition-colors duration-200 ${
            isOpen ? "" : "mx-auto"
          }`}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Menu Items */}
      <div className="flex flex-col h-[calc(100%-4rem)]">
        <div className="flex-grow overflow-y-auto">
          <nav className="p-3">
            {menuItems.map(
              (item, index) =>
                item.show && (
                  <Link
                    key={index}
                    to={item.path}
                    className={`flex items-center px-4 py-3 mb-2 rounded-lg transition-all duration-200
                      ${
                        isActivePath(item.path)
                          ? "bg-indigo-700 shadow-lg"
                          : "hover:bg-indigo-700/50"
                      } group relative`}
                  >
                    <span className="flex items-center">
                      {item.icon}
                      {isOpen && (
                        <span className="ml-3 font-medium">
                          {isMobile ? item.shortText : item.text}
                        </span>
                      )}
                    </span>
                    {!isOpen && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-indigo-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs whitespace-nowrap z-10">
                        {item.text}
                      </div>
                    )}
                  </Link>
                )
            )}
          </nav>
        </div>

        {/* Profile Section */}
        {isOpen && user && (
          <div className="flex-shrink-0 border-t border-indigo-500/20">
            <Link to="/profile" className="block px-4 py-2 group">
              <div className="rounded-lg p-3 hover:bg-indigo-700/70 transition-all duration-200">
                <div className="flex items-center space-x-2">
                  <div className="bg-indigo-600 p-2 rounded-full">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.firstname} {user.lastname}
                    </p>
                    <p className="text-xs text-indigo-200 truncate">
                      {getRoleText(user.role)}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-indigo-300 group-hover:translate-x-1 transition-transform duration-200"
                  />
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Logout Button */}
        <div
          className={`flex-shrink-0 ${
            isOpen ? "border-t border-indigo-500/20" : ""
          } p-4`}
        >
          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-2.5 rounded-lg hover:bg-red-500/20 text-red-100 transition-colors duration-200 hover:shadow-lg group relative"
          >
            <LogOut size={20} />
            {isOpen && <span className="ml-3 font-medium">ออกจากระบบ</span>}
            {!isOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-red-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs whitespace-nowrap">
                ออกจากระบบ
              </div>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
