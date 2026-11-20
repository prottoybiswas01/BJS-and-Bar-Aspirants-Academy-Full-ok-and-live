import React from 'react';

/**
 * BJS & BAR ASPIRANTS ACADEMY - OFFICIAL SOVEREIGN BRAND LOGO
 * Sovereign Shield enclosing balanced Scales of Justice over an Open Law Book
 * Rendered in Metallic Gold (#F59E0B -> #D97706) on a Deep Midnight Navy (#0F172A) crest.
 */
export default function BrandLogo({
  size = 'md',
  showText = true,
  variant = 'default',
  iconOnly = false,
  className = '',
  onClick
}) {
  const sizeMap = {
    xs: { icon: 28, text: 'text-xs', sub: 'text-[8px]', gap: 'gap-1.5' },
    sm: { icon: 34, text: 'text-sm', sub: 'text-[9px]', gap: 'gap-2' },
    md: { icon: 44, text: 'text-base sm:text-lg', sub: 'text-[10px] sm:text-[11px]', gap: 'gap-2.5' },
    lg: { icon: 54, text: 'text-xl sm:text-2xl', sub: 'text-xs sm:text-[13px]', gap: 'gap-3' },
    xl: { icon: 68, text: 'text-2xl sm:text-3xl', sub: 'text-sm', gap: 'gap-3.5' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const dimension = currentSize.icon;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center ${currentSize.gap} select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      role={onClick ? 'button' : 'img'}
      aria-label="BJS & Bar Academy Logo"
    >
      {/* Sovereign Shield Vector SVG */}
      <div className="relative shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        <svg
          width={dimension}
          height={dimension}
          viewBox="0 0 100 108"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="filter drop-shadow-md"
        >
          <defs>
            {/* Metallic Gold Gradient */}
            <linearGradient id="bjsGoldMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="35%" stopColor="#F59E0B" />
              <stop offset="70%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>

            {/* Shield Midnight Navy Gradient */}
            <linearGradient id="bjsNavyDeep" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="45%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>

            {/* Inner Glow */}
            <radialGradient id="bjsShieldGlow" cx="50%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer Shield Rim with Metallic Gold Stroke */}
          <path
            d="M50 4 C76 4 94 15 94 34 C94 68 50 100 50 104 C50 100 6 68 6 34 C6 15 24 4 50 4 Z"
            fill="url(#bjsNavyDeep)"
            stroke="url(#bjsGoldMetallic)"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Inner Shield Accent Line */}
          <path
            d="M50 10 C72 10 88 19 88 35 C88 64 50 92 50 95 C50 92 12 64 12 35 C12 19 28 10 50 10 Z"
            fill="url(#bjsShieldGlow)"
            stroke="url(#bjsGoldMetallic)"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />

          {/* Scales of Justice Pillar / Column */}
          <rect x="48.5" y="24" width="3" height="38" rx="1.5" fill="url(#bjsGoldMetallic)" />
          {/* Top Pillar Finial */}
          <circle cx="50" cy="22" r="3.5" fill="url(#bjsGoldMetallic)" />
          {/* Pillar Base Pedestal */}
          <path d="M42 61 L58 61 L55 64 L45 64 Z" fill="url(#bjsGoldMetallic)" />

          {/* Balance Horizontal Beam */}
          <path d="M22 30 C34 27 66 27 78 30" stroke="url(#bjsGoldMetallic)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="22" cy="30" r="2" fill="url(#bjsGoldMetallic)" />
          <circle cx="78" cy="30" r="2" fill="url(#bjsGoldMetallic)" />

          {/* Left Pan Strings */}
          <line x1="22" y1="30" x2="14" y2="44" stroke="url(#bjsGoldMetallic)" strokeWidth="1.2" />
          <line x1="22" y1="30" x2="30" y2="44" stroke="url(#bjsGoldMetallic)" strokeWidth="1.2" />
          {/* Left Scale Pan */}
          <path d="M13 44 C13 44 22 50 31 44 Z" fill="url(#bjsGoldMetallic)" />

          {/* Right Pan Strings */}
          <line x1="78" y1="30" x2="70" y2="44" stroke="url(#bjsGoldMetallic)" strokeWidth="1.2" />
          <line x1="78" y1="30" x2="86" y2="44" stroke="url(#bjsGoldMetallic)" strokeWidth="1.2" />
          {/* Right Scale Pan */}
          <path d="M69 44 C69 44 78 50 87 44 Z" fill="url(#bjsGoldMetallic)" />

          {/* Open Law Book at the Base */}
          {/* Left Page */}
          <path
            d="M50 74 C41 71 31 71 22 74 L22 84 C31 81 41 81 50 84 Z"
            fill="#0F172A"
            stroke="url(#bjsGoldMetallic)"
            strokeWidth="1.8"
          />
          {/* Right Page */}
          <path
            d="M50 74 C59 71 69 71 78 74 L78 84 C69 81 59 81 50 84 Z"
            fill="#0F172A"
            stroke="url(#bjsGoldMetallic)"
            strokeWidth="1.8"
          />
          {/* Book Spine Center Line */}
          <line x1="50" y1="73" x2="50" y2="85" stroke="url(#bjsGoldMetallic)" strokeWidth="2" />

          {/* Legal Ruling Lines on Book Pages */}
          <line x1="26" y1="76.5" x2="45" y2="74.5" stroke="url(#bjsGoldMetallic)" strokeWidth="0.9" strokeOpacity="0.75" />
          <line x1="26" y1="79.5" x2="45" y2="77.5" stroke="url(#bjsGoldMetallic)" strokeWidth="0.9" strokeOpacity="0.75" />
          <line x1="55" y1="74.5" x2="74" y2="76.5" stroke="url(#bjsGoldMetallic)" strokeWidth="0.9" strokeOpacity="0.75" />
          <line x1="55" y1="77.5" x2="74" y2="79.5" stroke="url(#bjsGoldMetallic)" strokeWidth="0.9" strokeOpacity="0.75" />

          {/* Star of Excellence above Shield Apex */}
          <polygon
            points="50,13 51.5,17 56,17 52.5,19.5 54,23.5 50,21 46,23.5 47.5,19.5 44,17 48.5,17"
            fill="url(#bjsGoldMetallic)"
          />
        </svg>
      </div>

      {/* Typography Block */}
      {showText && !iconOnly && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`font-black tracking-tight ${currentSize.text} ${
                variant === 'light'
                  ? 'text-slate-900'
                  : 'text-white'
              }`}
              style={{ fontFamily: '"Plus Jakarta Sans", "Hind Siliguri", sans-serif' }}
            >
              BJS & Bar Academy
            </span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              আইন পাঠশালা
            </span>
          </div>
          <span
            className={`font-bold tracking-widest uppercase text-amber-500/90 ${currentSize.sub} mt-0.5`}
            style={{ letterSpacing: '0.12em', fontFamily: '"Plus Jakarta Sans", sans-serif' }}
          >
            Judiciary & Advocacy Excellence
          </span>
        </div>
      )}
    </div>
  );
}
