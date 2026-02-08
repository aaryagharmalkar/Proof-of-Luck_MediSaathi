import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/api/apiClient";
import { Users, Loader2, User } from "lucide-react";

export default function DoctorPatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/doctors/me")
      .then((meRes) => {
        if (!meRes.data?.onboarding_completed) {
          navigate("/doctor-onboarding");
          return;
        }
        return api.get("/doctors/me/patients");
      })
      .then((res) => res?.data != null && setPatients(res.data || []))
      .catch((e) => {
        if (e.response?.status === 401) navigate("/doctor-login");
        if (e.response?.status === 404) navigate("/doctor-onboarding");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Your patients</h1>
          <p className="text-gray-500">Click a patient to view profile and reports</p>
        </div>

        {patients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No patients yet</p>
            <p className="text-sm text-gray-500 mt-1">When patients book appointments with you, they will appear here.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {patients.map((p) => (
              <Link
                key={p.user_id}
                to={"/doctor-dashboard/patients/" + p.user_id}
                className="block"
              >
                <div className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-lg hover:border-teal-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg">
                      {(p.full_name || "P")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{p.full_name || "Patient"}</h3>
                      {p.age && <p className="text-sm text-gray-500">{p.age} years</p>}
                      {p.location && <p className="text-xs text-gray-500 truncate">{p.location}</p>}
                      <p className="text-xs text-teal-600 mt-1">{p.upcoming_count || 0} upcoming appointment(s)</p>
                    </div>
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
