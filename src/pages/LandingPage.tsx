import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { FreePreviewModal } from '../components/FreePreviewModal';
import { VideoCard } from '../components/VideoCard';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Settings, PublicVideo } from '../types';
import {
  MessageSquare,
  Sparkles,
  Heart,
  Star,
  ArrowRight,
  X,
  Mail,
  Phone,
  Film,
  CheckCircle2,
  ChevronDown,
  UserCheck,
  CreditCard,
  PlayCircle,
  ShieldCheck,
  Play,
  Crown,
  Compass,
  TrendingUp,
  Search,
  ChevronRight,
  ChevronLeft,
  Lock,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.startsWith('ar');

  const { user, profile, isApproved } = useAuth();
  const navigate = useNavigate();

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileSearch, setMobileSearch] = useState('');
  const [settings, setSettings] = useState<Settings>({
    rib: '007 780 0001234567890123 45',
    account_holder: 'Levelling Up Media',
    bank_name: 'Attijariwafa Bank',
    price: 499,
    contact_whatsapp: '+212600000000',
    contact_email: 'contact@levellingup.com',
  });

  const [lessons, setLessons] = useState<PublicVideo[]>([]);
  const [loadingLessons, setLoadingLessons] = useState<boolean>(true);
  const [previewVideo, setPreviewVideo] = useState<PublicVideo | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase.from('settings').select('*').maybeSingle();
        if (data && !error) {
          setSettings(data);
        }
      } catch (err) {
        console.error('[LandingPage] Error fetching settings:', err);
      }
    }

    async function loadLessons() {
      setLoadingLessons(true);
      try {
        const { data, error } = await supabase
          .from('public_videos')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[LandingPage] public_videos view not available, querying published videos:', error.message);
          const { data: fallbackData } = await supabase
            .from('videos')
            .select('id, title, description, thumbnail_path, duration, is_published, is_free_preview, created_at')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

          if (fallbackData) {
            setLessons(fallbackData as PublicVideo[]);
          }
        } else if (data) {
          setLessons(data as PublicVideo[]);
        }
      } catch (err: any) {
        console.error('[LandingPage] Error loading public lessons:', err);
      } finally {
        setLoadingLessons(false);
      }
    }

    loadSettings();
    loadLessons();
  }, []);

  const handleCardClick = (video: PublicVideo) => {
    if (video.is_free_preview) {
      setPreviewVideo(video);
      return;
    }

    if (!user) {
      navigate('/signup');
    } else if (!isApproved) {
      navigate('/payment');
    } else {
      navigate(`/videos/${video.id}`);
    }
  };

  const handleCtaClick = () => {
    if (!user) {
      navigate('/signup');
    } else if (!isApproved) {
      navigate('/payment');
    } else {
      navigate('/videos');
    }
  };

  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const steps = [
    {
      step: '01',
      title: t('landing.howItWorks.steps.step1Title'),
      desc: t('landing.howItWorks.steps.step1Desc'),
      icon: UserCheck,
    },
    {
      step: '02',
      title: t('landing.howItWorks.steps.step2Title'),
      desc: t('landing.howItWorks.steps.step2Desc'),
      icon: CreditCard,
    },
    {
      step: '03',
      title: t('landing.howItWorks.steps.step3Title'),
      desc: t('landing.howItWorks.steps.step3Desc'),
      icon: PlayCircle,
    },
  ];

  const reviews = [
    {
      id: 1,
      name: 'Youssef B.',
      city: isRtl ? 'الدار البيضاء' : 'Casablanca',
      quote: t('landing.reviews.review1'),
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      rating: 5,
    },
    {
      id: 2,
      name: 'Karim M.',
      city: isRtl ? 'الرباط' : 'Rabat',
      quote: t('landing.reviews.review2'),
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      rating: 5,
    },
    {
      id: 3,
      name: 'Amine R.',
      city: isRtl ? 'مراكش' : 'Marrakech',
      quote: t('landing.reviews.review3'),
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
      rating: 5,
    },
  ];

  const faqs = [
    { question: t('landing.faq.q1'), answer: t('landing.faq.a1') },
    { question: t('landing.faq.q2'), answer: t('landing.faq.a2') },
    { question: t('landing.faq.q3'), answer: t('landing.faq.a3') },
    { question: t('landing.faq.q4'), answer: t('landing.faq.a4') },
    { question: t('landing.faq.q5'), answer: t('landing.faq.a5') },
  ];

  const filteredMobileLessons = lessons.filter((l) =>
    l.title.toLowerCase().includes(mobileSearch.trim().toLowerCase())
  );
  const featuredMobileLesson =
    filteredMobileLessons.find((l) => (l as PublicVideo & { is_featured?: boolean }).is_featured) ||
    filteredMobileLessons[0] ||
    null;

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#111111] selection:bg-[#111111] selection:text-white scroll-smooth overflow-x-clip">
      {/* Sticky / Mobile-Transparent Navbar */}
      <Navbar onContactClick={() => setContactModalOpen(true)} />

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        {/* 1. HERO SECTION */}
        <section className="relative bg-gradient-to-br from-[#FAFAFA] via-[#F5F5F4] to-[#EEEDEC] overflow-hidden pb-6 md:pb-0">
          {/* Desktop B&W client portrait (>= 768px) */}
          <div
            className={`hidden md:block absolute inset-y-0 ${
              isRtl ? 'left-0 right-auto' : 'right-0 left-auto'
            } md:w-[48%] lg:w-[52%] xl:w-[50%] 2xl:max-w-[840px] pointer-events-none select-none`}
            style={{
              maskImage: isRtl
                ? 'linear-gradient(to left, transparent 0%, rgba(0, 0, 0, 0.5) 18%, black 38%)'
                : 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.5) 18%, black 38%)',
              WebkitMaskImage: isRtl
                ? 'linear-gradient(to left, transparent 0%, rgba(0, 0, 0, 0.5) 18%, black 38%)'
                : 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.5) 18%, black 38%)',
            }}
          >
            <picture className="block w-full h-full">
              <source srcSet="/images/hero.webp" type="image/webp" />
              <img
                src="/images/hero-fallback.jpg"
                alt="Portrait"
                width={1122}
                height={1402}
                {...({ fetchpriority: 'high' } as Record<string, string>)}
                loading="eager"
                decoding="sync"
                className="w-full h-full object-cover object-top grayscale contrast-[1.06]"
              />
            </picture>
            {/* Soft fade to light background on edge facing the text column */}
            <div
              className={`absolute inset-y-0 ${
                isRtl ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'
              } w-44 xl:w-56 from-white/95 via-[#F6F6F5]/75 to-transparent`}
              aria-hidden="true"
            />
            {/* Seamless fade into black feature bar at bottom */}
            <div
              className="hidden md:block absolute inset-x-0 bottom-0 h-28 xl:h-36 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/65 to-transparent"
              aria-hidden="true"
            />
          </div>

          {/* Mobile B&W client portrait (< 768px) */}
          <div
            className={`md:hidden absolute top-14 ${
              isRtl ? 'left-0 right-auto' : 'right-0 left-auto'
            } w-[60%] h-[530px] min-[400px]:h-[550px] pointer-events-none select-none overflow-hidden`}
            style={{
              maskImage: isRtl
                ? 'linear-gradient(to left, transparent 0%, rgba(0, 0, 0, 0.35) 22%, black 42%)'
                : 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.35) 22%, black 42%)',
              WebkitMaskImage: isRtl
                ? 'linear-gradient(to left, transparent 0%, rgba(0, 0, 0, 0.35) 22%, black 42%)'
                : 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.35) 22%, black 42%)',
            }}
          >
            <picture
              className="block w-full h-full"
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 78%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 12%, black 78%, transparent 100%)',
              }}
            >
              <source srcSet="/images/hero.webp" type="image/webp" />
              <img
                src="/images/hero-fallback.jpg"
                alt="Portrait"
                width={1122}
                height={1402}
                {...({ fetchpriority: 'high' } as Record<string, string>)}
                loading="eager"
                decoding="sync"
                className="w-full h-full object-cover object-[33%_0%] grayscale contrast-[1.06]"
              />
            </picture>
          </div>

          {/* Vertical "Scroll down" side label (hidden on mobile < 768px) */}
          <button
            type="button"
            onClick={() => handleScrollToSection('lessons')}
            className={`hidden md:flex flex-col items-center gap-3 absolute ${
              isRtl ? 'right-3 lg:right-5 xl:right-6' : 'left-3 lg:left-5 xl:left-6'
            } bottom-10 z-20 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6B7280] hover:text-[#111111] transition-colors cursor-pointer`}
            aria-label="Scroll down to lessons"
          >
            <span className="[writing-mode:vertical-rl] rotate-180">{t('landing.hero.scrollDown')}</span>
            <span className="w-[1px] h-10 bg-[#B8860B]/70" />
          </button>

          {/* Hero Content Container */}
          <div className="relative z-10 max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 md:pl-14 lg:pl-16 rtl:md:pl-6 rtl:md:pr-14 rtl:lg:pr-16 xl:px-8 pt-20 pb-4 md:pt-14 md:pb-16 lg:pt-20 lg:pb-24">
            <div className="space-y-4 md:space-y-6">
              {/* Mobile Pill: "Premium Knowledge" */}
              <div className="md:hidden inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBEFCB] text-[#8C6103] border border-[#B8860B]/20 text-[11px] font-semibold tracking-wide shadow-2xs">
                <Crown className="w-3.5 h-3.5 text-[#B8860B] flex-shrink-0" />
                <span>{t('landing.hero.pillMobile')}</span>
              </div>

              {/* Desktop Pill: "PREMIUM KNOWLEDGE" */}
              <div className="hidden md:inline-flex items-center gap-3">
                <span className="h-[1px] w-8 bg-[#B8860B]/80" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B8860B]">
                  {t('landing.hero.pill')}
                </span>
                <span className="h-[1px] w-8 bg-[#B8860B]/80" aria-hidden="true" />
              </div>

              {/* Headline */}
              <h1 className="max-w-[58%] md:max-w-[750px] xl:max-w-[760px] text-[28px] min-[410px]:text-[30px] md:text-[42px] lg:text-[48px] font-bold tracking-[-0.03em] md:tracking-[-0.02em] text-[#111111] leading-[1.12] md:leading-[1.1]">
                {t('landing.hero.headline')}{' '}
                <span className="md:whitespace-nowrap">
                  <span className="md:relative md:inline-block bg-gradient-to-r from-[#9A6E04] via-[#C99B2C] to-[#8C6103] bg-clip-text text-transparent underline decoration-[#B8860B]/60 decoration-2 underline-offset-4 md:no-underline md:pb-0.5">
                    {t('landing.hero.headlineGold')}
                    <span
                      className="hidden md:block absolute left-0 bottom-0 w-full h-[2.5px] bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#B8860B]/40 rounded-full"
                      aria-hidden="true"
                    />
                  </span>
                  .
                </span>
              </h1>

              {/* Subtitle */}
              <p className="max-w-[58%] md:max-w-lg text-[14px] md:text-[17px] text-[#6B7280] font-normal leading-[1.45] md:leading-relaxed">
                {t('landing.hero.subtitle')}
              </p>

              {/* CTA Buttons */}
              <div className="pt-1 flex flex-wrap items-center gap-2.5 sm:gap-4">
                <button
                  type="button"
                  onClick={handleCtaClick}
                  className="w-auto min-h-[44px] md:h-auto whitespace-nowrap inline-flex items-center justify-center gap-2 px-5 py-2.5 md:px-8 md:py-4 rounded-full bg-[#111111] hover:bg-neutral-800 active:bg-neutral-900 text-white text-[13.5px] min-[375px]:text-[14px] md:text-[15px] font-semibold tracking-wide transition-all duration-200 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 group cursor-pointer"
                >
                  <span>
                    {isApproved
                      ? t('landing.hero.ctaContinue')
                      : user
                      ? t('landing.hero.ctaActivate')
                      : t('landing.hero.ctaJoin')}
                  </span>
                  <ArrowRight className={`w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-200 ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                </button>

                <button
                  type="button"
                  onClick={() => handleScrollToSection('lessons')}
                  className="w-auto min-h-[44px] md:h-auto whitespace-nowrap inline-flex items-center justify-center gap-2 px-4 py-2.5 md:px-7 md:py-3.5 rounded-full bg-white hover:bg-neutral-50 active:bg-neutral-100 text-[#111111] text-[13.5px] min-[375px]:text-[14px] md:text-[15px] font-semibold border border-neutral-200/90 shadow-2xs hover:shadow-soft transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group"
                >
                  <span className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-[#111111]/5 group-hover:bg-[#B8860B]/15 flex items-center justify-center transition-colors">
                    <Play className="w-3 h-3 fill-current text-[#111111] ml-0.5" />
                  </span>
                  <span>{t('landing.hero.ctaSeeLesson')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Hero Bottom Floating Feature Card (< 768px ONLY) */}
          <div className="md:hidden relative z-20 max-w-[1200px] mx-auto px-[20px] mt-4">
            <div className="rounded-2xl bg-white border border-neutral-200/80 shadow-soft-lg py-4 px-2 grid grid-cols-3 divide-x rtl:divide-x-reverse divide-neutral-100 text-center">
              <div className="flex flex-col items-center gap-1.5 px-1.5">
                <Crown className="w-5 h-5 text-[#B8860B] stroke-[1.6]" />
                <span className="text-[11px] min-[375px]:text-[12px] font-semibold text-[#111111] leading-tight">
                  {t('landing.featureCard.premium')}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 px-1.5">
                <Compass className="w-5 h-5 text-[#B8860B] stroke-[1.6]" />
                <span className="text-[11px] min-[375px]:text-[12px] font-semibold text-[#111111] leading-tight">
                  {t('landing.featureCard.understanding')}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 px-1.5">
                <TrendingUp className="w-5 h-5 text-[#B8860B] stroke-[1.6]" />
                <span className="text-[11px] min-[375px]:text-[12px] font-semibold text-[#111111] leading-tight">
                  {t('landing.featureCard.growth')}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. BLACK FEATURE BAR (Desktop >= 768px only) */}
        <section
          className="hidden md:block bg-[#0F0F0F] text-white border-b border-neutral-800"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 lg:px-8 py-6 sm:py-7">
            <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-fr gap-x-3 gap-y-5 sm:gap-6 lg:gap-8">
              <div className="flex items-start gap-2.5 sm:gap-3.5 h-full">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#B8860B]/35 bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0 text-[#C99B2C] mt-0.5">
                  <Crown className="w-4 h-4 stroke-[1.6]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-medium tracking-tight sm:tracking-wide text-white block leading-tight">
                    {t('landing.featureBar.premium')}
                  </span>
                  <span className="text-[12px] text-neutral-400 block mt-1 leading-snug">
                    {t('landing.featureBar.premiumSub')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3.5 h-full">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#B8860B]/35 bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0 text-[#C99B2C] mt-0.5">
                  <Compass className="w-4 h-4 stroke-[1.6]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-medium tracking-tight sm:tracking-wide text-white block leading-tight">
                    {t('landing.featureBar.understanding')}
                  </span>
                  <span className="text-[12px] text-neutral-400 block mt-1 leading-snug">
                    {t('landing.featureBar.understandingSub')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3.5 h-full">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#B8860B]/35 bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0 text-[#C99B2C] mt-0.5">
                  <ShieldCheck className="w-4 h-4 stroke-[1.6]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-medium tracking-tight sm:tracking-wide text-white block leading-tight">
                    {t('landing.featureBar.stronger')}
                  </span>
                  <span className="text-[12px] text-neutral-400 block mt-1 leading-snug">
                    {t('landing.featureBar.strongerSub')}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3.5 h-full">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#B8860B]/35 bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0 text-[#C99B2C] mt-0.5">
                  <TrendingUp className="w-4 h-4 stroke-[1.6]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-medium tracking-tight sm:tracking-wide text-white block leading-tight">
                    {t('landing.featureBar.growth')}
                  </span>
                  <span className="text-[12px] text-neutral-400 block mt-1 leading-snug">
                    {t('landing.featureBar.growthSub')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. LESSONS SECTION */}
        <section id="lessons" className="relative py-12 md:py-24 scroll-mt-20 bg-white">
          {/* Vertical editorial side text on desktop only */}
          <div
            className={`hidden xl:flex flex-col items-center gap-3 absolute ${
              isRtl ? 'left-6' : 'right-6'
            } top-20 z-10 text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-400 pointer-events-none select-none`}
            aria-hidden="true"
          >
            <span className="w-[1px] h-10 bg-[#B8860B]/50" />
            <span className="[writing-mode:vertical-rl]">{t('landing.lessons.videoCurriculum')}</span>
          </div>

          <div className="max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 lg:px-8">
            {/* MOBILE LESSONS LAYOUT (< 768px) */}
            <div className="md:hidden">
              <div>
                <h2 className="text-[36px] font-bold tracking-tight text-[#111111] leading-[1.1]">
                  {t('landing.lessons.mobileTitle')}
                </h2>
                <p className="text-[15px] text-[#6B7280] mt-2 leading-relaxed">
                  {t('landing.lessons.mobileSubtitle')}
                </p>
              </div>

              {/* Rounded Search Bar */}
              <div className="relative mt-5 mb-6">
                <Search className="w-4 h-4 text-[#6B7280] absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  placeholder={t('landing.lessons.searchPlaceholder')}
                  aria-label="Search lessons"
                  className="w-full h-[46px] pl-11 pr-10 rtl:pl-10 rtl:pr-11 rounded-full bg-[#F5F5F5] border border-neutral-200/80 text-[14px] text-[#111111] placeholder:text-[#6B7280] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                />
                {mobileSearch && (
                  <button
                    type="button"
                    onClick={() => setMobileSearch('')}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-[#6B7280] hover:text-[#111111] absolute right-2 rtl:right-auto rtl:left-2 top-1/2 -translate-y-1/2 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {loadingLessons ? (
                <div className="space-y-4">
                  <div className="w-full aspect-[16/10] rounded-[20px] bg-neutral-200 animate-pulse" />
                  {[1, 2, 3].map((sk) => (
                    <div
                      key={sk}
                      className="flex items-center gap-3.5 p-3 rounded-2xl border border-neutral-200/80 bg-white animate-pulse"
                    >
                      <div className="w-[88px] h-[72px] rounded-[12px] bg-neutral-200 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="w-3/4 h-4 rounded bg-neutral-200" />
                        <div className="w-1/2 h-3 rounded bg-neutral-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : lessons.length === 0 ? (
                <div className="bg-[#FAFAFA] rounded-3xl border border-neutral-200/80 p-8 text-center shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto text-[#111111] mb-3">
                    <Film className="w-6 h-6 text-[#6B7280]" />
                  </div>
                  <h3 className="text-base font-bold text-[#111111]">{t('landing.lessons.comingSoon')}</h3>
                  <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
                    {t('landing.lessons.comingSoonDesc')}
                  </p>
                </div>
              ) : filteredMobileLessons.length === 0 ? (
                <div className="bg-[#FAFAFA] rounded-2xl border border-neutral-200/80 p-6 text-center">
                  <p className="text-sm font-semibold text-[#111111]">{t('landing.lessons.noMatch')}</p>
                  <p className="text-xs text-[#6B7280] mt-1">
                    {t('landing.lessons.noMatchDesc', { query: mobileSearch })}
                  </p>
                </div>
              ) : (
                <div>
                  {featuredMobileLesson && (
                    <div
                      onClick={() => handleCardClick(featuredMobileLesson)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleCardClick(featuredMobileLesson);
                      }}
                      className="relative aspect-[16/10] w-full rounded-[20px] overflow-hidden shadow-soft-lg bg-neutral-900 cursor-pointer group"
                    >
                      {featuredMobileLesson.thumbnail_path ? (
                        <img
                          src={featuredMobileLesson.thumbnail_path}
                          alt={featuredMobileLesson.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-600">
                          <Film className="w-10 h-10 opacity-40" />
                        </div>
                      )}

                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 pointer-events-none"
                        aria-hidden="true"
                      />

                      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-10">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBEFCB] text-[#8C6103] border border-[#B8860B]/30 text-[11px] font-bold shadow-xs">
                          <Sparkles className="w-3 h-3 text-[#B8860B]" />
                          <span>{t('landing.lessons.featured')}</span>
                        </span>

                        {!isApproved && !featuredMobileLesson.is_free_preview && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium">
                            <Lock className="w-3 h-3 text-[#FBEFCB]" />
                            <span className="force-ltr">{featuredMobileLesson.duration || '12 min'}</span>
                          </span>
                        )}
                      </div>

                      <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-3 z-10">
                        <div className="min-w-0">
                          <h3 className="text-[18px] font-bold text-white leading-snug line-clamp-1">
                            {featuredMobileLesson.title}
                          </h3>
                          <p className="text-[12px] text-neutral-200 line-clamp-2 mt-0.5 leading-relaxed">
                            {featuredMobileLesson.description || ''}
                          </p>
                        </div>

                        <span className="w-11 h-11 rounded-full bg-white text-[#111111] flex items-center justify-center flex-shrink-0 shadow-md">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Price Card / Member Access Card */}
                  <div className="my-5">
                    {isApproved ? (
                      <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-neutral-200/90 shadow-2xs flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 mb-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{t('landing.lessons.memberAccess')}</span>
                          </span>
                          <p className="text-sm font-bold text-[#111111] truncate">
                            {t('landing.lessons.welcomeBack')}{profile?.full_name ? `, ${profile.full_name}` : ''}
                          </p>
                        </div>
                        <Link
                          to="/videos"
                          className="h-[44px] px-4 rounded-full bg-[#111111] text-white text-xs font-semibold inline-flex items-center gap-1.5 flex-shrink-0"
                        >
                          <span>{t('landing.lessons.watchAll')}</span>
                          <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                        </Link>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-neutral-200/90 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FBEFCB] text-[#8C6103] mb-1">
                              <Sparkles className="w-3 h-3 text-[#B8860B]" />
                              <span>{t('landing.lessons.fullMembership')}</span>
                            </div>
                            <div className="text-lg font-bold text-[#111111] leading-tight">
                              <span className="force-ltr">{settings.price} MAD</span>{' '}
                              <span className="text-xs font-normal text-[#6B7280]">{t('landing.lessons.oneTime')}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCtaClick}
                          className="w-full h-[48px] rounded-full bg-[#111111] hover:bg-neutral-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                          <span>{t('landing.lessons.unlockAll')}</span>
                          <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* List of Lessons */}
                  <div className="space-y-3">
                    {filteredMobileLessons.map((lesson) => {
                      const isLocked = !isApproved && !lesson.is_free_preview;
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => handleCardClick(lesson)}
                          className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-white border border-neutral-200/85 shadow-2xs hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left rtl:text-right cursor-pointer"
                        >
                          <div className="relative w-[88px] h-[72px] rounded-[12px] overflow-hidden bg-neutral-900 flex-shrink-0">
                            {lesson.thumbnail_path ? (
                              <img
                                src={lesson.thumbnail_path}
                                alt={lesson.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-500">
                                <Film className="w-5 h-5 opacity-50" />
                              </div>
                            )}

                            {isLocked && (
                              <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center">
                                <Lock className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-bold text-[#111111] truncate leading-snug">
                              {lesson.title}
                            </h3>
                            <p className="text-[13px] text-[#6B7280] mt-0.5 truncate">
                              <span className="force-ltr">{lesson.duration || '12 min'}</span> &middot; {t('landing.lessons.lesson')}
                            </p>
                          </div>

                          {isRtl ? (
                            <ChevronLeft className="w-5 h-5 text-[#6B7280] flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-[#6B7280] flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* DESKTOP LESSONS LAYOUT (>= 768px) */}
            <div className="hidden md:block">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-12 pb-8 border-b border-neutral-200/70">
                <div className="max-w-2xl space-y-3">
                  <div className="inline-flex items-center gap-3">
                    <span className="h-[1px] w-6 bg-[#B8860B]/80" aria-hidden="true" />
                    <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#B8860B]">
                      {t('landing.lessons.desktopLabel')}
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-[#111111] leading-[1.15]">
                    {t('landing.lessons.desktopTitle')}
                  </h2>
                  <p className="text-sm sm:text-[16px] text-[#6B7280] leading-relaxed max-w-xl">
                    {t('landing.lessons.desktopSubtitle')}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      isApproved ? navigate('/videos') : handleScrollToSection('lessons-catalog')
                    }
                    className="w-full sm:w-auto h-[52px] sm:h-auto inline-flex items-center justify-center gap-2 px-7 sm:py-3.5 rounded-full bg-[#111111] hover:bg-neutral-800 text-white text-sm font-semibold tracking-wide transition-all shadow-soft hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group"
                  >
                    <span>{t('landing.lessons.exploreCollection')}</span>
                    <ArrowRight className={`w-4 h-4 transition-transform ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Real Catalog Sub-container */}
              <div id="lessons-catalog" className="scroll-mt-24">
                {isApproved ? (
                  <div className="mb-6 md:mb-10 p-[20px] sm:p-8 rounded-3xl bg-[#FAFAFA] border border-neutral-200/90 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#111111] text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-xs">
                        {(profile?.full_name || user?.email || 'M').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('landing.lessons.activeMembership')}</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight truncate">
                          {t('landing.lessons.welcomeBack')}{profile?.full_name ? `, ${profile.full_name}` : ''}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#6B7280]">
                          {t('landing.lessons.welcomeBackDesc')}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <Link
                        to="/videos"
                        className="w-full sm:w-auto min-h-[52px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#111111] hover:bg-neutral-800 text-white text-sm font-semibold tracking-wide transition-all shadow-soft hover:-translate-y-0.5 active:translate-y-0 group"
                      >
                        <span>{t('landing.lessons.continueWatching')}</span>
                        <ArrowRight className={`w-4 h-4 transition-transform ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 md:mb-10 p-[20px] sm:p-8 rounded-3xl bg-[#FAFAFA] border border-neutral-200/90 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B8860B]/10 text-[#B8860B] border border-[#B8860B]/20">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t('landing.lessons.allInclusiveAccess')}</span>
                      </div>
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#111111] tracking-tight">
                        <span className="force-ltr">{settings.price} MAD</span>
                        <span className="text-[#6B7280] text-sm sm:text-base font-normal"> {t('landing.lessons.oneTimeAccess')}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#6B7280]">
                        {t('landing.lessons.paySecurely')}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleCtaClick}
                        className="w-full sm:w-auto min-h-[52px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#111111] hover:bg-neutral-800 text-white text-sm font-semibold tracking-wide transition-all shadow-soft hover:-translate-y-0.5 active:translate-y-0 group cursor-pointer"
                      >
                        <span>{t('landing.lessons.unlockAllLessons')}</span>
                        <ArrowRight className={`w-4 h-4 transition-transform ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Videos Grid */}
                {loadingLessons ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                    {[1, 2, 3].map((sk) => (
                      <div
                        key={sk}
                        className="bg-white rounded-2xl border border-neutral-200/90 p-[20px] md:p-4 shadow-soft animate-pulse space-y-4"
                      >
                        <div className="w-full aspect-video rounded-2xl bg-neutral-200" />
                        <div className="space-y-2">
                          <div className="w-3/4 h-5 rounded-lg bg-neutral-200" />
                          <div className="w-full h-3.5 rounded bg-neutral-100" />
                          <div className="w-2/3 h-3.5 rounded bg-neutral-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : lessons.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-neutral-200/80 p-[20px] py-10 md:p-12 text-center shadow-soft max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-[#111111] mb-3">
                      <Film className="w-6 h-6 text-[#6B7280]" />
                    </div>
                    <h3 className="text-base font-bold text-[#111111]">{t('landing.lessons.comingSoonDesktop')}</h3>
                    <p className="text-xs sm:text-sm text-[#6B7280] mt-1.5 leading-relaxed">
                      {t('landing.lessons.comingSoonDesktopDesc')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 items-stretch">
                    {lessons.map((lesson, idx) => (
                      <VideoCard
                        key={lesson.id}
                        video={lesson}
                        index={idx}
                        isApproved={isApproved}
                        onSelect={(v) => handleCardClick(v as PublicVideo)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 4. HOW IT WORKS (3 Steps) */}
        <section id="how-it-works" className="py-14 md:py-24 scroll-mt-20 border-t border-neutral-200/70 bg-[#FAFAFA]">
          <div className="max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-8 md:mb-16">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B8860B]/10 text-[#B8860B] border border-[#B8860B]/20 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('landing.howItWorks.pill')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111111]">
                {t('landing.howItWorks.title')}
              </h2>
              <p className="text-sm sm:text-[16px] text-[#6B7280] mt-2 font-normal">
                {t('landing.howItWorks.subtitle')}
              </p>
            </div>

            <div className="relative">
              <div
                className="hidden md:block absolute top-10 left-[16%] right-[16%] h-[2px] bg-neutral-200/80 -z-0"
                aria-hidden="true"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 items-stretch relative z-10">
                {steps.map((st, idx) => {
                  const Icon = st.icon;
                  return (
                    <div
                      key={st.step}
                      className="bg-white rounded-2xl border border-neutral-200/80 p-[20px] md:p-8 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-5 md:mb-6">
                          <span className="w-11 h-11 rounded-2xl bg-[#111111] text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-neutral-800 transition-colors">
                            {st.step}
                          </span>
                          <div className="w-10 h-10 rounded-xl bg-[#B8860B]/10 text-[#B8860B] flex items-center justify-center">
                            <Icon className="w-5 h-5" />
                          </div>
                        </div>

                        <h3 className="text-lg lg:text-[19px] font-bold text-[#111111] tracking-tight mb-2 md:mb-2.5">
                          {st.title}
                        </h3>
                        <p className="text-sm sm:text-[15px] text-[#6B7280] leading-relaxed">
                          {st.desc}
                        </p>
                      </div>

                      <div className="pt-4 md:pt-5 mt-5 md:mt-6 border-t border-neutral-100 flex items-center gap-1.5 text-xs font-semibold text-[#B8860B]">
                        <span>{t('landing.howItWorks.stepOf', { current: idx + 1, total: 3 })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 5. THREE CORE PILLARS */}
        <section className="py-14 md:py-24 border-t border-neutral-200/70 bg-white">
          <div className="max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-8 md:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111111]">
                {t('landing.pillars.title')}
              </h2>
              <p className="text-sm sm:text-[16px] text-[#6B7280] mt-2 font-normal">
                {t('landing.pillars.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 items-stretch">
              <div className="h-full p-[20px] md:p-8 rounded-2xl border border-neutral-200/80 bg-white shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#B8860B]/10 flex items-center justify-center mb-5 md:mb-6 text-[#B8860B] group-hover:scale-110 transition-transform duration-200">
                    <MessageSquare className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <h3 className="text-[19px] lg:text-[20px] font-bold text-[#111111] tracking-tight mb-2 md:mb-2.5">
                    {t('landing.pillars.language.title')}
                  </h3>
                  <p className="text-[15px] lg:text-[16px] text-[#111111] font-medium leading-relaxed mb-2">
                    {t('landing.pillars.language.lead')}
                  </p>
                  <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                    {t('landing.pillars.language.desc')}
                  </p>
                </div>
              </div>

              <div className="h-full p-[20px] md:p-8 rounded-2xl border border-neutral-200/80 bg-white shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#B8860B]/10 flex items-center justify-center mb-5 md:mb-6 text-[#B8860B] group-hover:scale-110 transition-transform duration-200">
                    <Sparkles className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <h3 className="text-[19px] lg:text-[20px] font-bold text-[#111111] tracking-tight mb-2 md:mb-2.5">
                    {t('landing.pillars.logic.title')}
                  </h3>
                  <p className="text-[15px] lg:text-[16px] text-[#111111] font-medium leading-relaxed mb-2">
                    {t('landing.pillars.logic.lead')}
                  </p>
                  <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                    {t('landing.pillars.logic.desc')}
                  </p>
                </div>
              </div>

              <div className="h-full p-[20px] md:p-8 rounded-2xl border border-neutral-200/80 bg-white shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#B8860B]/10 flex items-center justify-center mb-5 md:mb-6 text-[#B8860B] group-hover:scale-110 transition-transform duration-200">
                    <Heart className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <h3 className="text-[19px] lg:text-[20px] font-bold text-[#111111] tracking-tight mb-2 md:mb-2.5">
                    {t('landing.pillars.emotions.title')}
                  </h3>
                  <p className="text-[15px] lg:text-[16px] text-[#111111] font-medium leading-relaxed mb-2">
                    {t('landing.pillars.emotions.lead')}
                  </p>
                  <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                    {t('landing.pillars.emotions.desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. REVIEWS SECTION */}
        <section id="reviews" className="py-14 md:py-24 scroll-mt-20 bg-[#FAFAFA] border-t border-neutral-200/70">
          <div className="max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-14 gap-3 sm:gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B8860B]/10 text-[#B8860B] border border-[#B8860B]/20 mb-3">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{t('landing.reviews.pill')}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111111]">
                  {t('landing.reviews.title')}
                </h2>
                <p className="text-sm sm:text-[15px] text-[#6B7280] mt-1.5">
                  {t('landing.reviews.subtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#111111] hover:text-neutral-700 transition-colors group cursor-pointer self-start sm:self-auto"
              >
                <span>{t('landing.reviews.shareReview')}</span>
                <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isRtl ? 'rotate-180 group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5'}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 items-stretch">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="h-full p-[20px] md:p-8 rounded-2xl border border-neutral-200/80 bg-white shadow-soft flex flex-col justify-between group hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div>
                    <div className="flex items-center gap-1 text-[#B8860B] mb-4 md:mb-5">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current text-[#B8860B]" />
                      ))}
                    </div>

                    <p className="text-[16px] sm:text-[17px] text-[#111111] leading-relaxed mb-5 md:mb-6 font-normal">
                      &ldquo;{rev.quote}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-4 md:pt-5 border-t border-neutral-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={rev.avatar}
                        alt={rev.name}
                        className="w-10 h-10 rounded-full object-cover border border-neutral-200 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-[#111111] block truncate">
                          {rev.name}
                        </span>
                        <span className="text-xs text-[#6B7280] block truncate">{rev.city}</span>
                      </div>
                    </div>

                    <span className="flex-shrink-0 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {t('landing.reviews.verifiedMember')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. FAQ ACCORDION */}
        <section id="faq" className="py-14 md:py-24 scroll-mt-20 bg-white border-t border-neutral-200/70">
          <div className="max-w-[840px] w-full mx-auto px-[20px] sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-8 sm:mb-16">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B8860B]/10 text-[#B8860B] border border-[#B8860B]/20 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('landing.faq.pill')}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111111]">
                {t('landing.faq.title')}
              </h2>
              <p className="text-sm sm:text-[16px] text-[#6B7280] mt-2 font-normal">
                {t('landing.faq.subtitle')}
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs transition-all duration-200 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full min-h-[56px] p-[20px] sm:p-6 text-left rtl:text-right flex items-center justify-between gap-4 focus:outline-none cursor-pointer"
                      aria-expanded={isOpen}
                    >
                      <span className="text-[15px] sm:text-[17px] font-bold text-[#111111] tracking-tight">
                        {faq.question}
                      </span>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
                          isOpen ? 'bg-[#111111] text-white rotate-180' : 'bg-neutral-100 text-[#6B7280]'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-[20px] pb-[20px] sm:px-6 sm:pb-6 text-sm text-[#6B7280] leading-relaxed border-t border-neutral-100 pt-3.5 animate-in fade-in duration-200">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 8. FINAL CTA BANNER */}
        <section className="py-14 md:py-24 bg-[#FAFAFA] border-t border-neutral-200/70">
          <div className="max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-[#111111] text-white p-[20px] py-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-2xl">
              <div
                className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#B8860B]/18 rounded-full blur-3xl pointer-events-none"
                aria-hidden="true"
              />
              <div
                className="absolute -left-20 -top-20 w-72 h-72 bg-white/5 rounded-full blur-2xl pointer-events-none"
                aria-hidden="true"
              />

              <div className="relative z-10 max-w-2xl space-y-4 sm:space-y-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-neutral-200 border border-white/15">
                  <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span>{t('landing.cta.pill')}</span>
                </div>

                <h2 className="text-[28px] sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                  {t('landing.cta.title')}
                </h2>

                <p className="text-sm sm:text-base lg:text-[17px] text-neutral-300 leading-relaxed max-w-xl">
                  {t('landing.cta.subtitle')}
                </p>

                <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={handleCtaClick}
                    className="w-full sm:w-auto h-[52px] sm:h-auto inline-flex items-center justify-center gap-2.5 px-8 sm:py-4 rounded-full bg-white hover:bg-neutral-100 text-[#111111] text-[16px] sm:text-base font-semibold shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer group"
                  >
                    <span>
                      {isApproved
                        ? t('landing.cta.ctaContinue')
                        : user
                        ? t('landing.cta.ctaActivate')
                        : t('landing.cta.ctaJoin')}
                    </span>
                    <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setContactModalOpen(true)}
                    className="w-full sm:w-auto h-[52px] sm:h-auto inline-flex items-center justify-center gap-2 px-6 sm:py-4 rounded-full bg-white/10 hover:bg-white/15 text-white text-[15px] sm:text-sm font-semibold border border-white/15 transition-colors cursor-pointer"
                  >
                    <span>{t('landing.cta.contactUs')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. GET IN TOUCH SECTION */}
        <section id="contact" className="py-14 md:py-20 scroll-mt-20 bg-white border-t border-neutral-200/70">
          <div className="max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-neutral-200/90 bg-[#FAFAFA] p-[20px] sm:p-12 shadow-soft flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 text-center md:text-left rtl:md:text-right">
              <div className="space-y-2 max-w-xl">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
                  {t('landing.contact.title')}
                </h2>
                <p className="text-sm sm:text-base text-[#6B7280]">
                  {t('landing.contact.subtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="w-full sm:w-auto h-[52px] sm:h-auto inline-flex items-center justify-center px-8 sm:py-3.5 rounded-full bg-[#111111] hover:bg-neutral-800 text-white text-[16px] sm:text-sm font-semibold tracking-wide transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0 cursor-pointer"
              >
                {t('landing.contact.button')}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Free Preview Video Modal */}
      {previewVideo && (
        <FreePreviewModal
          video={previewVideo}
          onClose={() => setPreviewVideo(null)}
        />
      )}

      {/* Contact Support Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-neutral-200 max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#111111]">{t('landing.contact.modalTitle')}</h3>
              <button
                type="button"
                onClick={() => setContactModalOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[#6B7280] hover:text-[#111111] hover:bg-neutral-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-[#6B7280]">
              {t('landing.contact.modalDesc')}
            </p>

            <div className="space-y-3 pt-2">
              <a
                href={`https://wa.me/${settings.contact_whatsapp?.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[52px] flex items-center gap-3 p-3.5 rounded-xl border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 transition-colors text-sm font-semibold text-[#111111]"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-[#6B7280] font-normal">{t('landing.contact.whatsapp')}</div>
                  <div className="truncate force-ltr">{settings.contact_whatsapp}</div>
                </div>
              </a>

              <a
                href={`mailto:${settings.contact_email}`}
                className="w-full min-h-[52px] flex items-center gap-3 p-3.5 rounded-xl border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 transition-colors text-sm font-semibold text-[#111111]"
              >
                <div className="w-9 h-9 rounded-lg bg-neutral-100 text-[#111111] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-[#6B7280] font-normal">{t('landing.contact.email')}</div>
                  <div className="truncate force-ltr">{settings.contact_email}</div>
                </div>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setContactModalOpen(false)}
              className="w-full min-h-[44px] py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm font-semibold text-[#111111] transition-colors cursor-pointer"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer onContactClick={() => setContactModalOpen(true)} />
    </div>
  );
};
