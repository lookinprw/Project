import React from "react";

export function StatusBadge({ status }) {
  if (!status) return null;

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white border"
      style={{ borderColor: status.color }}
    >
      {/* Colored status dot */}
      <span
        className="w-2 h-2 rounded-full mr-1.5"
        style={{ backgroundColor: status.color }}
      ></span>
      {status.name}
    </span>
  );
}
