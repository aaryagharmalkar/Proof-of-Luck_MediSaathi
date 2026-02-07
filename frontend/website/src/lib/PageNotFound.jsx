import React from "react";
import { useLocation, Link } from "react-router-dom";

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.replace("/", "") || "unknown";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full text-center space-y-6">
        {/* 404 */}
        <div className="space-y-2">
          <h1 className="text-7xl font-light text-slate-300">404</h1>
          <div className="h-0.5 w-16 bg-slate-200 mx-auto" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h2 className="text-2xl font-medium text-slate-800">
            Page Not Found
          </h2>
          <p className="text-slate-600 leading-relaxed">
            The page{" "}
            <span className="font-medium text-slate-700">
              "{pageName}"
            </span>{" "}
            does not exist.
          </p>
        </div>

        {/* Action */}
        <div className="pt-6">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3"
              />
            </svg>
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
