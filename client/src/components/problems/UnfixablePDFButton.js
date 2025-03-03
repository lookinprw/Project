import React, { useState } from "react";
import { FileText, Download } from "lucide-react";
import api from "../../utils/axios";

function UnfixablePDFButton({ isMobile }) {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    try {
      setLoading(true);
      const response = await api.get("/problems/unfixable/pdf", {
        responseType: "blob",
      });

      // Create a blob from the PDF Stream
      const file = new Blob([response.data], { type: "application/pdf" });

      // Create a URL for the blob
      const fileURL = URL.createObjectURL(file);

      // Create a temporary link element
      const link = document.createElement("a");
      link.href = fileURL;
      link.setAttribute("download", "unfixable-problems.pdf");
      document.body.appendChild(link);

      // Trigger the download
      link.click();

      // Clean up
      URL.revokeObjectURL(fileURL);
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("เกิดข้อผิดพลาดในการสร้างเอกสาร PDF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={loading}
      className={`inline-flex items-center justify-center ${
        isMobile ? "w-full" : "w-auto"
      } px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm`}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <FileText className="w-4 h-4 mr-2" />
      )}
      {isMobile ? "PDF" : "สร้างรายงาน PDF"}
      <Download className="w-4 h-4 ml-1 sm:ml-2" />
    </button>
  );
}

export default UnfixablePDFButton;
