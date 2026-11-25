import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import {
  ChevronDown,
  LogOut,
  User as UserIcon,
  PlaySquare,
  ShieldCheck,
  CreditCard,
  Menu,
  X,
} from 'lucide-react';

interface NavbarProps {
  onScrollToSection?: (sectionId: string) => void;
  onContactClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onScrollToSection, onContactClick }) => {
  const { t } = useTranslation();
  const { user, profile, isAdmin, isApproved, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Scroll detection for navbar blur and bottom border
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const handleNavClick = (sectionId: string) => {
    if (sectionId === 'contact' && onContactClick) {
      onContactClick();
      setMobileMenuOpen(false);
      return;
    }

    if (location.pathname === '/') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(`/#${sectionId}`);
    }
    setMobileMenuOpen(false);
  };

  // User avatar initials
  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'LU';

  // Unified Status Badge Helper
  const getStatusMeta = () => {
    if (isAdmin) {
      return {
        label: t('nav.status.admin'),
        pillClass: 'bg-neutral-900 text-white border border-neutral-900',
        dotClass: 'bg-emerald-400',
      };
    }
    if (isApproved || profile?.status === 'approved') {
      return {
        label: t('nav.status.member'),
        pillClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
        dotClass: 'bg-emerald-500',
      };
    }
    if (profile?.status === 'pending') {
      return {
        label: t('nav.status.pending'),
        pillClass: 'bg-amber-50 text-amber-700 border border-amber-200/80',
        dotClass: 'bg-amber-500 animate-pulse',
      };
    }
    if (profile?.status === 'rejected') {
      return {
        label: t('nav.status.rejected'),
        pillClass: 'bg-rose-50 text-rose-700 border border-rose-200/80',
        dotClass: 'bg-rose-500',
      };
    }
    return {
      label: t('nav.status.notActivated'),
      pillClass: 'bg-neutral-100 text-[#6B7280] border border-neutral-200/80',
      dotClass: 'bg-neutral-400',
    };
  };

  const renderStatusBadge = (extraClass = '') => {
    const meta = getStatusMeta();
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${meta.pillClass} ${extraClass}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
        <span>{meta.label}</span>
      </span>
    );
  };

  const isLanding = location.pathname === '/';

  return (
    <header
      className={`${
        isLanding ? 'fixed md:sticky left-0 right-0' : 'sticky'
      } top-0 z-40 w-full transition-all duration-300 ${
        isScrolled || mobileMenuOpen
          ? 'bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-[0_2px_10px_0_rgba(0,0,0,0.03)]'
          : isLanding
          ? 'bg-transparent md:bg-white/75 md:backdrop-blur-sm border-b border-transparent'
          : 'bg-white/75 backdrop-blur-sm border-b border-transparent'
      }`}
    >
      <div className="max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 lg:px-8 h-18 py-3.5 flex items-center justify-between">
        {/* Left: Logo (LTR: left, RTL: right) */}
        <Logo linkTo="/" />

        {/* Center/Desktop Nav Links */}
        {!user ? (
          <nav className="hidden md:flex items-center md:gap-4 lg:gap-7 xl:gap-8 text-[14px] lg:text-[15px] font-medium text-[#6B7280]">
            <button
              onClick={() => handleNavClick('lessons')}
              className="hover:text-[#111111] transition-colors cursor-pointer"
            >
              {t('nav.lessons')}
            </button>
            <button
              onClick={() => handleNavClick('how-it-works')}
              className="hover:text-[#111111] transition-colors cursor-pointer"
            >
              {t('nav.howItWorks')}
            </button>
            <button
              onClick={() => handleNavClick('reviews')}
              className="hover:text-[#111111] transition-colors cursor-pointer"
            >
              {t('nav.reviews')}
            </button>
            <button
              onClick={() => handleNavClick('faq')}
              className="hover:text-[#111111] transition-colors cursor-pointer"
            >
              {t('nav.faq')}
            </button>
            <button
              onClick={() => handleNavClick('contact')}
              className="hover:text-[#111111] transition-colors cursor-pointer"
            >
              {t('nav.contact')}
            </button>
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-6 text-[14px] lg:text-[15px] font-medium">
            {isApproved && (
              <Link
                to="/videos"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  location.pathname.startsWith('/videos')
                    ? 'bg-neutral-100 text-[#111111] font-semibold'
                    : 'text-[#6B7280] hover:text-[#111111]'
                }`}
              >
                <PlaySquare className="w-4 h-4 text-[#111111]" />
                {t('nav.videos')}
              </Link>
            )}

            {!isApproved && (
              <Link
                to="/activate"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  location.pathname === '/activate'
                    ? 'bg-neutral-100 text-[#111111] font-semibold'
                    : 'text-[#6B7280] hover:text-[#111111]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#B8860B]" />
                {t('nav.activateAccess')}
              </Link>
            )}

            <button
              onClick={() => handleNavClick('lessons')}
              className="text-[#6B7280] hover:text-[#111111] transition-colors text-sm cursor-pointer"
            >
              {t('nav.lessons')}
            </button>

            <button
              onClick={() => handleNavClick('faq')}
              className="text-[#6B7280] hover:text-[#111111] transition-colors text-sm cursor-pointer"
            >
              {t('nav.faq')}
            </button>

            {isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-colors ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-[#111111] text-white'
                    : 'bg-neutral-100 text-[#111111] hover:bg-neutral-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {t('nav.adminPanel')}
              </Link>
            )}
          </nav>
        )}

        {/* Right CTA / Language Switcher / User Dropdown */}
        <div className="hidden md:flex items-center gap-3 lg:gap-4">
          {/* Desktop Language Switcher */}
          <LanguageSwitcher variant="navbar" />

          {!user ? (
            <>
              <Link
                to="/login"
                className="text-[14px] lg:text-[15px] font-medium text-[#111111] hover:text-black px-3.5 py-2 rounded-lg transition-colors"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/signup"
                className="text-xs sm:text-sm font-semibold text-white bg-[#111111] hover:bg-neutral-800 px-6 py-2.5 rounded-full transition-all duration-200 shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0"
              >
                {t('nav.joinNow')}
              </Link>
            </>
          ) : (
            <div className="relative flex items-center gap-2" ref={dropdownRef}>
              {renderStatusBadge('hidden sm:inline-flex')}

              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-2.5 rtl:pr-1.5 rtl:pl-2.5 rounded-full hover:bg-neutral-100 transition-colors focus:outline-none border border-neutral-200/80 cursor-pointer"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#111111] text-white flex items-center justify-center text-xs font-semibold overflow-hidden shadow-xs">
                  {initials}
                </div>
                <span className="text-sm font-medium text-[#111111]">
                  {isAdmin ? t('nav.status.admin') : t('nav.myAccount')}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-soft-lg border border-neutral-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-2.5 border-b border-neutral-100">
                    <p className="text-xs text-[#6B7280] font-medium">{t('nav.signedInAs')}</p>
                    <p className="text-sm font-medium text-[#111111] truncate force-ltr">
                      {profile?.full_name || user.email}
                    </p>
                    <div className="mt-1.5">
                      {renderStatusBadge()}
                    </div>
                  </div>

                  <div className="py-1">
                    {isApproved && (
                      <Link
                        to="/videos"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[#111111] hover:bg-neutral-50 transition-colors"
                      >
                        <PlaySquare className="w-4 h-4 text-[#6B7280]" />
                        {t('nav.videoLibrary')}
                      </Link>
                    )}

                    {!isApproved && (
                      <Link
                        to="/activate"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[#111111] hover:bg-neutral-50 transition-colors"
                      >
                        <CreditCard className="w-4 h-4 text-[#B8860B]" />
                        {t('nav.activateAccess')}
                      </Link>
                    )}

                    <Link
                      to="/account"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#111111] hover:bg-neutral-50 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-[#6B7280]" />
                      {t('nav.myAccount')}
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[#111111] hover:bg-neutral-50 transition-colors font-medium"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#111111]" />
                        {t('nav.adminDashboard')}
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-neutral-100 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('nav.logOut')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#111111] hover:bg-neutral-100 active:bg-neutral-200/70 transition-colors cursor-pointer"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Full-Width Mobile White Panel Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute left-0 right-0 top-full w-full bg-white border-b border-neutral-200 shadow-soft-lg px-[20px] pt-3 pb-6 space-y-2 z-50 max-h-[calc(100vh-70px)] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
          {/* Mobile Language Switcher at Top */}
          <LanguageSwitcher variant="mobile" />

          {user && (
            <div className="pb-3 mb-2 border-b border-neutral-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-[#6B7280]">{t('nav.signedInAs')}</p>
                <p className="text-sm font-semibold text-[#111111] truncate force-ltr">
                  {profile?.full_name || user.email}
                </p>
              </div>
              {renderStatusBadge('flex-shrink-0 py-1')}
            </div>
          )}

          {/* Core Navigation Links */}
          <button
            type="button"
            onClick={() => handleNavClick('lessons')}
            className="w-full min-h-[44px] flex items-center text-left rtl:text-right text-[16px] font-medium text-[#111111] hover:text-[#B8860B] active:bg-neutral-50 rounded-xl px-1 transition-colors cursor-pointer"
          >
            {t('nav.lessons')}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('how-it-works')}
            className="w-full min-h-[44px] flex items-center text-left rtl:text-right text-[16px] font-medium text-[#111111] hover:text-[#B8860B] active:bg-neutral-50 rounded-xl px-1 transition-colors cursor-pointer"
          >
            {t('nav.howItWorks')}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('reviews')}
            className="w-full min-h-[44px] flex items-center text-left rtl:text-right text-[16px] font-medium text-[#111111] hover:text-[#B8860B] active:bg-neutral-50 rounded-xl px-1 transition-colors cursor-pointer"
          >
            {t('nav.reviews')}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('faq')}
            className="w-full min-h-[44px] flex items-center text-left rtl:text-right text-[16px] font-medium text-[#111111] hover:text-[#B8860B] active:bg-neutral-50 rounded-xl px-1 transition-colors cursor-pointer"
          >
            {t('nav.faq')}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('contact')}
            className="w-full min-h-[44px] flex items-center text-left rtl:text-right text-[16px] font-medium text-[#111111] hover:text-[#B8860B] active:bg-neutral-50 rounded-xl px-1 transition-colors cursor-pointer"
          >
            {t('nav.contact')}
          </button>

          {user && (
            <div className="pt-2 border-t border-neutral-100 space-y-1">
              <Link
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full min-h-[44px] flex items-center gap-2 text-[15px] font-medium text-[#6B7280] hover:text-[#111111] px-1"
              >
                <UserIcon className="w-4 h-4" />
                <span>{t('nav.myAccount')}</span>
              </Link>

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full min-h-[44px] flex items-center gap-2 text-[15px] font-semibold text-[#111111] px-1"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t('nav.adminPanel')}</span>
                </Link>
              )}
            </div>
          )}

          {/* Bottom CTA Buttons */}
          <div className="pt-4 mt-2 border-t border-neutral-100 flex flex-col gap-3">
            {!user ? (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full min-h-[48px] flex items-center justify-center rounded-full border-[1.5px] border-[#D1D5DB] bg-white hover:bg-neutral-50 active:bg-neutral-100 text-[16px] font-semibold text-[#111111] transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full min-h-[52px] flex items-center justify-center rounded-full bg-[#111111] hover:bg-neutral-800 text-white text-[16px] font-semibold transition-colors shadow-soft"
                >
                  {t('nav.joinNow')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={isApproved ? '/videos' : '/payment'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full min-h-[52px] flex items-center justify-center rounded-full bg-[#111111] hover:bg-neutral-800 text-white text-[16px] font-semibold transition-colors shadow-soft"
                >
                  {isApproved ? t('nav.continueWatching') : t('nav.activateAccessCta')}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50/60 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('nav.logOut')}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
