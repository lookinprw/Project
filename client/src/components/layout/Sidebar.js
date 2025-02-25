import React from "react";
import { MessageCircle, Wrench, Settings, Monitor, AlertCircle, Users, LogOut, User, ChevronRight, Menu, BarChart2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";


const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const role = user?.role;
  const isAdmin = role === "admin";
  const isEquipManager = role === "equipment_manager";

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
      icon: <Users size={20} />,
      text: "จัดการผู้ใช้",
      show: isAdmin
    },
    
    // Equipment Manager Menu Items
    {
      path: "/dashboard",
      icon: <MessageCircle size={20} />,
      text: "แจ้งปัญหา",
      show: !isAdmin
    },
  
    {
      path: "/equipment",
      icon: <Wrench size={20} />,
      text: "จัดการครุภัณฑ์",
      show: isEquipManager
    },
  
    {
      path: "/status",
      icon: <Settings size={20} />,
      text: "จัดการสถานะ",
      show: isEquipManager
    },
  
    {
      path: "/computer-center",
      icon: <Monitor size={20} />,
      text: "รายการส่งซ่อมศูนย์คอมพิวเตอร์",
      show: isEquipManager
    },
  
    {
      path: "/problem-analytics",
      icon: <BarChart2 size={20} />,
      text: "รายงานการวิเคราะห์ปัญหา",
      show: isEquipManager
    },
  
    {
      path: "/unfixable",
      icon: <AlertCircle size={20} />,
      text: "รายงานที่ไม่สามารถแก้ไขได้",
      show: isEquipManager
    }
  ];

  return (
    <div
      className={`fixed left-0 top-0 bottom-0 flex flex-col
   ${isOpen ? "w-64" : "w-20"} 
   bg-gradient-to-b from-indigo-600 to-indigo-800 text-white transition-all duration-300 ease-in-out
   shadow-xl z-50`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-indigo-500/30">
        <div className={`${isOpen ? "block" : "hidden"}`}>
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

      <nav className="px-3 py-4">
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
                }
                group relative overflow-hidden`}
              >
                <span className="relative z-10 flex items-center">
                  {item.icon}
                  {isOpen && (
                    <span className="ml-3 font-medium tracking-wide">
                      {item.text}
                    </span>
                  )}
                </span>
                {isActivePath(item.path) && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/50 to-indigo-800/50" />
                )}
                {!isOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-indigo-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs whitespace-nowrap">
                    {item.text}
                  </div>
                )}
              </Link>
            )
        )}
      </nav>

      {isOpen && user && (
        <Link
          to="/profile"
          className="absolute bottom-20 left-0 right-0 px-4 group"
        >
          <div
            className="bg-indigo-700/50 backdrop-blur-sm rounded-lg p-4 border border-indigo-500/30
                        hover:bg-indigo-700/70 transition-all duration-200"
          >
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-600 p-2 rounded-full">
                <User size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {user.firstname} {user.lastname}
                </p>
                <p className="text-xs text-indigo-200">
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
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <button
          onClick={logout}
          className="w-full flex items-center px-4 py-3 rounded-lg hover:bg-red-500/20 text-red-100 transition-colors duration-200
                   hover:shadow-lg group relative"
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
  );
};

export default Sidebar;
