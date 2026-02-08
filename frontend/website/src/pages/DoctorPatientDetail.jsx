import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/api/apiClient";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DoctorPatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState({ profile: {}, reports: [] });
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(null);

  useEffect(() => {
    api
      .get(`/doctors/me/patients/${patientId}`)
      .then((res) => setData({ profile: res.data?.profile || {}, reports: res.data?.reports || [] }))
      .catch((e) => {
        if (e.response?.status === 404) navigate("/doctor-dashboard/patients");
      })
      .finally(() => setLoading(false));
  }, [patientId, navigate]);

  const fetchSummary = async (reportId) => {
    setSummaryLoading(reportId);
    try {
      const res = await api.get(`/doctors/me/patients/${patientId}/report-summary`, {
        params: { report_id: reportId },
      });
      setData((prev) => ({
        ...prev,
        reports: prev.reports.map((r) =>
          (r.id === reportId || r.report_id === reportId) ? { ...r, summary: res.data?.summary } : r
        ),
      }));
    } finally {
      setSummaryLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  const profile = data.profile;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link
          to="/doctor-dashboard/patients"
          className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to patients
        </Link>

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6"
        >
          <div className="bg-gradient-to-r from-teal-50 to-white px-6 py-5 border-b">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-2xl">
                {(profile.full_name || "P")[0]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{profile.full_name || "Patient"}</h1>
                {profile.age && <p className="text-gray-500">{profile.age} years</p>}
                {profile.gender && <p className="text-sm text-gray-500">{profile.gender}</p>}
                {profile.location && <p className="text-sm text-gray-500">{profile.location}</p>}
              </div>
            </div>
          </div>
          <div className="p-6">
            {profile.health_profile && Object.keys(profile.health_profile).length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Health profile</h3>
                <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-auto max-h-32">
                  {JSON.stringify(profile.health_profile, null, 2)}
                </pre>
              </div>
            )}
            {profile.emergency_contact && (profile.emergency_contact.name || profile.emergency_contact.phone) && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Emergency contact</h3>
                <p className="text-sm text-gray-600">
                  {profile.emergency_contact.name} {profile.emergency_contact.phone}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Reports */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Medical reports
          </h2>
        </div>

        {data.reports.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No reports uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.reports.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-600" />
                    <span className="font-medium text-gray-900">{r.file_name || "Report"}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
                <div className="p-5">
                  {r.summary ? (
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap">{r.summary}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        onClick={() => fetchSummary(r.id)}
                        disabled={summaryLoading === r.id}
                        className="bg-teal-500 hover:bg-teal-600"
                      >
                        {summaryLoading === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate AI summary
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
