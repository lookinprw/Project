import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}) => {
  // Don't render pagination if there's only one page
  if (totalPages <= 1) return null;

  // Generate page numbers array for display
  const getPageNumbers = () => {
    const maxPageButtons = 5; // Max number of page buttons to show
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = startPage + maxPageButtons - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 border-t border-gray-200 sm:px-6 ${className}`}
    >
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            หน้า <span className="font-medium">{currentPage}</span> จากทั้งหมด{" "}
            <span className="font-medium">{totalPages}</span> หน้า
          </p>
        </div>

        <div>
          <nav
            className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
            aria-label="Pagination"
          >
            {/* Previous Page Button */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                currentPage === 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <span className="sr-only">หน้าก่อนหน้า</span>
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Page Numbers */}
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  currentPage === pageNumber
                    ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                    : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {pageNumber}
              </button>
            ))}

            {/* Next Page Button */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                currentPage === totalPages
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <span className="sr-only">หน้าถัดไป</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </div>

      {/* Mobile Pagination */}
      <div className="flex items-center justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
            currentPage === 1
              ? "text-gray-300 bg-gray-100 cursor-not-allowed"
              : "text-gray-700 bg-white hover:bg-gray-50"
          }`}
        >
          หน้าก่อนหน้า
        </button>
        <p className="text-sm text-gray-700">
          หน้า <span className="font-medium">{currentPage}</span> จาก{" "}
          <span className="font-medium">{totalPages}</span>
        </p>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
            currentPage === totalPages
              ? "text-gray-300 bg-gray-100 cursor-not-allowed"
              : "text-gray-700 bg-white hover:bg-gray-50"
          }`}
        >
          หน้าถัดไป
        </button>
      </div>
    </div>
  );
};

export default Pagination;
