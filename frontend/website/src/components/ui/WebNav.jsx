import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Calendar, MessageCircle, Clock, User, Heart, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveMember } from '@/lib/ActiveMemberContext';
import { AvatarImage } from '@/components/ui/AvatarSelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const navItems = [
  { icon: Home, label: 'Dashboard', page: 'dashboard' },
  { icon: Calendar, label: 'Schedule', page: 'doctor-scheduler' },
  { icon: MessageCircle, label: 'AI Chat', page: 'chatbot' },
  { icon: Clock, label: 'History', page: 'history' },
  { icon: User, label: 'Profile', page: 'profile' },
];


export default function WebNav({ profile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { activeMember, setActiveMember, clearActiveMember, membersList } = useActiveMember();

  const currentLabel = activeMember ? activeMember.name : 'Me';
  const currentAvatar = activeMember?.avatar;

  const handleSelectProfile = (member) => {
    if (!member) {
      clearActiveMember();
    } else {
      setActiveMember(member);
    }
    navigate(createPageUrl('dashboard'));
  };

  return (
    <header className="bg-white/70 backdrop-blur-xl border-b border-white/40 sticky top-0 z-50 transition-all duration-200 supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to={createPageUrl('dashboard')} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform duration-300">
              <Heart className="w-5 h-5 text-white fill-white/20" />
            </div>
            <span className="font-extrabold text-xl text-gray-900 tracking-tight">MediSaathi</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1.5">
            {navItems.map((item) => {
              const url = createPageUrl(item.page);
              const isActive = currentPath === url || currentPath.includes(item.page);
              
              return (
                <Link
                  key={item.page}
                  to={url}
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

            {/* Profile switcher (Netflix-style) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 ml-3 pl-2 pr-3 py-1.5 rounded-full hover:bg-white/50 border border-transparent hover:border-gray-100 transition-all mr-0 h-auto">
                  <div className="relative">
                    <AvatarImage avatar={currentAvatar} className="w-9 h-9 rounded-full ring-2 ring-white shadow-sm" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex flex-col items-start hidden sm:flex">
                     <span className="text-xs font-bold text-gray-700 leading-none">{currentLabel}</span>
                     <span className="text-[10px] text-gray-400 font-medium leading-none mt-0.5 uppercase tracking-wide">
                        {activeMember ? (activeMember.relation || 'Family') : 'Primary'}
                     </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 border-gray-100 shadow-xl shadow-gray-200/50 bg-white/90 backdrop-blur-xl">
                <DropdownMenuLabel className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Switch Profile</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100" />
                
                <DropdownMenuItem 
                    onClick={() => handleSelectProfile(null)}
                    className="rounded-xl p-3 focus:bg-teal-50 focus:text-teal-700 cursor-pointer mb-1"
                >
                  <AvatarImage avatar={profile?.avatar} className="w-9 h-9 rounded-full border border-gray-100 mr-3" />
                  <div className="flex flex-col">
                      <span className="font-bold text-gray-900">Me</span>
                      <span className="text-xs text-gray-500">Primary Account</span>
                  </div>
                  {!activeMember && <div className="ml-auto w-2 h-2 bg-teal-500 rounded-full" />}
                </DropdownMenuItem>

                {membersList.map((m) => (
                  <DropdownMenuItem 
                    key={m.id} 
                    onClick={() => handleSelectProfile(m)}
                    className="rounded-xl p-3 focus:bg-teal-50 focus:text-teal-700 cursor-pointer mb-1"
                  >
                    <AvatarImage avatar={m.avatar} className="w-9 h-9 rounded-full border border-gray-100 mr-3" />
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{m.name}</span>
                        <span className="text-xs text-gray-500 capitalize">{m.relation || m.relationship || 'Member'}</span>
                    </div>
                    {activeMember?.id === m.id && <div className="ml-auto w-2 h-2 bg-teal-500 rounded-full" />}
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator className="bg-gray-100 my-1" />
                <DropdownMenuItem asChild className="rounded-xl p-3 focus:bg-gray-50 cursor-pointer text-gray-600 font-medium">
                  <Link to="/profile" className="w-full flex items-center justify-center">
                      Manage Profiles
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}