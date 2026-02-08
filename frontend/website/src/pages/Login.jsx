import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "@/api/apiClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Heart,
  ArrowRight,
} from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDoctorLogin = location.pathname === "/doctor-login";
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [formInvalid, setFormInvalid] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const minPasswordLength = 8;

  const validate = () => {
    const err = {};
    if (isLogin) {
      if (!formData.email.trim()) err.email = "Email is required";
      else if (!emailRegex.test(formData.email.trim())) err.email = "Enter a valid email address";
      if (!formData.password) err.password = "Password is required";
    } else {
      if (!formData.name.trim()) err.name = "Full name is required";
      if (!formData.email.trim()) err.email = "Email is required";
      else if (!emailRegex.test(formData.email.trim())) err.email = "Enter a valid email address";
      if (!formData.password) err.password = "Password is required";
      else if (formData.password.length < minPasswordLength)
        err.password = `Password must be at least ${minPasswordLength} characters`;
      if (formData.password !== formData.confirmPassword)
        err.confirmPassword = "Passwords do not match";
    }
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const isFormValid = () => {
    if (isLogin) return formData.email.trim() && formData.password;
    return (
      formData.name.trim() &&
      formData.email.trim() &&
      emailRegex.test(formData.email.trim()) &&
      formData.password.length >= minPasswordLength &&
      formData.password === formData.confirmPassword
    );
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
    setFormInvalid(false);
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setError("");
    setIsLoading(true);

    try {
      const endpoint = isLogin
      ? "/auth/signin"
      : "/auth/signup";

    const payload = isLogin
      ? {
          email: formData.email,
          password: formData.password,
        }
      : {
          name: formData.name,
          email: formData.email,
          password: formData.password,
        };

    const res = await api.post(endpoint, payload);

    // 🔑 LOGIN FLOW
    if (isLogin) {
      if (!res.data?.access_token) {
        throw new Error("No access token returned");
      }

      localStorage.setItem("token", res.data.access_token);

      if (isDoctorLogin) {
        navigate("/doctor-dashboard");
        return;
      }

      const onboardingCompleted = res.data?.onboarding_completed ?? false;
      if (onboardingCompleted) {
        navigate("/profiles");
      } else {
        navigate("/onboarding");
      }
      return;
    }

    // ✉️ SIGNUP FLOW
    // For doctor signup, immediately register as doctor
    if (isDoctorLogin) {
      setError("Account created. Please verify your email, then log in to complete doctor registration.");
    } else {
      setError("Account created. Please verify your email before logging in.");
    }
    
    // Redirect to appropriate login page
    if (isDoctorLogin) {
      navigate("/doctor-login");
    } else {
      navigate("/login");
    }

  } catch (err) {
    // Friendly messaging for wrong credentials
    if (err?.response?.status === 401) {
      setError("Email or password is incorrect");
      setFormInvalid(true);
    } else {
      setError(
        err?.response?.data?.detail ||
        err.message ||
        "Authentication failed"
      );
    }
  } finally {
    setIsLoading(false);
  }
};


  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Redirect to Google OAuth endpoint
      window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/auth/google`;
    } catch (err) {
      setError("Google sign in failed. Please try again.");
      setIsLoading(false);
    }
  };

  /* ------------------ UI ------------------ */

  return (
    <div className="min-h-screen relative bg-gray-50/50 overflow-hidden font-sans selection:bg-teal-100 flex items-center justify-center py-12 px-4">
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-teal-50/80 to-blue-50/80 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-purple-50/50 to-pink-50/50 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl mb-4 shadow-lg shadow-teal-500/30 text-white">
            <Heart className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">MediSaathi</h1>
          <p className="text-gray-500 font-medium">
            {isDoctorLogin ? "Doctor Portal – Sign in to manage patients" : "Your AI-Powered Healthcare Companion"}
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white/80 backdrop-blur-xl shadow-2xl shadow-gray-200/50 border border-white/40 rounded-[2.5rem] overflow-hidden"
        >
          {/* Toggle Tabs */}
          <div className="flex border-b border-gray-100/50 bg-white/50 backdrop-blur-md">
            <button
              onClick={() => {
                setIsLogin(true);
                setError("");
              }}
              className={`flex-1 py-4 text-center font-bold transition-all ${
                isLogin
                  ? "text-teal-700 bg-teal-50/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError("");
              }}
              className={`flex-1 py-4 text-center font-bold transition-all ${
                !isLogin
                  ? "text-teal-700 bg-teal-50/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form Content */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name (Signup only) */}
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <Label htmlFor="name" className="text-gray-700 font-semibold ml-1">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    className={`bg-gray-50/50 border-gray-200 focus:bg-white transition-all h-12 rounded-xl text-base ${fieldErrors.name ? "border-red-500 ring-2 ring-red-100" : "focus:ring-2 focus:ring-teal-100 focus:border-teal-400"}`}
                    aria-invalid={!!fieldErrors.name}
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-red-500 ml-1 font-medium">{fieldErrors.name}</p>
                  )}
                </motion.div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-700 font-semibold ml-1">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => updateFormData("email", e.target.value)}
                    aria-invalid={formInvalid || !!fieldErrors.email}
                    className={`pl-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all h-12 rounded-xl text-base ${formInvalid || fieldErrors.email ? "border-red-500 ring-2 ring-red-100" : "focus:ring-2 focus:ring-teal-100 focus:border-teal-400"}`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-red-500 ml-1 font-medium">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                   <Label htmlFor="password" className="text-gray-700 font-semibold ml-1">Password</Label>
                   {isLogin && (
                    <button
                      type="button"
                      className="text-xs text-teal-600 hover:text-teal-700 font-bold hover:underline"
                      onClick={() => navigate("/forgot-password")}
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "••••••••" : `Min 8 chars`}
                    value={formData.password}
                    onChange={(e) => updateFormData("password", e.target.value)}
                    aria-invalid={formInvalid || !!fieldErrors.password}
                    className={`pl-11 pr-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all h-12 rounded-xl text-base ${formInvalid || fieldErrors.password ? "border-red-500 ring-2 ring-red-100" : "focus:ring-2 focus:ring-teal-100 focus:border-teal-400"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-red-500 ml-1 font-medium">{fieldErrors.password}</p>
                )}
              </div>

              {/* Confirm Password (Signup only) */}
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <Label htmlFor="confirmPassword" className="text-gray-700 font-semibold ml-1">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        updateFormData("confirmPassword", e.target.value)
                      }
                      className={`pl-11 bg-gray-50/50 border-gray-200 focus:bg-white transition-all h-12 rounded-xl text-base ${fieldErrors.confirmPassword ? "border-red-500 ring-2 ring-red-100" : "focus:ring-2 focus:ring-teal-100 focus:border-teal-400"}`}
                      aria-invalid={!!fieldErrors.confirmPassword}
                    />
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-red-500 ml-1 font-medium">{fieldErrors.confirmPassword}</p>
                  )}
                </motion.div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {error}
                </motion.div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading || !isFormValid()}
                className="w-full bg-gray-900 hover:bg-black text-white font-bold h-12 rounded-xl shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Create Account"}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs font-bold uppercase tracking-wider">
                <span className="px-4 bg-white/80 backdrop-blur text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign In */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-50 border-gray-200 text-gray-700 font-bold h-12 rounded-xl"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>

            {/* Terms (Signup only) */}
            {!isLogin && (
              <p className="mt-6 text-xs text-center text-gray-400">
                By signing up, you agree to our{" "}
                <a href="/terms" className="text-teal-600 font-bold hover:underline">
                  Terms
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-teal-600 font-bold hover:underline">
                  Privacy Policy
                </a>
              </p>
            )}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mt-8 text-center"
        >
          <p className="text-sm font-medium text-gray-500">
            {isLogin ? "New to MediSaathi? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              className="text-teal-600 hover:text-teal-700 font-bold hover:underline"
            >
              {isLogin ? "Create account" : "Log in"}
            </button>
          </p>
          
          <div className="mt-6">
            <button
              onClick={() => navigate(isDoctorLogin ? "/login" : "/doctor-login")}
              className="inline-flex items-center text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors bg-white/50 px-4 py-2 rounded-full border border-transparent hover:border-gray-200"
            >
              <Heart className="w-3 h-3 mr-1.5" />
              {isDoctorLogin ? "Go to Patient Login" : "Go to Doctor Portal"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}