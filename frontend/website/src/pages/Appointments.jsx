import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

export default function Appointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);

  /* ---------------- LOAD APPOINTMENTS ---------------- */

  useEffect(() => {
    const localAppts = JSON.parse(
      localStorage.getItem("appointments") || "[]"
    );

    // De-duplicate by date + time
    const unique = Object.values(
      localAppts.reduce((acc, curr) => {
        const key = `${curr.date}-${curr.time}`;
        acc[key] = curr;
        return acc;
      }, {})
    );

    setAppointments(unique);
  }, []);

  /* ---------------- DELETE ---------------- */

  const deleteAppointment = (date, time) => {
    if (!window.confirm("Cancel this appointment?")) return;

    const existing = JSON.parse(
      localStorage.getItem("appointments") || "[]"
    );

    const updated = existing.filter(
      (a) => !(a.date === date && a.time === time)
    );

    localStorage.setItem("appointments", JSON.stringify(updated));
    setAppointments(updated);
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Your Appointments</h1>

        {appointments.length === 0 ? (
          <div className="text-center text-gray-500">
            No appointments booked
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((apt, idx) => (
              <div
                key={`${apt.date}-${apt.time}-${idx}`}
                className="bg-white border rounded-xl p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">
                    {apt.doctor_name || "Doctor"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {apt.date} · {apt.time}
                  </p>
                  <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                    scheduled
                  </span>
                </div>

                <button
                  onClick={() =>
                    deleteAppointment(apt.date, apt.time)
                  }
                  className="text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate("/doctor-scheduler")}
          className="mt-6 text-teal-600 hover:underline"
        >
          + Book another appointment
        </button>
      </div>
    </div>
  );
}
