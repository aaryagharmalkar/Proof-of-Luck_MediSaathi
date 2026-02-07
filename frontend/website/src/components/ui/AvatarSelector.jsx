import React from 'react';
import { cn } from '@/lib/utils';

const avatars = [
  // Existing generic avatars (with emoji fallback)
  { id: 'male-1', gender: 'male', skin: 'light', glasses: false, style: 'professional', emoji: '👨' },
  { id: 'male-2', gender: 'male', skin: 'medium', glasses: true, style: 'professional', emoji: '👨‍⚕️' },
  { id: 'male-3', gender: 'male', skin: 'dark', glasses: false, style: 'casual', emoji: '👨🏾' },
  { id: 'male-4', gender: 'male', skin: 'medium', glasses: false, style: 'professional', emoji: '👨🏻' },
  { id: 'female-1', gender: 'female', skin: 'light', glasses: false, style: 'professional', emoji: '👩' },
  { id: 'female-2', gender: 'female', skin: 'medium', glasses: true, style: 'casual', emoji: '👩‍⚕️' },
  { id: 'female-3', gender: 'female', skin: 'dark', glasses: false, style: 'professional', emoji: '👩🏾' },
  { id: 'female-4', gender: 'female', skin: 'medium', glasses: false, style: 'casual', emoji: '👩🏻' },
  { id: 'neutral-1', gender: 'neutral', skin: 'medium', glasses: false, style: 'casual', emoji: '🧑' },
  { id: 'neutral-2', gender: 'neutral', skin: 'light', glasses: true, style: 'professional', emoji: '🧑‍⚕️' },

  // Indian diversity additions (emoji-first)
  { id: 'indian-male-1', gender: 'male', skin: 'warm', glasses: false, style: 'professional', accessory: 'moustache', emoji: '👨🏽' },
  { id: 'indian-male-2', gender: 'male', skin: 'brown', glasses: false, style: 'casual', accessory: 'turban', emoji: '👳‍♂️' },
  { id: 'indian-female-1', gender: 'female', skin: 'warm', glasses: false, style: 'saree', accessory: 'bindi', jewelry: 'noseRing', emoji: '👩🏽' },
  { id: 'indian-female-2', gender: 'female', skin: 'medium', glasses: false, style: 'saree', accessory: 'longHair', emoji: '👩🏾' },
  { id: 'indian-female-3', gender: 'female', skin: 'brown', glasses: false, style: 'casual', accessory: 'hijab', emoji: '🧕' },
  { id: 'indian-neutral-1', gender: 'neutral', skin: 'warm', glasses: false, style: 'casual', accessory: 'bindi', emoji: '🧑🏽' }
];

const skinColors = {
  light: '#F8E0DA',
  medium: '#E6B89C',
  warm: '#D2996A',
  brown: '#B56B40',
  dark: '#7A482B'
};

const hairColors = {
  male: '#2C1810',
  female: '#1A1A2E',
  neutral: '#4A4A4A'
};

export default function AvatarSelector({ selectedId, onSelect, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  };

  return (
    <div className="grid grid-cols-5 gap-3">
      {avatars.map((avatar) => (
        <button
          key={avatar.id}
          onClick={() => onSelect(avatar.id)}
          aria-pressed={selectedId === avatar.id}
          title={avatar.id}
          className={cn(
            "rounded-full p-1 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
            selectedId === avatar.id 
              ? "ring-2 ring-teal-500 ring-offset-2 bg-teal-50" 
              : "hover:bg-gray-100"
          )}
        >
          <AvatarImage avatar={avatar} size={size} className={sizeClasses[size]} />
        </button>
      ))}
    </div>
  );
}

export function AvatarImage({ avatar, size = 'md', className = "w-16 h-16" }) {
  if (!avatar) return null;
  
  const avatarData = typeof avatar === 'string' 
    ? avatars.find(a => a.id === avatar) || avatars[0]
    : avatar;

  // Emoji-first UI: if emoji present, render a centered emoji with responsive font size
  if (avatarData.emoji) {
    const emojiSizeClasses = {
      sm: 'text-xl',
      md: 'text-2xl',
      lg: 'text-3xl',
      xl: 'text-4xl'
    };
    const emojiClass = emojiSizeClasses[size] || emojiSizeClasses.md;

    return (
      <div className={cn("rounded-full bg-white flex items-center justify-center", className)} role="img" aria-label={avatarData.id} title={avatarData.id}>
        <span className={cn(emojiClass)} aria-hidden>{avatarData.emoji}</span>
      </div>
    );
  }

  const skin = skinColors[avatarData.skin] || skinColors.medium;
  const hair = hairColors[avatarData.gender] || '#3A3A3A';

  return (
    <svg viewBox="0 0 100 100" className={cn("rounded-full", className)} role="img" aria-label={avatarData.id}>
      <title>{avatarData.id}</title>
      {/* subtle gradient background */}
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#E8F5F3" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="48" fill="url(#bgGrad)" />

      {/* face */}
      <circle cx="50" cy="45" r="25" fill={skin} />

      {/* hair / headwrap variations */}
      {avatarData.accessory === 'turban' ? (
        <g>
          <path d="M22 40 Q30 20 50 22 Q70 20 78 40 Q78 50 72 55 L28 55 Q22 50 22 40" fill="#B33" />
          <path d="M28 36 Q38 28 50 30 Q62 28 72 36" fill="#D24" opacity="0.8" />
        </g>
      ) : avatarData.accessory === 'hijab' ? (
        <g>
          <path d="M22 35 Q30 18 50 18 Q70 18 78 35 L78 62 Q70 75 50 75 Q30 75 22 62 Z" fill="#6B2" />
          <path d="M30 50 Q50 65 70 50" fill="#5A9" opacity="0.6" />
        </g>
      ) : (
        avatarData.gender === 'female' ? (
          <path d="M25 40 Q30 15 50 15 Q70 15 75 40 Q75 50 70 55 L30 55 Q25 50 25 40" fill={hair} />
        ) : avatarData.gender === 'male' ? (
          <path d="M30 35 Q35 20 50 18 Q65 20 70 35 Q72 40 70 42 L30 42 Q28 40 30 35" fill={hair} />
        ) : (
          <path d="M28 38 Q33 18 50 16 Q67 18 72 38 Q74 45 70 48 L30 48 Q26 45 28 38" fill={hair} />
        )
      )}

      {/* eyes */}
      <circle cx="40" cy="42" r="3" fill="#2C1810" />
      <circle cx="60" cy="42" r="3" fill="#2C1810" />

      {/* glasses */}
      {avatarData.glasses && (
        <>
          <circle cx="40" cy="42" r="8" fill="none" stroke="#4A4A4A" strokeWidth="2" />
          <circle cx="60" cy="42" r="8" fill="none" stroke="#4A4A4A" strokeWidth="2" />
          <line x1="48" y1="42" x2="52" y2="42" stroke="#4A4A4A" strokeWidth="2" />
        </>
      )}

      {/* small nose/mouth */}
      <path d="M45 52 Q50 56 55 52" fill="none" stroke="#C4928A" strokeWidth="2" strokeLinecap="round" />

      {/* accessories: bindi, moustache, nose ring */}
      {avatarData.accessory === 'bindi' && (
        <circle cx="50" cy="34" r="2.6" fill="#D23" />
      )}

      {avatarData.accessory === 'moustache' && (
        <path d="M42 48 Q50 52 58 48 Q50 54 42 48" fill="#2C1810" />
      )}

      {avatarData.jewelry === 'noseRing' && (
        <circle cx="58" cy="44" r="1.6" fill="none" stroke="#D4AF37" strokeWidth="1.6" />
      )}

      {/* clothing / sari style */}
      {avatarData.style === 'professional' && (
        <path d="M30 75 Q35 65 50 65 Q65 65 70 75 L75 90 L25 90 Z" fill="#3B82F6" />
      )}
      {avatarData.style === 'casual' && (
        <path d="M30 75 Q35 65 50 65 Q65 65 70 75 L75 90 L25 90 Z" fill="#0D9488" />
      )}
      {avatarData.style === 'saree' && (
        <path d="M30 75 Q35 65 50 65 Q65 65 70 75 L75 90 L25 90 Z" fill="#B02E4A" />
      )}
    </svg>
  );
}

export { avatars };