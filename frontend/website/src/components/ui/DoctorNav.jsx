import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Heart, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/doctor-dashboard" },
  { icon: Users, label: "Patients", path: "/doctor-dashboard/patients" },
];

export default function DoctorNav({ profile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("access_token");
    navigate("/doctor-login");
  };

  return (
    <header className="bg-white/70 backdrop-blur-xl border-b border-white/40 sticky top-0 z-50 transition-all duration-200 supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/doctor-dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform duration-300">
              <Heart className="w-5 h-5 text-white fill-white/20" />
            </div>
            <div className="flex flex-col">
                <span className="font-extrabold text-xl text-gray-900 tracking-tight leading-none">MediSaathi</span>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-widest mt-0.5">Doctor Portal</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1.5">
            {navItems.map((item) => {
              const isActive =
                currentPath === item.path ||
                (item.path !== "/doctor-dashboard" && currentPath.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200",
                    isActive 
                      ? "bg-teal-50/80 text-teal-700 shadow-sm ring-1 ring-teal-100 font-bold backdrop-blur-md" 
                      : "text-gray-500 hover:bg-white/50 hover:text-gray-900 font-medium hover:shadow-sm"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
            <div className="w-px h-6 bg-gray-200 mx-2" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100 border border-transparent transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-bold">Log out</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
