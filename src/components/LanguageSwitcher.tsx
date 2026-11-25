import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'navbar' | 'mobile' | 'page-corner';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en').slice(0, 2).toLowerCase();

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem('levelling-up-lang', lang);
    } catch {
      // localStorage may fail in private mode
    }
  };

  useEffect(() => {
    const lang = (i18n.language || 'en').slice(0, 2).toLowerCase();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [i18n.language]);

  const languages = [
    { code: 'en', label: 'EN', fullName: 'English' },
    { code: 'fr', label: 'FR', fullName: 'Français' },
    { code: 'ar', label: 'AR', fullName: 'العربية' },
  ];

  if (variant === 'page-corner') {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-full bg-white/90 backdrop-blur-md border border-neutral-200/90 shadow-soft text-xs font-semibold ${className}`}
      >
        <div className="pl-2 pr-1 text-neutral-400">
          <Globe className="w-3.5 h-3.5" />
        </div>
        {languages.map((l, idx) => {
          const isActive = currentLang === l.code;
          return (
            <React.Fragment key={l.code}>
              {idx > 0 && <span className="text-neutral-300 text-[10px] select-none">|</span>}
              <button
                type="button"
                onClick={() => handleLanguageChange(l.code)}
                className={`relative px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#111111] text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
                }`}
                title={l.fullName}
              >
                <span>{l.label}</span>
                {isActive && (
                  <span className="absolute bottom-0.5 left-2 right-2 h-[2px] bg-[#C99B2C] rounded-full" />
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  if (variant === 'mobile') {
    return (
      <div className={`flex items-center justify-between p-2 rounded-2xl bg-neutral-50 border border-neutral-200/80 ${className}`}>
        <div className="flex items-center gap-2 pl-2 text-neutral-600 text-xs font-medium">
          <Globe className="w-4 h-4 text-[#B8860B]" />
          <span>Language / اللغة</span>
        </div>
        <div className="flex items-center gap-1">
          {languages.map((l) => {
            const isActive = currentLang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => handleLanguageChange(l.code)}
                className={`relative min-h-[36px] px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#111111] text-white shadow-xs'
                    : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/60'
                }`}
              >
                <span>{l.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 left-2.5 right-2.5 h-[2px] bg-[#C99B2C] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop Navbar variant: pill with EN | FR | AR
  return (
    <div
      className={`inline-flex items-center gap-0.5 p-1 rounded-full bg-neutral-100/80 border border-neutral-200/60 text-xs font-semibold ${className}`}
    >
      {languages.map((l, idx) => {
        const isActive = currentLang === l.code;
        return (
          <React.Fragment key={l.code}>
            {idx > 0 && <span className="text-neutral-300 text-[10px] select-none">|</span>}
            <button
              type="button"
              onClick={() => handleLanguageChange(l.code)}
              className={`relative px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#111111] text-white font-bold shadow-xs'
                  : 'text-neutral-600 hover:text-black hover:bg-white/80'
              }`}
              title={l.fullName}
            >
              <span>{l.label}</span>
              {isActive && (
                <span className="absolute bottom-0.5 left-2 right-2 h-[2px] bg-[#C99B2C] rounded-full" />
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};
