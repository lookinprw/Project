// src/utils/constants.js

// Role Management
export const ROLES = {
  ADMIN: "admin",
  STUDENT: "student",
  EQUIPMENT_MANAGER: "equipment_manager",
  EQUIPMENT_ASSISTANT: "equipment_assistant",
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "ผู้ดูแลระบบ",
  [ROLES.STUDENT]: "นักศึกษา",
  [ROLES.EQUIPMENT_MANAGER]: "ผู้จัดการครุภัณฑ์",
  [ROLES.EQUIPMENT_ASSISTANT]: "ผู้ช่วยดูแลครุภัณฑ์",
};

// Problem Status Management
export const PROBLEM_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  CANNOT_FIX: "cannot_fix",
};

export const STATUS_LABELS = {
  [PROBLEM_STATUS.PENDING]: "รอดำเนินการ",
  [PROBLEM_STATUS.IN_PROGRESS]: "กำลังดำเนินการ",
  [PROBLEM_STATUS.RESOLVED]: "เสร็จสิ้น",
  [PROBLEM_STATUS.CANNOT_FIX]: "ไม่สามารถแก้ไขได้",
};

// Equipment Status Management
export const EQUIPMENT_STATUS = {
  ACTIVE: "active",
  MAINTENANCE: "maintenance",
  INACTIVE: "inactive",
};

export const EQUIPMENT_STATUS_LABELS = {
  [EQUIPMENT_STATUS.ACTIVE]: "พร้อมใช้งาน",
  [EQUIPMENT_STATUS.MAINTENANCE]: "อยู่ระหว่างซ่อมบำรุง",
  [EQUIPMENT_STATUS.INACTIVE]: "ไม่พร้อมใช้งาน",
};

// Role-based Permission Management
export const PERMISSIONS = {
  CAN_MANAGE_USERS: [ROLES.ADMIN],
  CAN_MANAGE_EQUIPMENT: [ROLES.ADMIN, ROLES.EQUIPMENT_MANAGER],
  CAN_HANDLE_PROBLEMS: [
    ROLES.ADMIN,
    ROLES.EQUIPMENT_MANAGER,
    ROLES.EQUIPMENT_ASSISTANT,
  ],
  CAN_VIEW_ALL_PROBLEMS: [
    ROLES.ADMIN,
    ROLES.EQUIPMENT_MANAGER,
    ROLES.EQUIPMENT_ASSISTANT,
  ],
  CAN_REASSIGN_PROBLEMS: [ROLES.ADMIN, ROLES.EQUIPMENT_MANAGER],
  CAN_MARK_CANNOT_FIX: [ROLES.ADMIN, ROLES.EQUIPMENT_MANAGER],
};

// Permission Check Functions
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  return PERMISSIONS[permission]?.includes(userRole) || false;
};

// Status Flow Management
export const getNextAvailableStatuses = (currentStatus, userRole) => {
  // Student can only view status
  if (userRole === ROLES.STUDENT) return [];

  switch (currentStatus) {
    case PROBLEM_STATUS.PENDING:
      return hasPermission(userRole, "CAN_HANDLE_PROBLEMS")
        ? [PROBLEM_STATUS.IN_PROGRESS]
        : [];

    case PROBLEM_STATUS.IN_PROGRESS:
      if (userRole === ROLES.EQUIPMENT_ASSISTANT) {
        return [PROBLEM_STATUS.RESOLVED];
      }
      return [PROBLEM_STATUS.RESOLVED, PROBLEM_STATUS.CANNOT_FIX];

    case PROBLEM_STATUS.RESOLVED:
      // Only managers and admin can reopen resolved issues
      if (hasPermission(userRole, "CAN_REASSIGN_PROBLEMS")) {
        return [PROBLEM_STATUS.IN_PROGRESS];
      }
      return [];

    case PROBLEM_STATUS.CANNOT_FIX:
      // Only admin can change from cannot_fix status
      return userRole === ROLES.ADMIN ? [PROBLEM_STATUS.IN_PROGRESS] : [];

    default:
      return [];
  }
};

// Style Management
export const getRoleBadgeStyle = (role) => {
  switch (role) {
    case ROLES.ADMIN:
      return "bg-red-100 text-red-800";
    case ROLES.EQUIPMENT_MANAGER:
      return "bg-purple-100 text-purple-800";
    case ROLES.EQUIPMENT_ASSISTANT:
      return "bg-green-100 text-green-800";
    case ROLES.STUDENT:
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getStatusBadgeStyle = (status) => {
  switch (status) {
    case PROBLEM_STATUS.PENDING:
      return "bg-yellow-100 text-yellow-800";
    case PROBLEM_STATUS.IN_PROGRESS:
      return "bg-blue-100 text-blue-800";
    case PROBLEM_STATUS.RESOLVED:
      return "bg-green-100 text-green-800";
    case PROBLEM_STATUS.CANNOT_FIX:
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getEquipmentStatusBadgeStyle = (status) => {
  switch (status) {
    case EQUIPMENT_STATUS.ACTIVE:
      return "bg-green-100 text-green-800";
    case EQUIPMENT_STATUS.MAINTENANCE:
      return "bg-yellow-100 text-yellow-800";
    case EQUIPMENT_STATUS.INACTIVE:
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Role Validation
export const validateRoleTransition = (
  currentRole,
  newRole,
  actingUserRole
) => {
  // Only admin can change roles
  if (actingUserRole !== ROLES.ADMIN) {
    return {
      valid: false,
      message: "ไม่มีสิทธิ์ในการเปลี่ยนแปลงสิทธิ์",
    };
  }

  // Cannot change own role
  if (currentRole === actingUserRole) {
    return {
      valid: false,
      message: "ไม่สามารถเปลี่ยนแปลงสิทธิ์ของตัวเองได้",
    };
  }

  // Validate that new role is valid
  if (!Object.values(ROLES).includes(newRole)) {
    return {
      valid: false,
      message: "สิทธิ์ที่ระบุไม่ถูกต้อง",
    };
  }

  return { valid: true };
};

// Status Validation
export const validateStatusTransition = (
  currentStatus,
  newStatus,
  userRole
) => {
  const allowedStatuses = getNextAvailableStatuses(currentStatus, userRole);

  if (!allowedStatuses.includes(newStatus)) {
    return {
      valid: false,
      message: "ไม่สามารถเปลี่ยนสถานะนี้ได้",
    };
  }

  // Additional validation for cannot_fix status
  if (
    newStatus === PROBLEM_STATUS.CANNOT_FIX &&
    !hasPermission(userRole, "CAN_MARK_CANNOT_FIX")
  ) {
    return {
      valid: false,
      message: "ไม่มีสิทธิ์ในการกำหนดสถานะไม่สามารถแก้ไขได้",
    };
  }

  return { valid: true };
};
