import React, { useState } from "react";
import { FileDown } from "lucide-react";
import api from "../../utils/axios";
import { AlertCircle } from "lucide-react";

function UnfixablePDFButton() {
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const generatePDF = async () => {
    try {
      setLoading(true);
      const response = await api.get("/problems/unfixable/pdf", {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `รายการครุภัณฑ์ที่ไม่สามารถซ่อมได้_${new Date().toLocaleDateString("th-TH")}.pdf`;
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        window.location.reload();
      }, 100);

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      setShowWarning(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowWarning(true)}
        disabled={loading}
        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
      >
        <FileDown className="w-5 h-5 mr-2" />
        {loading ? "กำลังสร้างไฟล์..." : "พิมพ์รายงาน"}
      </button>

      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  ยืนยันการพิมพ์รายงาน
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  การดาวน์โหลดรายงานนี้จะทำให้รายการที่ไม่สามารถซ่อมได้ทั้งหมดถูกส่งไปที่ศูนย์คอมพิวเตอร์โดยอัตโนมัติ
                  คุณต้องการดำเนินการต่อหรือไม่?
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowWarning(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={generatePDF}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
              >
                ยืนยันการพิมพ์
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UnfixablePDFButton;