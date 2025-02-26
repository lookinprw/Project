// components/equipment/CsvImporter.js
import React, { useState, useRef } from "react";
import { Upload, X, AlertCircle, CheckCircle } from "lucide-react";
import api from "../../utils/axios";
import Alert from "../common/Alert";

// Helper function to parse CSV data
const parseCsv = (csvText) => {
  // Split by lines and filter out empty lines
  const lines = csvText.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  // Get headers from first line
  const headers = lines[0].split(",").map((header) => header.trim());

  // Map remaining lines to objects
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const item = {};

    headers.forEach((header, index) => {
      item[header] = values[index] || "";
    });

    return item;
  });
};

// Component for CSV importing
function CsvImporter({ onComplete }) {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const expectedColumns = ["equipment_id", "name", "type", "room", "status"];

  const processFile = (selectedFile) => {
    setError("");
    setSuccess("");
    setValidationErrors([]);
    setCsvData([]);
    setPreviewData([]);

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.type !== "text/csv" &&
      !selectedFile.name.endsWith(".csv")
    ) {
      setError("กรุณาอัพโหลดไฟล์ CSV เท่านั้น");
      return;
    }

    setFile(selectedFile);

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsedData = parseCsv(text);

        // Validate parsed data
        if (parsedData.length === 0) {
          setError("ไม่พบข้อมูลในไฟล์ CSV");
          return;
        }

        // Check if required columns exist
        const firstRow = parsedData[0];
        const missingColumns = expectedColumns.filter(
          (col) => !(col in firstRow)
        );

        if (missingColumns.length > 0) {
          setError(
            `ไฟล์ CSV ไม่มีคอลัมน์ที่จำเป็น: ${missingColumns.join(", ")}`
          );
          return;
        }
        // Validate each row
        const errors = [];
        parsedData.forEach((row, index) => {
          // Validate equipment_id
          if (!row.equipment_id || row.equipment_id.includes(" ")) {
            errors.push({
              row: index + 1,
              message: `รหัสครุภัณฑ์ไม่ถูกต้องหรือมีช่องว่าง: ${
                row.equipment_id || "ไม่ระบุ"
              }`,
            });
          }

          // Validate name
          if (!row.name || row.name.trim() === "") {
            errors.push({
              row: index + 1,
              message: `ชื่อไม่ถูกต้อง: ${row.name || "ไม่ระบุ"}`,
            });
          }

          // Validate type
          if (!["Computer", "Other"].includes(row.type)) {
            errors.push({
              row: index + 1,
              message: `ประเภทไม่ถูกต้อง (ต้องเป็น Computer หรือ Other): ${
                row.type || "ไม่ระบุ"
              }`,
            });
          }

          // Validate room
          if (!["BI Studio", "Co-Working"].includes(row.room)) {
            errors.push({
              row: index + 1,
              message: `ห้องไม่ถูกต้อง (ต้องเป็น BI Studio หรือ Co-Working): ${
                row.room || "ไม่ระบุ"
              }`,
            });
          }

          // Validate status
          if (!["active", "maintenance", "inactive"].includes(row.status)) {
            errors.push({
              row: index + 1,
              message: `สถานะไม่ถูกต้อง (ต้องเป็น active, maintenance หรือ inactive): ${
                row.status || "ไม่ระบุ"
              }`,
            });
          }
        });

        setValidationErrors(errors);
        setCsvData(parsedData);
        setPreviewData(parsedData.slice(0, 5)); // Preview only first 5 rows
      } catch (err) {
        console.error("Error parsing CSV:", err);
        setError("ไม่สามารถอ่านไฟล์ CSV ได้");
      }
    };

    reader.readAsText(selectedFile);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const dt = e.dataTransfer;
    const files = dt.files;

    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      setError("กรุณาแก้ไขข้อผิดพลาดก่อนนำเข้าข้อมูล");
      return;
    }

    if (csvData.length === 0) {
      setError("ไม่มีข้อมูลที่จะนำเข้า");
      return;
    }

    setIsProcessing(true);
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Import data in batches to avoid overwhelming the server
      const batchSize = 20;
      const totalItems = csvData.length;
      let successCount = 0;
      let failedItems = [];

      for (let i = 0; i < csvData.length; i += batchSize) {
        const batch = csvData.slice(i, i + batchSize);

        // Send batch to the server
        const response = await api.post("/equipment/bulk-import", {
          items: batch,
        });

        if (response.data.success) {
          successCount += response.data.successCount;

          // Add any failed items to our list
          if (response.data.failedItems) {
            failedItems = [...failedItems, ...response.data.failedItems];
          }
        }
      }

      if (failedItems.length > 0) {
        setError(
          `นำเข้าสำเร็จ ${successCount} รายการ, ล้มเหลว ${failedItems.length} รายการ`
        );
        // You could provide more detailed error info here
      } else {
        setSuccess(`นำเข้าสำเร็จทั้งหมด ${successCount} รายการ`);
        // Clear data after successful import
        setCsvData([]);
        setPreviewData([]);
        setFile(null);

        // Optionally wait a moment before closing
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } catch (error) {
      console.error("Error importing equipment:", error);
      setError(
        error.response?.data?.message || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล"
      );
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onComplete();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6">
        นำเข้าข้อมูลครุภัณฑ์จากไฟล์ CSV
      </h2>

      {error && (
        <Alert message={error} type="error" onClose={() => setError("")} />
      )}
      {success && (
        <Alert
          message={success}
          type="success"
          onClose={() => setSuccess("")}
        />
      )}

      {!file ? (
        <div
          className={`mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 ${
            isDragging ? "border-indigo-300 bg-indigo-50" : "border-gray-300"
          } border-dashed rounded-md transition-colors duration-200`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-1 text-center">
            <Upload
              className={`mx-auto h-12 w-12 ${
                isDragging ? "text-indigo-500" : "text-gray-400"
              }`}
            />
            <div className="flex text-sm text-gray-600">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                <span>อัพโหลดไฟล์ CSV</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </label>
              <p className="pl-1">หรือลากไฟล์วางที่นี่</p>
            </div>
            <p className="text-xs text-gray-500">
              ไฟล์ CSV ต้องมีหัวข้อคอลัมน์: equipment_id, name, type, room,
              status
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="bg-indigo-100 p-2 rounded-md">
                <CheckCircle className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {csvData.length} รายการ | {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setCsvData([]);
                setPreviewData([]);
                setValidationErrors([]);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    พบข้อผิดพลาด {validationErrors.length} รายการ
                  </h3>
                  <div className="mt-2 max-h-40 overflow-y-auto text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {validationErrors.slice(0, 10).map((error, index) => (
                        <li key={index}>
                          แถวที่ {error.row}: {error.message}
                        </li>
                      ))}
                      {validationErrors.length > 10 && (
                        <li>และอีก {validationErrors.length - 10} รายการ</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {previewData.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2">ตัวอย่างข้อมูล</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(previewData[0]).map((header) => (
                        <th
                          key={header}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Object.values(row).map((value, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvData.length > 5 && (
                <p className="text-sm text-gray-500 mt-2">
                  และอีก {csvData.length - 5} รายการ
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isProcessing}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={
                isProcessing ||
                validationErrors.length > 0 ||
                csvData.length === 0
              }
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isProcessing ? "กำลังนำเข้าข้อมูล..." : "นำเข้าข้อมูล"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          คำแนะนำในการเตรียมไฟล์ CSV
        </h3>
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
          <li>
            ไฟล์ CSV ต้องมีหัวข้อคอลัมน์: equipment_id, name, type, room, status
          </li>
          <li>
            รหัสครุภัณฑ์ (equipment_id)
            ต้องไม่มีช่องว่างและไม่ซ้ำกับที่มีอยู่ในระบบ
          </li>
          <li>ประเภท (type) ต้องเป็น "Computer" หรือ "Other" เท่านั้น</li>
          <li>ห้อง (room) ต้องเป็น "BI Studio" หรือ "Co-Working" เท่านั้น</li>
          <li>
            สถานะ (status) ต้องเป็น "active", "maintenance" หรือ "inactive"
            เท่านั้น
          </li>
        </ul>
      </div>
    </div>
  );
}

export default CsvImporter;
