import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowForwardRounded,
  CloudUploadRounded,
} from '@mui/icons-material';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Lenis from 'lenis';

const panels = [
  {
    number: '01',
    eyebrow: 'A clear path for every contribution',
    title: 'Stewardship,\nmade clear.',
    description:
      'A thoughtful home for receipt submissions and treasury records at Near East Christian Fellowship.',
    actions: [
      { label: 'Submit a receipt', route: '/upload', icon: CloudUploadRounded, primary: true },
    ],
  },
  {
    number: '02',
    eyebrow: 'For every gift and expense',
    title: 'Give every\nreceipt its place.',
    description:
      'Send receipt details to the treasury team in a few simple steps. Your submission stays connected to its review.',
    actions: [
      { label: 'Start a submission', route: '/upload', icon: CloudUploadRounded, primary: true },
    ],
  },
  {
    number: '03',
    eyebrow: 'A careful process, by design',
    title: 'Review with\nconfidence.',
    description:
      'The treasury team reviews incoming receipts and keeps records moving through the right hands.',
    actions: [],
  },
  {
    number: '04',
    eyebrow: 'Faithful care for shared resources',
    title: 'Transparency\nbuilds trust.',
    description:
      'A considered workflow helps the church care for its resources with clarity, accountability, and attention.',
    actions: [
      { label: 'Submit a receipt', route: '/upload', icon: CloudUploadRounded, primary: true },
    ],
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [isCompactViewport, setIsCompactViewport] = useState(
    () => window.matchMedia('(max-width: 767px), (max-height: 620px)').matches,
  );
  const scrollContainer = useRef(null);
  const track = useRef(null);
  const [horizontalTravel, setHorizontalTravel] = useState(0);
  const useVerticalLayout = prefersReducedMotion || isCompactViewport;
  const { scrollYProgress } = useScroll({
    target: scrollContainer,
    offset: ['start start', 'end end'],
  });
  const x = useTransform(scrollYProgress, [0, 1], [0, -horizontalTravel]);

  useEffect(() => {
    const compactViewport = window.matchMedia(
      '(max-width: 767px), (max-height: 620px)',
    );
    const updateLayout = () => setIsCompactViewport(compactViewport.matches);
    compactViewport.addEventListener('change', updateLayout);
    return () => compactViewport.removeEventListener('change', updateLayout);
  }, []);

  useEffect(() => {
    if (useVerticalLayout) return undefined;

    const lenis = new Lenis({ autoRaf: true, smoothWheel: true });
    return () => lenis.destroy();
  }, [useVerticalLayout]);

  useEffect(() => {
    if (useVerticalLayout) {
      setHorizontalTravel(0);
      return undefined;
    }

    const element = track.current;
    if (!element) return undefined;

    const updateTravel = () => {
      setHorizontalTravel(Math.max(0, element.scrollWidth - window.innerWidth));
    };

    updateTravel();
    const observer = new ResizeObserver(updateTravel);
    observer.observe(element);
    window.addEventListener('resize', updateTravel);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateTravel);
    };
  }, [useVerticalLayout]);

  return (
    <main
      ref={scrollContainer}
      className="relative bg-[#f6f4f0] text-[#211c19]"
      style={
        useVerticalLayout
          ? undefined
          : { height: `calc(100svh + ${horizontalTravel}px)` }
      }
    >
      <div
        className={
          useVerticalLayout
            ? 'min-h-svh overflow-visible'
            : 'sticky top-0 h-svh overflow-hidden'
        }
      >
        <motion.div
          ref={track}
          style={useVerticalLayout ? undefined : { x }}
          className={`${
            useVerticalLayout
              ? 'flex w-full flex-col'
              : 'flex h-svh w-max flex-row gap-[14vw] pr-[14vw] will-change-transform'
          }`}
        >
          {panels.map((panel, index) => {
            const Heading = index === 0 ? 'h1' : 'h2';
            return (
              <article
                key={panel.number}
                className={`relative isolate flex shrink-0 items-center border-l border-[#6b1c23]/20 ${
                  useVerticalLayout
                    ? 'min-h-svh w-full overflow-visible'
                    : 'h-svh w-[86vw] overflow-hidden'
                }`}
                aria-labelledby={`panel-title-${panel.number}`}
              >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-[0.18em] -left-[0.05em] -z-10 select-none text-[clamp(8rem,34vw,34rem)] font-semibold leading-none tracking-[-0.09em] text-[#6b1c23] opacity-[0.06]"
              >
                {panel.number}
              </span>

              <div
                className={`relative flex w-full flex-col justify-between px-6 py-[clamp(1.25rem,4svh,3rem)] sm:px-12 lg:px-20 ${
                  useVerticalLayout ? 'min-h-svh' : 'h-full'
                }`}
              >
                {index === 0 ? (
                  <header className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src="/necf-logo.png"
                        alt="NECF logo"
                        className="h-11 w-11 object-contain sm:h-12 sm:w-12"
                      />
                      <div>
                        <p className="text-sm font-semibold tracking-[-0.02em] sm:text-base">
                          Near East Christian Fellowship
                        </p>
                        <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.17em] text-[#6b1c23]/70 sm:text-[0.68rem]">
                          Treasury management
                        </p>
                      </div>
                    </div>
                    <span className="hidden text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#6b1c23]/70 sm:block">
                      NECF / TREASURY
                    </span>
                  </header>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#6b1c23]/70">
                      NECF / TREASURY
                    </span>
                    <span className="text-xs tabular-nums text-[#211c19]/45">
                      0{index + 1} — 04
                    </span>
                  </div>
                )}

                <div className={index === 0 ? 'grid items-center gap-8 py-[clamp(1rem,4svh,3.5rem)] md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] md:gap-6' : 'py-[clamp(1rem,4svh,3.5rem)]'}>
                <div className="max-w-3xl">
                  <p className="mb-5 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#6b1c23] sm:text-xs">
                    {panel.eyebrow}
                  </p>
                  <Heading
                    id={`panel-title-${panel.number}`}
                    className="whitespace-pre-line text-[clamp(2rem,4vw,2.125rem)] font-medium leading-[1.12] tracking-[-0.025em]"
                  >
                    {panel.title}
                  </Heading>
                  <p className="mt-6 max-w-xl text-base leading-7 text-[#514a45] sm:mt-8 sm:text-lg sm:leading-8">
                    {panel.description}
                  </p>
                  {panel.actions.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-3 sm:mt-10">
                    {panel.actions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.route}
                          type="button"
                          onClick={() => navigate(action.route)}
                          className={`group inline-flex min-h-12 items-center justify-center gap-3 rounded-full border px-5 py-3 text-sm font-semibold transition-colors motion-reduce:transition-none ${
                            action.primary
                              ? 'border-[#6b1c23] bg-[#6b1c23] text-white hover:border-[#4a0e13] hover:bg-[#4a0e13]'
                              : 'border-[#211c19]/20 bg-white/70 text-[#211c19] hover:border-[#6b1c23]/50 hover:bg-white'
                          }`}
                        >
                          <Icon aria-hidden="true" fontSize="small" />
                          {action.label}
                          <ArrowForwardRounded
                            aria-hidden="true"
                            className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                            fontSize="small"
                          />
                        </button>
                      );
                    })}
                  </div>
                  )}
                </div>
                {index === 0 && (
                  <div className="landing-emblem" aria-hidden="true">
                    <div className="landing-emblem-orbit landing-emblem-orbit-outer" />
                    <div className="landing-emblem-orbit landing-emblem-orbit-inner" />
                    <div className="landing-emblem-scene">
                      <div className="landing-emblem-coin">
                        <img className="landing-emblem-face" src="/necf-logo.png" alt="" />
                        <img className="landing-emblem-face landing-emblem-back" src="/necf-logo.png" alt="" />
                      </div>
                    </div>
                    <span className="landing-emblem-caption">NECF / STEWARDSHIP</span>
                  </div>
                )}
                </div>

                <footer className="flex items-end justify-between gap-4 border-t border-[#211c19]/10 pt-4 text-[0.65rem] uppercase tracking-[0.15em] text-[#514a45]/70 sm:pt-5">
                  <span>Stewardship with care</span>
                  {index === 0 ? (
                    <span className="hidden items-center gap-2 sm:inline-flex">
                      Scroll to explore <span aria-hidden="true">↓</span>
                    </span>
                  ) : (
                    <span className="tabular-nums">0{index + 1} / 04</span>
                  )}
                </footer>
              </div>
              </article>
            );
          })}
        </motion.div>
      </div>
    </main>
  );
}
