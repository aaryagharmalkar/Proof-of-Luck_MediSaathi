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

            {/* Profile switcher (Netflix-style) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2 ml-2 text-gray-700">
                  <AvatarImage avatar={currentAvatar} className="w-8 h-8 rounded-lg" />
                  <span className="text-sm font-medium max-w-[100px] truncate">{currentLabel}</span>
                  <ChevronDown className="w-4 h-4 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Switch profile</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleSelectProfile(null)}>
                  <AvatarImage avatar={profile?.avatar} className="w-8 h-8 rounded mr-2" />
                  <span>Me</span>
                </DropdownMenuItem>
                {membersList.map((m) => (
                  <DropdownMenuItem key={m.id} onClick={() => handleSelectProfile(m)}>
                    <AvatarImage avatar={m.avatar} className="w-8 h-8 rounded mr-2" />
                    <span>{m.name}</span>
                    <span className="ml-1 text-xs text-muted-foreground capitalize">({m.relation || m.relationship || 'member'})</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profiles" className="cursor-pointer">Manage family members</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}