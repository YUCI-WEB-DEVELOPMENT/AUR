/* eslint-disable jsx-a11y/role-has-required-aria-props */
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import NewsFlashWidget from "./NewsFlashWidget";
import Image from "next/image";
import Link from "next/link";
import {
  Search, BookOpen, GraduationCap, ChevronRight, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { University, Article } from "../types";
import { listPublishedBlogs } from "../lib/firebase-content";
import { useUniversityData } from "./data/UniversityDataProvider";
import { useSidebar } from "./navigation/SidebarContext";
import { isProtectedView } from "./navigation/config";
import "./home/ref-home.css";

type SuggestionPick =
  | { kind: "uni"; uni: University }
  | { kind: "article"; article: Article }
  | { kind: "view-all" };

const COUNTRY_FLAGS: Record<string, string> = {
  China: "🇨🇳", Singapore: "🇸🇬", Japan: "🇯🇵", "South Korea": "🇰🇷", India: "🇮🇳",
  Malaysia: "🇲🇾", Thailand: "🇹🇭", Vietnam: "🇻🇳", Indonesia: "🇮🇩", Uzbekistan: "🇺🇿",
  Kazakhstan: "🇰🇿", Taiwan: "🇹🇼", "Hong Kong": "🇭🇰", Philippines: "🇵🇭", Pakistan: "🇵🇰",
  Bangladesh: "🇧🇩", Nepal: "🇳🇵", Myanmar: "🇲🇲", Cambodia: "🇰🇭", Mongolia: "🇲🇳",
};

const COUNTRY_CODE: Record<string, string> = {
  Singapore: "SG", "Hong Kong": "HK", "South Korea": "KR", China: "CN", Japan: "JP",
  India: "IN", Taiwan: "TW", Malaysia: "MY", Thailand: "TH", Vietnam: "VN",
  Indonesia: "ID", Uzbekistan: "UZ", Kazakhstan: "KZ", Philippines: "PH", Pakistan: "PK",
  Bangladesh: "BD", Nepal: "NP",
};

const socialLinks = [
  { label: "LinkedIn",  imgSrc: "/linkedin-logo.png",  href: "https://www.linkedin.com/company/asia-university-rankings/" },
  { label: "Instagram", imgSrc: "/instagram-logo.png", href: "https://www.instagram.com/asiauniversityrankings/" },
];

/**
 * Hero backdrops, all >=3000px wide. The hero is full-bleed, so the previous
 * 547-1024px sources were being upscaled ~3x and looked visibly soft.
 *
 * Sourced from Wikimedia Commons under CC0 / CC BY(-SA); see docs/hero-images.md
 * for the per-file attribution the share-alike licences require. Keep any
 * replacement at >=2400px wide and in landscape, since `object-cover` crops to
 * the container's aspect ratio.
 */
const HERO_SLIDES = [
  "/hero/hero_tokyo_hongo.jpg",
  "/hero/hero_ntu_singapore.jpg",
  "/hero/hero_cuhk.jpg",
  "/hero/hero_iit_kharagpur.jpg",
];


const PILLARS = [
  { pct: "40%", name: "Research Impact",      desc: "Citations, academic reputation, research output" },
  { pct: "25%", name: "Teaching Quality",      desc: "Faculty ratio, doctorate staff, learning environment" },
  { pct: "15%", name: "Employability",         desc: "Employer reputation, graduate placement rates" },
  { pct: "15%", name: "International Outlook", desc: "International students, faculty, collaborations" },
  { pct: "5%",  name: "Industry & Innovation", desc: "Patent citations, industry funding, revenue" },
];

function getCountryStats(unis: University[]) {
  const m = new Map<string, University[]>();
  unis.forEach(u => { if (!m.has(u.location)) m.set(u.location, []); m.get(u.location)!.push(u); });
  return Array.from(m.entries())
    .map(([country, list]) => ({
      country, count: list.length,
      avgScore: list.reduce((s, u) => s + u.overall, 0) / list.length,
      topUni: [...list].sort((a, b) => b.overall - a.overall)[0],
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 6);
}

function highlight(text: string, q: string) {
  const t = q.trim();
  if (!t) return text;
  const i = text.toLowerCase().indexOf(t.toLowerCase());
  if (i === -1) return text;
  return <>{text.slice(0, i)}<mark className="bg-amber-100 text-amber-800 px-0.5">{text.slice(i, i + t.length)}</mark>{text.slice(i + t.length)}</>;
}

type FLI = { label: string; kind: "view" | "route"; target: string };
function FooterLink({ item, onViewChange }: { item: FLI; onViewChange: (v: string) => void }) {
  const c = "text-sm text-slate-500 hover:text-[#1A365D] transition-colors";
  if (item.kind === "route") return <Link href={item.target} className={c}>{item.label}</Link>;
  return <button type="button" onClick={() => onViewChange(item.target)} className={c}>{item.label}</button>;
}

interface HomepageProps {
  onSearchSubmit: (q: string) => void;
  onUniversitySelect: (id: string) => void;
  onArticleSelect: (a: Article) => void;
  onViewChange: (v: string) => void;
  isAuthenticated?: boolean;
}

export default function Homepage({
  onSearchSubmit, onUniversitySelect, onArticleSelect, onViewChange, isAuthenticated = false,
}: HomepageProps) {

  const guard = useCallback(
    (view: string) => {
      onViewChange(
        !isAuthenticated && isProtectedView(view) ? "login" : view
      );
    },
    [isAuthenticated, onViewChange]
  );

  const {
    universities,
    totalCount,
    totalCountries,
    loading: universitiesLoading,
  } = useUniversityData();
  const { searchQuery, setSearchQuery } = useSidebar();
  const [suggestions, setSuggestions] = useState<{ universities: University[]; articles: Article[] }>({ universities: [], articles: [] });
  const [showSugg, setShowSugg] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [blogs, setBlogs] = useState<Article[]>([]);
  const [slide, setSlide] = useState(0);
  const [isIntro, setIsIntro] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsIntro(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => { const id = setInterval(() => setSlide(p => (p + 1) % HERO_SLIDES.length), 4000); return () => clearInterval(id); }, []);

  useEffect(() => {
    let active = true;
    listPublishedBlogs()
      .then((data) => {
        if (!active) return;
        const published = data.map((blog): Article => ({
            id: String(blog.id ?? ""),
            title: String(blog.title ?? ""),
            subtitle: String(blog.description ?? ""),
            source: String(blog.author ?? "AUR Editorial"),
            date: blog.publish_date
              ? new Date(String(blog.publish_date)).toLocaleDateString()
              : "",
            contentSummary: String(blog.description ?? ""),
            image: String(blog.cover_image ?? ""),
            content: String(blog.content ?? ""),
            category: String(blog.category ?? ""),
            readTime: blog.read_time ? String(blog.read_time) : undefined,
            tags:
              typeof blog.tags === "string"
                ? blog.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
                : [],
          }));
        setBlogs(published);
      })
      .catch((error) => {
        console.error("Blog feed unavailable", error);
        setBlogs([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const allArticles = blogs;

  useEffect(() => {
    if (!searchQuery.trim()) { setSuggestions({ universities: [], articles: [] }); return; }
    setSuggestions({
      universities: universities.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 5),
      articles: allArticles.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 3),
    });
  }, [allArticles, searchQuery, universities]);

  const flat = useMemo((): SuggestionPick[] => {
    const items: SuggestionPick[] = [];
    suggestions.universities.forEach(uni => items.push({ kind: "uni", uni }));
    suggestions.articles.forEach(article => items.push({ kind: "article", article }));
    if (searchQuery.trim()) items.push({ kind: "view-all" });
    return items;
  }, [suggestions, searchQuery]);

  useEffect(() => setActiveIdx(-1), [searchQuery]);

  const pick = useCallback((item: SuggestionPick) => {
    if (item.kind === "uni") onUniversitySelect(item.uni.id);
    else if (item.kind === "article") onArticleSelect(item.article);
    else { onSearchSubmit(searchQuery); guard("rankings"); }
    setShowSugg(false);
  }, [guard, onArticleSelect, onSearchSubmit, onUniversitySelect, searchQuery]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setShowSugg(false); return; }
    if (!showSugg || !flat.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); pick(flat[activeIdx]); }
  };

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShowSugg(false); };
    document.addEventListener("mousedown", fn); return () => document.removeEventListener("mousedown", fn);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) { onSearchSubmit(searchQuery); onViewChange("rankings"); setShowSugg(false); }
  };

  const top10 = useMemo(() => universities.slice(0, 10), [universities]);
  const top10Loading = top10.length === 0 && universitiesLoading;
  const countries = useMemo(() => getCountryStats(universities), [universities]);

  return (
    <div className="ref-home flex-grow w-full relative">

      {/* ═══ HERO ═══ */}
      <section className="rh-hero">
        {HERO_SLIDES.map((src, i) => (
          <div key={src} className="rh-hero__slide" style={{ opacity: i === slide ? 1 : 0 }}>
            <Image src={src} alt="" fill sizes="100vw" quality={90} className="object-cover" priority={i === 0} />
          </div>
        ))}
        <div className="rh-hero__gradient" />

        {/* Intro Logo Overlay */}
        <AnimatePresence>
          {isIntro && (
            <motion.div
              key="intro-logo-container"
              className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                layoutId="aur-hero-logo"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.6, opacity: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10"
              >
                <Image src="/logo.png" alt="AUR Logo" width={240} height={90} priority style={{ objectFit: "contain" }} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="rh-hero__inner relative z-20">
          <div className="h-[75px] mb-5">
            {!isIntro && (
              <motion.div
                layoutId="aur-hero-logo"
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="origin-left inline-block"
              >
                <Image src="/logo.png" alt="AUR Logo" width={160} height={60} priority style={{ objectFit: "contain" }} />
              </motion.div>
            )}
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isIntro ? 0 : 1, y: isIntro ? 20 : 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="rh-hero__edition">2026 Official Edition</div>
            <h1 className="rh-hero__title">Asia University Rankings</h1>
            <p className="rh-hero__sub">
              {universitiesLoading || !totalCount || !totalCountries
                ? "Compare universities across Asia on research, teaching, employability, and internationalization."
                : `Compare ${totalCount.toLocaleString()} institutions across ${totalCountries} countries on research, teaching, employability, and internationalization.`}
            </p>

            <div className="rh-hero-search" ref={ref}>
              <form onSubmit={onSubmit} className="rh-hero-search__form" role="search">
                <div className="rh-hero-search__icon"><Search size={18} /></div>
                <input
                  type="search" role="combobox"
                  aria-expanded={showSugg && searchQuery.trim().length > 0}
                  placeholder="Search universities, countries, subjects…"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowSugg(true); }}
                  onFocus={() => setShowSugg(true)}
                  onKeyDown={onKey}
                  className="rh-hero-search__input"
                />
                <button type="submit" className="rh-hero-search__btn">Search</button>
              </form>

              {showSugg && searchQuery.trim() && (
                <div className="rh-dropdown">
                  {(() => {
                    let ri = -1;
                    return (
                      <>
                        <div className="p-3 border-b border-slate-100">
                          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5 flex items-center gap-1"><GraduationCap size={11} /> Universities</div>
                          {suggestions.universities.length ? (
                            <ul className="space-y-0.5">{suggestions.universities.map(uni => {
                              ri++;
                              return (<li key={uni.id}><button type="button" onClick={() => pick({ kind: "uni", uni })} className={`w-full text-left flex justify-between p-2 text-xs rounded ${activeIdx === ri ? "bg-amber-50" : "hover:bg-slate-50"}`}><span className="font-semibold truncate pr-2">{highlight(uni.name, searchQuery)}</span><span className="text-slate-400 shrink-0">{uni.location}</span></button></li>);
                            })}</ul>
                          ) : <p className="text-xs text-slate-400 italic p-1">No matches</p>}
                        </div>
                        {suggestions.articles.length > 0 && (
                          <div className="p-3 border-b border-slate-100">
                            <div className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1.5 flex items-center gap-1"><BookOpen size={11} /> Articles</div>
                            {suggestions.articles.map(art => { ri++; return (<button key={art.id} type="button" onClick={() => pick({ kind: "article", article: art })} className="w-full text-left p-2 text-xs hover:bg-slate-50 rounded block">{highlight(art.title, searchQuery)}</button>); })}
                          </div>
                        )}
                        <div className="p-2 text-center"><button type="button" onClick={() => pick({ kind: "view-all" })} className="text-[11px] text-blue-700 font-bold uppercase tracking-wider">View all &quot;{searchQuery}&quot; <ChevronRight className="inline h-3 w-3" /></button></div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="rh-hero__actions">
              <button type="button" className="bg-white text-[#1A365D] font-bold text-sm px-6 py-3 rounded-sm flex items-center gap-2" onClick={() => onViewChange("rankings")}>
                Explore Rankings <ArrowRight size={16} />
              </button>
              <button type="button" className="text-white font-bold text-sm px-6 py-3 rounded-sm border border-white/40 hover:bg-white/10 transition-colors flex items-center" onClick={() => onViewChange("universities")}>
                University Directory
              </button>
            </div>
          </motion.div>
        </div>

        <div className="rh-hero__nav">
          <div className="rh-hero__dots">
            {HERO_SLIDES.map((src, i) => (
              <button key={src} type="button" className={`rh-dot${i === slide ? " rh-dot--on" : ""}`} onClick={() => setSlide(i)} aria-label={`Show slide ${i + 1}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATS STRIP ═══ */}
      <div className="rh-stats">
        {[
          // Dataset-wide totals — `universities` only holds the loaded pages,
          // so counting it would report the 20-item page size.
          { num: totalCount ? totalCount.toLocaleString() : null, loading: universitiesLoading, label: "Universities Ranked" },
          { num: totalCountries || null, loading: universitiesLoading, label: "Countries & Territories" },
          { num: "5", label: "Performance Pillars" },
          { num: "2026", label: "Edition Year" },
        ].map(s => (
          <div key={s.label} className="rh-stat">
            <div className="rh-stat__num">
              {s.loading ? (
                <>
                  <span className="rh-stat__skeleton" aria-hidden="true" />
                  <span className="sr-only">Loading</span>
                </>
              ) : (
                s.num ?? "—"
              )}
            </div>
            <div className="rh-stat__label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ METHODOLOGY ═══ */}
      <div style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
        <div className="rh-sec">
          <div className="rh-sec__head">
            <div>
              <div className="rh-sec__eyebrow">Methodology</div>
              <h2 className="rh-sec__title">Ranking Indicators</h2>
            </div>
          </div>
          <div className="rh-pillars">
            {PILLARS.map(p => (
              <div key={p.name} className="rh-pill">
                <div className="rh-pill__pct">{p.pct}</div>
                <div className="rh-pill__name">{p.name}</div>
                <div className="rh-pill__desc">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TOP 10 ═══ */}
      <div style={{ background: "#FFFFFF" }}>
        <div className="rh-sec">
          <div className="rh-sec__head">
            <div>
              <div className="rh-sec__eyebrow">Rankings</div>
              <h2 className="rh-sec__title">Top 10 Universities in Asia</h2>
            </div>
            <button type="button" className="rh-sec__link" onClick={() => guard("rankings")}>
              Full rankings <ChevronRight size={16} />
            </button>
          </div>

          <div className="rh-tbl">
            <div className="rh-tbl__hdr">
              <div>#</div><div>University</div><div>Location</div><div>Score</div>
              <div className="hidden md:block">Research</div>
              <div className="hidden md:block">Employ.</div>
            </div>
            {top10Loading && (
              <div role="status" aria-label="Loading top universities">
                {Array.from({ length: 5 }, (_, idx) => (
                  <div key={idx} className="rh-tbl__row animate-pulse" aria-hidden="true">
                    <div><span className="block h-7 w-7 rounded-full bg-slate-200" /></div>
                    <div><span className="block h-4 w-3/4 rounded bg-slate-200" /></div>
                    <div><span className="block h-4 w-2/3 rounded bg-slate-200" /></div>
                    <div><span className="block h-4 w-12 rounded bg-slate-200" /></div>
                    <div className="hidden md:block"><span className="block h-4 w-16 rounded bg-slate-200" /></div>
                    <div className="hidden md:block"><span className="block h-4 w-16 rounded bg-slate-200" /></div>
                  </div>
                ))}
                <span className="sr-only">Loading top universities…</span>
              </div>
            )}
            {top10.map((uni, idx) => (
              <div
                key={uni.id}
                className={`rh-tbl__row${idx === 0 ? " rh-tbl__row--gold" : ""}`}
                onClick={() => onUniversitySelect(uni.id)}
                role="button" tabIndex={0}
                onKeyDown={e => e.key === "Enter" && onUniversitySelect(uni.id)}
              >
                <div><span className={`rh-rank${idx < 3 ? ` rh-rank--${idx + 1}` : ""}`}>{idx + 1}</span></div>
                <div className="rh-name">{uni.name}</div>
                <div className="flex items-center gap-1 text-xs text-slate-500"><span>{COUNTRY_FLAGS[uni.location] ?? ""}</span><span className="truncate">{uni.location}</span></div>
                <div className="rh-score-num">{uni.overall.toFixed(1)}</div>
                <div className="rh-bar-cell"><div className="rh-bar__val">{uni.research.toFixed(1)}</div><div className="rh-bar__track"><div className="rh-bar__fill" style={{ width: `${uni.research}%`, background: "#2563eb" }} /></div></div>
                <div className="rh-bar-cell"><div className="rh-bar__val">{uni.employability.toFixed(1)}</div><div className="rh-bar__track"><div className="rh-bar__fill" style={{ width: `${uni.employability}%`, background: "#059669" }} /></div></div>
              </div>
            ))}
            <div className="rh-tbl__foot">
              <button type="button" className="rh-sec__link" onClick={() => guard("rankings")}>
                Analyze all universities <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ COUNTRIES ═══ */}
      <div style={{ background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
        <div className="rh-sec">
          <div className="rh-sec__head">
            <div>
              <div className="rh-sec__eyebrow">Regions</div>
              <h2 className="rh-sec__title">Explore by Country</h2>
            </div>
            <button type="button" className="rh-sec__link" onClick={() => onViewChange("rankings")}>
              All countries <ChevronRight size={16} />
            </button>
          </div>
          <div className="rh-countries">
            {countries.map(c => (
              <div key={c.country} className="rh-country" onClick={() => { onSearchSubmit(c.country); onViewChange("rankings"); }} role="button" tabIndex={0}>
                <div className="rh-country__img">
                  {c.topUni.campusPhoto && <img src={c.topUni.campusPhoto} alt={c.topUni.name} loading="lazy" />}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className="absolute bottom-2.5 left-3 text-white text-sm font-bold">{c.country}</span>
                  <span className="absolute top-2.5 right-2.5 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded">{c.count} unis</span>
                </div>
                <div className="rh-country__body">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-400">{COUNTRY_FLAGS[c.country] ?? ""} {COUNTRY_CODE[c.country] ?? c.country.slice(0, 2)}</span>
                    <span className="text-[11px] font-mono font-bold text-[#1A365D]">Avg {c.avgScore.toFixed(1)}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 truncate">{c.topUni.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Top ranked institution</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ NEWS ═══ */}
      <div style={{ background: "#FFFFFF", borderTop: "1px solid #E2E8F0" }}>
        <div className="rh-sec"><NewsFlashWidget /></div>
      </div>

      {/* ═══ CTA ═══ */}
      <div style={{ background: "#FFFFFF", paddingBottom: "3rem" }}>
        <div className="rh-sec" style={{ paddingTop: 0 }}>
          <div className="rh-cta">
            <h2 className="rh-cta__title">Higher Education Intelligence</h2>
            <p className="rh-cta__sub">
              A premium Asia university institutional portal for independent Asian university performance metrics,
              institutional benchmarking, and regional analysis.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button type="button" className="bg-white text-[#1A365D] font-bold text-sm px-6 py-3 rounded" onClick={() => guard("rankings")}>Explore Rankings</button>
              <a href="mailto:sales@asiauniversityrankings.com?subject=Institutional%20Access" className="text-white/90 font-semibold text-sm px-6 py-3 rounded border border-white/30 hover:bg-white/10 transition-colors">Institutional Access</a>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-slate-200 bg-white px-6 lg:px-12 pt-16 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between gap-12 lg:gap-24 mb-16">
            <div className="flex flex-col gap-6 max-w-sm">
              <Image src="/logo.png" alt="AUR Logo" width={140} height={60} className="object-contain" priority />
              <p className="text-sm text-slate-500 leading-relaxed">
                The definitive intelligence platform for higher education across Asia and Central Asia. Registered
                institutions can use the Asia University Rankings login portal to manage their profiles and data.
              </p>
              <div className="flex gap-3">
                {socialLinks.map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                    <div className="h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                      <Image src={s.imgSrc} alt={s.label} width={16} height={16} className="object-contain" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-12 sm:gap-24 lg:w-1/2 justify-end">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-6">Platform</h4>
                <ul className="space-y-4">
                  {([{ label: "Rankings", kind: "view", target: "rankings" }, { label: "Discovery", kind: "view", target: "home" }, { label: "Compare", kind: "view", target: "saved" }] as const).map(item => <li key={item.label}><FooterLink item={item} onViewChange={onViewChange} /></li>)}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-6">Resources</h4>
                <ul className="space-y-4">
                  {([{ label: "Blog", kind: "view", target: "blog" }, { label: "News", kind: "view", target: "news" }] as const).map(item => <li key={item.label}><FooterLink item={item} onViewChange={onViewChange} /></li>)}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
            <span className="text-xs text-slate-400">© 2026 Asia University Rankings</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
