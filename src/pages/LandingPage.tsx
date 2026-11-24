import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Lock,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
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
        // Query the secure public_videos view (which excludes video_path for public safety)
        const { data, error } = await supabase
          .from('public_videos')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[LandingPage] public_videos view not available, querying published videos:', error.message);
          // Fallback if view migration has not run yet in DB
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

  // Card click routing based on authentication & approval status
  const handleCardClick = (video: PublicVideo) => {
    // If it's a free preview video, let anyone watch it in the preview modal
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

  // How it works 3 steps
  const steps = [
    {
      step: '01',
      title: 'Create your account',
      desc: 'Sign up in under 30 seconds with your email and password. No credit card required to start.',
      icon: UserCheck,
    },
    {
      step: '02',
      title: 'Activate your access by bank transfer',
      desc: 'Send a Moroccan bank transfer (RIB), upload your receipt screenshot, and get verified.',
      icon: CreditCard,
    },
    {
      step: '03',
      title: 'Watch every lesson, anytime',
      desc: 'Instant lifetime access to the full video curriculum, case studies, and future updates.',
      icon: PlayCircle,
    },
  ];

  // Reviews
  const reviews = [
    {
      id: 1,
      name: 'Youssef B.',
      city: 'Casablanca',
      quote:
        'Levelling Up completely shifted my paradigm. I used to overreact and get defensive; now I communicate with calm clarity and self-respect. It changed how I handle relationships.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      rating: 5,
    },
    {
      id: 2,
      name: 'Karim M.',
      city: 'Rabat',
      quote:
        'Finally, an authentic program without the cringey pickup nonsense. Direct, psychologically sound principles for modern men who want healthy, high-standard connections.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      rating: 5,
    },
    {
      id: 3,
      name: 'Amine R.',
      city: 'Marrakech',
      quote:
        'The best investment I have made in my personal development this year. The lessons on decoding subtext and emotional grounding are pure gold. Highly recommended.',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
      rating: 5,
    },
  ];

  // FAQ Items
  const faqs = [
    {
      question: 'How do I pay for the membership?',
      answer:
        'Payment is made securely via Moroccan bank transfer (RIB). When you create an account, you receive our verified banking coordinates (account holder name, RIB number, Attijariwafa Bank) along with a unique reference code. Complete the transfer through your banking application or bank branch, upload the receipt screenshot on your activation page, and submit.',
    },
    {
      question: 'How long does access approval take?',
      answer:
        'Our administration team verifies incoming payments throughout the day. Approval typically takes between a few minutes to a few hours (maximum 24 hours). The moment your transfer is approved, your account status updates automatically and all video lessons unlock immediately.',
    },
    {
      question: 'Can I watch the lessons on my mobile phone?',
      answer:
        'Yes, 100%. The Levelling Up platform is built mobile-first. It runs flawlessly on smartphones, tablets, laptops, and desktop computers. You can log in from Safari, Chrome, or any modern mobile browser with full-screen playback and high-definition streaming.',
    },
    {
      question: 'Is this a recurring subscription or a one-time payment?',
      answer:
        'It is a 100% one-time payment. There are no recurring monthly charges, automatic card renewals, or hidden fees. Once you unlock access, you receive permanent lifetime access to all lessons in the library, including new releases added in the future.',
    },
    {
      question: 'How do I contact support if I have questions?',
      answer:
        'Our team is available directly via WhatsApp and email. You can tap the "Contact" button in the navigation or footer at any time to open a direct support conversation with our team.',
    },
  ];

  // Mobile filtered lessons for Lessons search bar
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
          {/* Desktop Right-aligned B&W client portrait (>= 768px) */}
          <div
            className="hidden md:block absolute inset-y-0 right-0 md:w-[48%] lg:w-[52%] xl:w-[50%] 2xl:max-w-[840px] pointer-events-none select-none"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.5) 18%, black 38%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.5) 18%, black 38%)',
            }}
          >
            <picture className="block w-full h-full">
              <source srcSet="/images/hero.webp" type="image/webp" />
              <img
                src="/images/hero-fallback.jpg"
                alt="Portrait of a man with braids and sunglasses wearing a black jacket"
                width={1122}
                height={1402}
                {...({ fetchpriority: 'high' } as Record<string, string>)}
                loading="eager"
                decoding="sync"
                className="w-full h-full object-cover object-top grayscale contrast-[1.06]"
              />
            </picture>
            {/* Soft fade to light background on left edge */}
            <div
              className="absolute inset-y-0 left-0 w-44 xl:w-56 bg-gradient-to-r from-white/95 via-[#F6F6F5]/75 to-transparent"
              aria-hidden="true"
            />
            {/* Seamless fade into black feature bar at bottom */}
            <div
              className="hidden md:block absolute inset-x-0 bottom-0 h-28 xl:h-36 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/65 to-transparent"
              aria-hidden="true"
            />
          </div>

          {/* Mobile Right-aligned B&W client portrait bleeding off right edge (< 768px) */}
          <div
            className="md:hidden absolute top-14 right-0 w-[60%] h-[530px] min-[400px]:h-[550px] pointer-events-none select-none overflow-hidden"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.35) 22%, black 42%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.35) 22%, black 42%)',
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
                alt="Portrait of a man with braids and sunglasses wearing a black jacket"
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
            className="hidden md:flex flex-col items-center gap-3 absolute left-3 lg:left-5 xl:left-6 bottom-10 z-20 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6B7280] hover:text-[#111111] transition-colors cursor-pointer"
            aria-label="Scroll down to lessons"
          >
            <span className="[writing-mode:vertical-rl] rotate-180">Scroll down</span>
            <span className="w-[1px] h-10 bg-[#B8860B]/70" />
          </button>

          {/* Hero Content Container */}
          <div className="relative z-10 max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 md:pl-14 lg:pl-16 xl:px-8 pt-20 pb-4 md:pt-14 md:pb-16 lg:pt-20 lg:pb-24">
            <div className="space-y-4 md:space-y-6">
              {/* Mobile Pill: "Premium Knowledge" with gold crown, #FBEFCB bg */}
              <div className="md:hidden inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBEFCB] text-[#8C6103] border border-[#B8860B]/20 text-[11px] font-semibold tracking-wide shadow-2xs">
                <Crown className="w-3.5 h-3.5 text-[#B8860B] flex-shrink-0" />
                <span>Premium Knowledge</span>
              </div>

              {/* Desktop Pill: "PREMIUM KNOWLEDGE" with thin gold lines */}
              <div className="hidden md:inline-flex items-center gap-3">
                <span className="h-[1px] w-8 bg-[#B8860B]/80" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B8860B]">
                  PREMIUM KNOWLEDGE
                </span>
                <span className="h-[1px] w-8 bg-[#B8860B]/80" aria-hidden="true" />
              </div>

              {/* Headline: Mobile <=58% max-width (28-30px, 1.12 line-height) so it never touches face; Desktop 48px 4 lines */}
              <h1 className="max-w-[58%] md:max-w-[750px] xl:max-w-[760px] text-[28px] min-[410px]:text-[30px] md:text-[42px] lg:text-[48px] font-bold tracking-[-0.03em] md:tracking-[-0.02em] text-[#111111] leading-[1.12] md:leading-[1.1]">
                Real masculinity is not understanding women to control them. It&apos;s understanding them{' '}
                <span className="md:whitespace-nowrap">
                  <span className="md:relative md:inline-block bg-gradient-to-r from-[#9A6E04] via-[#C99B2C] to-[#8C6103] bg-clip-text text-transparent underline decoration-[#B8860B]/60 decoration-2 underline-offset-4 md:no-underline md:pb-0.5">
                    without losing yourself
                    <span
                      className="hidden md:block absolute left-0 bottom-0 w-full h-[2.5px] bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#B8860B]/40 rounded-full"
                      aria-hidden="true"
                    />
                  </span>
                  .
                </span>
              </h1>

              {/* Subtitle: Mobile max 58% (14px grey); Desktop full */}
              <p className="max-w-[58%] md:max-w-lg text-[14px] md:text-[17px] text-[#6B7280] font-normal leading-[1.45] md:leading-relaxed">
                Build emotional intelligence. Improve your relationships. Become the best version of yourself.
              </p>

              {/* CTA Buttons: Auto-width left aligned on mobile, side-by-side if fit or stacked */}
              <div className="pt-1 flex flex-wrap items-center gap-2.5 sm:gap-4">
                <button
                  type="button"
                  onClick={handleCtaClick}
                  className="w-auto min-h-[44px] md:h-auto whitespace-nowrap inline-flex items-center justify-center gap-2 px-5 py-2.5 md:px-8 md:py-4 rounded-full bg-[#111111] hover:bg-neutral-800 active:bg-neutral-900 text-white text-[13.5px] min-[375px]:text-[14px] md:text-[15px] font-semibold tracking-wide transition-all duration-200 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 group cursor-pointer"
                >
                  <span>
                    {isApproved
                      ? 'Continue watching'
                      : user
                        ? 'Activate access'
                        : 'Join now'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={() => handleScrollToSection('lessons')}
                  className="w-auto min-h-[44px] md:h-auto whitespace-nowrap inline-flex items-center justify-center gap-2 px-4 py-2.5 md:px-7 md:py-3.5 rounded-full bg-white hover:bg-neutral-50 active:bg-neutral-100 text-[#111111] text-[13.5px] min-[375px]:text-[14px] md:text-[15px] font-semibold border border-neutral-200/90 shadow-2xs hover:shadow-soft transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group"
                >
                  <span className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-[#111111]/5 group-hover:bg-[#B8860B]/15 flex items-center justify-center transition-colors">
                    <Play className="w-3 h-3 fill-current text-[#111111] ml-0.5" />
                  </span>
                  <span>See the lessons</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Hero Bottom Floating Feature Card (< 768px ONLY, replaces black bar) */}
          <div className="md:hidden relative z-20 max-w-[1200px] mx-auto px-[20px] mt-4">
            <div className="rounded-2xl bg-white border border-neutral-200/80 shadow-soft-lg py-4 px-2 grid grid-cols-3 divide-x divide-neutral-100 text-center">
              <div className="flex flex-col items-center gap-1.5 px-1.5">
                <Crown className="w-5 h-5 text-[#B8860B] stroke-[1.6]" />
                <span className="text-[11px] min-[375px]:text-[12px] font-semibold text-[#111111] leading-tight">
                  Premium Content
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 px-1.5">
                <Compass className="w-5 h-5 text-[#B8860B] stroke-[1.6]" />
                <span className="text-[11px] min-[375px]:text-[12px] font-semibold text-[#111111] leading-tight">
                  Deeper Understanding
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 px-1.5">
                <TrendingUp className="w-5 h-5 text-[#B8860B] stroke-[1.6]" />
                <span className="text-[11px] min-[375px]:text-[12px] font-semibold text-[#111111] leading-tight">
                  Real Growth
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. BLACK FEATURE BAR (Desktop >= 768px only; replaced by white card on mobile) */}
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
                    Premium content
                  </span>
                  <span className="text-[12px] text-neutral-400 block mt-1 leading-snug">
                    Exclusive video lessons
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3.5 h-full">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#B8860B]/35 bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0 text-[#C99B2C] mt-0.5">
                  <Compass className="w-4 h-4 stroke-[1.6]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-medium tracking-tight sm:tracking-wide text-white block leading-tight">
                    Deeper understanding
                  </span>
                  <span className="text-[12px] text-neutral-400 block mt-1 leading-snug">
                    Master human psychology
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3.5 h-full">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#B8860B]/35 bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0 text-[#C99B2C] mt-0.5">
                  <ShieldCheck className="w-4 h-4 stroke-[1.6]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-medium tracking-tight sm:tracking-wide text-white block leading-tight">
                    A stronger you
                  </span>
                  <span className="text-[12px] text-neutral-400 block mt-1 leading-snug">
                    Build confidence
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 sm:gap-3.5 h-full">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#B8860B]/35 bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0 text-[#C99B2C] mt-0.5">
                  <TrendingUp className="w-4 h-4 stroke-[1.6]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[14px] font-medium tracking-tight sm:tracking-wide text-white block leading-tight">
                    Real growth
                  </span>
                  <span className="text-[12px] text-neutral-400 block mt-1 leading-snug">
                    In relationships and life
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
            className="hidden xl:flex flex-col items-center gap-3 absolute right-6 top-20 z-10 text-[10px] font-semibold uppercase tracking-[0.28em] text-neutral-400 pointer-events-none select-none"
            aria-hidden="true"
          >
            <span className="w-[1px] h-10 bg-[#B8860B]/50" />
            <span className="[writing-mode:vertical-rl]">Video Curriculum</span>
          </div>

          <div className="max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 lg:px-8">
            {/* MOBILE LESSONS LAYOUT (< 768px) */}
            <div className="md:hidden">
              {/* Mobile Header: 36px bold "Our Lessons" + subtitle */}
              <div>
                <h2 className="text-[36px] font-bold tracking-tight text-[#111111] leading-[1.1]">
                  Our Lessons
                </h2>
                <p className="text-[15px] text-[#6B7280] mt-2 leading-relaxed">
                  Practical lessons to help you grow, understand and succeed.
                </p>
              </div>

              {/* Rounded Search Bar */}
              <div className="relative mt-5 mb-6">
                <Search className="w-4 h-4 text-[#6B7280] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  placeholder="Search lessons..."
                  aria-label="Search lessons"
                  className="w-full h-[46px] pl-11 pr-10 rounded-full bg-[#F5F5F5] border border-neutral-200/80 text-[14px] text-[#111111] placeholder:text-[#6B7280] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111111] transition-all"
                />
                {mobileSearch && (
                  <button
                    type="button"
                    onClick={() => setMobileSearch('')}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-[#6B7280] hover:text-[#111111] absolute right-2 top-1/2 -translate-y-1/2"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {loadingLessons ? (
                <div className="space-y-4">
                  {/* Featured Card Skeleton */}
                  <div className="w-full aspect-[16/10] rounded-[20px] bg-neutral-200 animate-pulse" />
                  {/* List Skeletons */}
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
                  <h3 className="text-base font-bold text-[#111111]">Lessons coming soon</h3>
                  <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
                    We are currently preparing exclusive video lessons for our members. Check back shortly!
                  </p>
                </div>
              ) : filteredMobileLessons.length === 0 ? (
                <div className="bg-[#FAFAFA] rounded-2xl border border-neutral-200/80 p-6 text-center">
                  <p className="text-sm font-semibold text-[#111111]">No matching lessons</p>
                  <p className="text-xs text-[#6B7280] mt-1">
                    No lessons matched &ldquo;{mobileSearch}&rdquo;.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Featured Card (most recent published or first featured video) */}
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

                      {/* Dark gradient at bottom */}
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 pointer-events-none"
                        aria-hidden="true"
                      />

                      {/* Top row badges: "Featured" gold badge + lock/duration */}
                      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-10">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FBEFCB] text-[#8C6103] border border-[#B8860B]/30 text-[11px] font-bold shadow-xs">
                          <Sparkles className="w-3 h-3 text-[#B8860B]" />
                          <span>Featured</span>
                        </span>

                        {!isApproved && !featuredMobileLesson.is_free_preview && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium">
                            <Lock className="w-3 h-3 text-[#FBEFCB]" />
                            <span>{featuredMobileLesson.duration || '12 min'}</span>
                          </span>
                        )}
                      </div>

                      {/* Bottom row: Title, short text, white round play button */}
                      <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-3 z-10">
                        <div className="min-w-0">
                          <h3 className="text-[18px] font-bold text-white leading-snug line-clamp-1">
                            {featuredMobileLesson.title}
                          </h3>
                          <p className="text-[12px] text-neutral-200 line-clamp-2 mt-0.5 leading-relaxed">
                            {featuredMobileLesson.description || 'Practical video lesson from the Levelling Up curriculum.'}
                          </p>
                        </div>

                        <span className="w-11 h-11 rounded-full bg-white text-[#111111] flex items-center justify-center flex-shrink-0 shadow-md">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Price Card / Member Access Card BETWEEN Featured Card and List */}
                  <div className="my-5">
                    {isApproved ? (
                      <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-neutral-200/90 shadow-2xs flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70 mb-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Member Access</span>
                          </span>
                          <p className="text-sm font-bold text-[#111111] truncate">
                            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
                          </p>
                        </div>
                        <Link
                          to="/videos"
                          className="h-[44px] px-4 rounded-full bg-[#111111] text-white text-xs font-semibold inline-flex items-center gap-1.5 flex-shrink-0"
                        >
                          <span>Watch all</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-neutral-200/90 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FBEFCB] text-[#8C6103] mb-1">
                              <Sparkles className="w-3 h-3 text-[#B8860B]" />
                              <span>Full Membership</span>
                            </div>
                            <div className="text-lg font-bold text-[#111111] leading-tight">
                              {settings.price} MAD{' '}
                              <span className="text-xs font-normal text-[#6B7280]">one-time</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCtaClick}
                          className="w-full h-[48px] rounded-full bg-[#111111] hover:bg-neutral-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                          <span>Unlock all lessons</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* List of Lessons under the Price Card */}
                  <div className="space-y-3">
                    {filteredMobileLessons.map((lesson) => {
                      const isLocked = !isApproved && !lesson.is_free_preview;
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => handleCardClick(lesson)}
                          className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-white border border-neutral-200/85 shadow-2xs hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left cursor-pointer"
                        >
                          {/* 88x72 Thumbnail, rounded 12px, lock overlay if locked */}
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

                          {/* Title + Meta */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[15px] font-bold text-[#111111] truncate leading-snug">
                              {lesson.title}
                            </h3>
                            <p className="text-[13px] text-[#6B7280] mt-0.5 truncate">
                              {lesson.duration || '12 min'} &middot; Lesson
                            </p>
                          </div>

                          {/* Chevron Right */}
                          <ChevronRight className="w-5 h-5 text-[#6B7280] flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* DESKTOP LESSONS LAYOUT (>= 768px) */}
            <div className="hidden md:block">
              {/* Editorial Header: label, big title, short text, Explore collection button */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-12 pb-8 border-b border-neutral-200/70">
                <div className="max-w-2xl space-y-3">
                  <div className="inline-flex items-center gap-3">
                    <span className="h-[1px] w-6 bg-[#B8860B]/80" aria-hidden="true" />
                    <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#B8860B]">
                      NEW LESSONS
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-[#111111] leading-[1.15]">
                    Lessons built for real-world confidence
                  </h2>
                  <p className="text-sm sm:text-[16px] text-[#6B7280] leading-relaxed max-w-xl">
                    Explore our private video catalog covering communication, female psychology, boundaries, and emotional composure.
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
                    <span>Explore collection</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>

              {/* Real Catalog Sub-container */}
              <div id="lessons-catalog" className="scroll-mt-24">
                {/* Price + CTA Banner Card OR Welcome Back Banner */}
                {isApproved ? (
                  <div className="mb-6 md:mb-10 p-[20px] sm:p-8 rounded-3xl bg-[#FAFAFA] border border-neutral-200/90 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#111111] text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-xs">
                        {(profile?.full_name || user?.email || 'M').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Active Membership</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight truncate">
                          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#6B7280]">
                          You have full access to all lessons in the library. Pick any lesson below to start watching.
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <Link
                        to="/videos"
                        className="w-full sm:w-auto min-h-[52px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#111111] hover:bg-neutral-800 text-white text-sm font-semibold tracking-wide transition-all shadow-soft hover:-translate-y-0.5 active:translate-y-0 group"
                      >
                        <span>Continue watching</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 md:mb-10 p-[20px] sm:p-8 rounded-3xl bg-[#FAFAFA] border border-neutral-200/90 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-6">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B8860B]/10 text-[#B8860B] border border-[#B8860B]/20">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>All-Inclusive Access</span>
                      </div>
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-[#111111] tracking-tight">
                        <span>{settings.price} MAD</span>
                        <span className="text-[#6B7280] text-sm sm:text-base font-normal"> — one-time access to all lessons & updates</span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#6B7280]">
                        Pay securely via Moroccan bank transfer (RIB). No recurring subscription.
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={handleCtaClick}
                        className="w-full sm:w-auto min-h-[52px] sm:min-h-0 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#111111] hover:bg-neutral-800 text-white text-sm font-semibold tracking-wide transition-all shadow-soft hover:-translate-y-0.5 active:translate-y-0 group cursor-pointer"
                      >
                        <span>Unlock all lessons</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
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
                    <h3 className="text-base font-bold text-[#111111]">Lessons coming soon</h3>
                    <p className="text-xs sm:text-sm text-[#6B7280] mt-1.5 leading-relaxed">
                      We are currently preparing exclusive high-value video lessons for our members. Check back shortly!
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

        {/* 4. HOW IT WORKS (3 Steps connected by thin line) */}
        <section id="how-it-works" className="py-14 md:py-24 scroll-mt-20 border-t border-neutral-200/70 bg-[#FAFAFA]">
          <div className="max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center max-w-2xl mx-auto mb-8 md:mb-16">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B8860B]/10 text-[#B8860B] border border-[#B8860B]/20 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>How It Works</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111111]">
                Simple, transparent access
              </h2>
              <p className="text-sm sm:text-[16px] text-[#6B7280] mt-2 font-normal">
                Unlock the entire curriculum in three straightforward steps.
              </p>
            </div>

            {/* Steps Grid with connecting horizontal line on desktop */}
            <div className="relative">
              {/* Connecting Line on Desktop */}
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
                        {/* Top Row: Number Badge & Icon */}
                        <div className="flex items-center justify-between mb-5 md:mb-6">
                          <span className="w-11 h-11 rounded-2xl bg-[#111111] text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:bg-neutral-800 transition-colors">
                            {st.step}
                          </span>
                          <div className="w-10 h-10 rounded-xl bg-[#B8860B]/10 text-[#B8860B] flex items-center justify-center">
                            <Icon className="w-5 h-5" />
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-lg lg:text-[19px] font-bold text-[#111111] tracking-tight mb-2 md:mb-2.5">
                          {st.title}
                        </h3>
                        <p className="text-sm sm:text-[15px] text-[#6B7280] leading-relaxed">
                          {st.desc}
                        </p>
                      </div>

                      <div className="pt-4 md:pt-5 mt-5 md:mt-6 border-t border-neutral-100 flex items-center gap-1.5 text-xs font-semibold text-[#B8860B]">
                        <span>Step {idx + 1} of 3</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 5. THREE CORE PILLARS / VALUE CARDS */}
        <section className="py-14 md:py-24 border-t border-neutral-200/70 bg-white">
          <div className="max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-8 md:mb-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111111]">
                Master the fundamental dynamics
              </h2>
              <p className="text-sm sm:text-[16px] text-[#6B7280] mt-2 font-normal">
                A structured mental framework to navigate modern female communication and psychology.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 items-stretch">
              {/* Card 1: Their language */}
              <div className="h-full p-[20px] md:p-8 rounded-2xl border border-neutral-200/80 bg-white shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#B8860B]/10 flex items-center justify-center mb-5 md:mb-6 text-[#B8860B] group-hover:scale-110 transition-transform duration-200">
                    <MessageSquare className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <h3 className="text-[19px] lg:text-[20px] font-bold text-[#111111] tracking-tight mb-2 md:mb-2.5">
                    Their language
                  </h3>
                  <p className="text-[15px] lg:text-[16px] text-[#111111] font-medium leading-relaxed mb-2">
                    Learn how women communicate — beyond words.
                  </p>
                  <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                    Decode subtext, tone, and body language to respond with unwavering composure and confidence.
                  </p>
                </div>
              </div>

              {/* Card 2: Their logic */}
              <div className="h-full p-[20px] md:p-8 rounded-2xl border border-neutral-200/80 bg-white shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#B8860B]/10 flex items-center justify-center mb-5 md:mb-6 text-[#B8860B] group-hover:scale-110 transition-transform duration-200">
                    <Sparkles className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <h3 className="text-[19px] lg:text-[20px] font-bold text-[#111111] tracking-tight mb-2 md:mb-2.5">
                    Their logic
                  </h3>
                  <p className="text-[15px] lg:text-[16px] text-[#111111] font-medium leading-relaxed mb-2">
                    Understand what really drives their decisions.
                  </p>
                  <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                    See through emotional tests and discover the deeper instincts behind female psychological needs.
                  </p>
                </div>
              </div>

              {/* Card 3: Their emotions */}
              <div className="h-full p-[20px] md:p-8 rounded-2xl border border-neutral-200/80 bg-white shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#B8860B]/10 flex items-center justify-center mb-5 md:mb-6 text-[#B8860B] group-hover:scale-110 transition-transform duration-200">
                    <Heart className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <h3 className="text-[19px] lg:text-[20px] font-bold text-[#111111] tracking-tight mb-2 md:mb-2.5">
                    Their emotions
                  </h3>
                  <p className="text-[15px] lg:text-[16px] text-[#111111] font-medium leading-relaxed mb-2">
                    Decode their emotions and build deeper connections.
                  </p>
                  <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                    Lead dynamic conversations, resolve tensions effortlessly, and foster genuine, lasting respect.
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
                  <span>Member Feedback</span>
                </div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111111]">
                  What our members say
                </h2>
                <p className="text-sm sm:text-[15px] text-[#6B7280] mt-1.5">
                  Real feedback from men who transformed their relationships and inner confidence.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#111111] hover:text-neutral-700 transition-colors group cursor-pointer self-start sm:self-auto"
              >
                <span>Share your review</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 items-stretch">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="h-full p-[20px] md:p-8 rounded-2xl border border-neutral-200/80 bg-white shadow-soft flex flex-col justify-between group hover:shadow-soft-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div>
                    {/* Stars row */}
                    <div className="flex items-center gap-1 text-[#B8860B] mb-4 md:mb-5">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current text-[#B8860B]" />
                      ))}
                    </div>

                    {/* Larger quote text */}
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
                      Verified Member
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
            {/* Header */}
            <div className="text-center max-w-xl mx-auto mb-8 sm:mb-16">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B8860B]/10 text-[#B8860B] border border-[#B8860B]/20 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Frequently Asked Questions</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#111111]">
                Everything you need to know
              </h2>
              <p className="text-sm sm:text-[16px] text-[#6B7280] mt-2 font-normal">
                Got questions about the membership, payments, or access? We&apos;ve got you covered.
              </p>
            </div>

            {/* Accordion list */}
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
                      className="w-full min-h-[56px] p-[20px] sm:p-6 text-left flex items-center justify-between gap-4 focus:outline-none cursor-pointer"
                      aria-expanded={isOpen}
                    >
                      <span className="text-[15px] sm:text-[17px] font-bold text-[#111111] tracking-tight">
                        {faq.question}
                      </span>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${isOpen ? 'bg-[#111111] text-white rotate-180' : 'bg-neutral-100 text-[#6B7280]'
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

        {/* 8. FINAL CTA BANNER (Near-black rounded banner) */}
        <section className="py-14 md:py-24 bg-[#FAFAFA] border-t border-neutral-200/70">
          <div className="max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-[#111111] text-white p-[20px] py-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-2xl">
              {/* Subtle gold radial ambient glow */}
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
                  <span>Take The Leap</span>
                </div>

                <h2 className="text-[28px] sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                  Ready to level up?
                </h2>

                <p className="text-sm sm:text-base lg:text-[17px] text-neutral-300 leading-relaxed max-w-xl">
                  Join hundreds of ambitious men taking control of their relationships, emotional intelligence, and self-respect.
                </p>

                <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={handleCtaClick}
                    className="w-full sm:w-auto h-[52px] sm:h-auto inline-flex items-center justify-center gap-2.5 px-8 sm:py-4 rounded-full bg-white hover:bg-neutral-100 text-[#111111] text-[16px] sm:text-base font-semibold shadow-soft-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer group"
                  >
                    <span>
                      {isApproved
                        ? 'Continue watching'
                        : user
                          ? 'Activate access'
                          : 'Join now'}
                    </span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setContactModalOpen(true)}
                    className="w-full sm:w-auto h-[52px] sm:h-auto inline-flex items-center justify-center gap-2 px-6 sm:py-4 rounded-full bg-white/10 hover:bg-white/15 text-white text-[15px] sm:text-sm font-semibold border border-white/15 transition-colors cursor-pointer"
                  >
                    <span>Have a question? Talk to us</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. GET IN TOUCH SECTION (Direct assistance) */}
        <section id="contact" className="py-14 md:py-20 scroll-mt-20 bg-white border-t border-neutral-200/70">
          <div className="max-w-[1200px] w-full mx-auto px-[20px] sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-neutral-200/90 bg-[#FAFAFA] p-[20px] sm:p-12 shadow-soft flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 text-center md:text-left">
              <div className="space-y-2 max-w-xl">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111111]">
                  Get in touch
                </h2>
                <p className="text-sm sm:text-base text-[#6B7280]">
                  Have a question about your payment or account? We&apos;re here to help you get started on your journey.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="w-full sm:w-auto h-[52px] sm:h-auto inline-flex items-center justify-center px-8 sm:py-3.5 rounded-full bg-[#111111] hover:bg-neutral-800 text-white text-[16px] sm:text-sm font-semibold tracking-wide transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 flex-shrink-0 cursor-pointer"
              >
                Contact us &rarr;
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
              <h3 className="text-xl font-bold text-[#111111]">Contact Support</h3>
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
              Reach out directly to the Levelling Up team for inquiries, payment assistance, or questions.
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
                  <div className="text-xs text-[#6B7280] font-normal">WhatsApp Support</div>
                  <div className="truncate">{settings.contact_whatsapp}</div>
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
                  <div className="text-xs text-[#6B7280] font-normal">Email Inquiries</div>
                  <div className="truncate">{settings.contact_email}</div>
                </div>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setContactModalOpen(false)}
              className="w-full min-h-[44px] py-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-sm font-semibold text-[#111111] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer onContactClick={() => setContactModalOpen(true)} />
    </div>
  );
};
