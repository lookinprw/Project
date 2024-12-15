import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Check, AlertCircle } from "lucide-react";

function UserProfileForm() {
  const { user, updateUserLineId } = useAuth();
  const [formData, setFormData] = useState({
    line_user_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        line_user_id: user.line_user_id || "",
      });
      console.log("Current user data:", user); // Debug log
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.line_user_id.trim()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await updateUserLineId(formData.line_user_id);

      if (result.success) {
        setSuccess("เชื่อมต่อ LINE สำเร็จ!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(result.error || "เกิดข้อผิดพลาดในการอัพเดท LINE ID");
      }
    } catch (error) {
      console.error("Error updating LINE ID:", error);
      setError("เกิดข้อผิดพลาดในการอัพเดทข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  // Don't show form if already connected and no error
  if (user?.line_user_id && !error) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
        <h2 className="text-2xl font-bold">อัพเดท LINE User ID</h2>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 rounded-lg p-4 bg-red-50 border border-red-200">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg p-4 bg-green-50 border border-green-200">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LINE User ID
              </label>
              <input
                type="text"
                value={formData.line_user_id}
                onChange={(e) =>
                  setFormData({ ...formData, line_user_id: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                disabled={loading}
              />
              <p className="mt-2 text-sm text-gray-500">
                พิมพ์ !id ในแชท LINE Official Account เพื่อดูรหัส LINE ของคุณ
              </p>
            </div>

            <div className="mt-4">
              <button
                type="submit"
                disabled={loading || !formData.line_user_id.trim()}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserProfileForm;
