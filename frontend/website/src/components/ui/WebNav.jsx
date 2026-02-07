import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Calendar, MessageCircle, Clock, User, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Dashboard', page: 'dashboard' },
  { icon: Calendar, label: 'Schedule', page: 'doctor-scheduler' },
  { icon: MessageCircle, label: 'AI Chat', page: 'chatbot' },
  { icon: Clock, label: 'History', page: 'history' },
  { icon: User, label: 'Profile', page: 'profile' },
];


export default function WebNav({ profile }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to={createPageUrl('dashboard')} className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">MediSaathi</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const url = createPageUrl(item.page);
              const isActive = currentPath === url || currentPath.includes(item.page);
              
              return (
                <Link
                  key={item.page}
                  to={url}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-teal-50 text-teal-600" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}