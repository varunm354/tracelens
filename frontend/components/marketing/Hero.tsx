'use client'

import Link from 'next/link'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Github } from 'lucide-react'
import { wordContainer, wordChild, fadeUp, fadeOnly } from '@/components/marketing/motion/variants'
import { AnimatedTraceMockup } from '@/components/marketing/AnimatedTraceMockup'
import { FloatingNodes } from '@/components/marketing/motion/FloatingNodes'
import { TraceBeam } from '@/components/marketing/motion/TraceBeam'

const HEADLINE = ['Trace,', 'debug,', 'and', 'evaluate', 'AI', 'systems.']

export function Hero() {
  const reduced = useReducedMotion()
  const itemVariant = reduced ? fadeOnly : fadeUp

  // Gentle parallax: background glows drift up as the hero scrolls away.
  const { scrollY } = useScroll()
  const glowY = useTransform(scrollY, [0, 600], [0, -80])
  const mockupY = useTransform(scrollY, [0, 600], [0, 60])

  return (
    <section
      id="hero"
      className="relative overflow-hidden px-6 pb-24 pt-20 sm:pt-28"
    >
      {/* Background: layered aurora glows + grid texture + grain + nodes */}
      <motion.div
        aria-hidden
        style={reduced ? undefined : { y: glowY }}
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-grid mask-radial-faded opacity-[0.5]" />
        {/* Primary brand glow */}
        <div
          className="absolute left-1/2 top-[-10%] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full opacity-50 blur-3xl animate-glow-drift"
          style={{
            background:
              'radial-gradient(circle, hsl(var(--brand) / 0.25), transparent 60%)',
          }}
        />
        {/* Secondary, slower, counter-drifting retrieval-tinted glow for depth */}
        <div
          className="absolute right-[8%] top-[20%] h-[28rem] w-[28rem] rounded-full blur-3xl animate-glow-drift-slow"
          style={{
            background:
              'radial-gradient(circle, hsl(var(--kind-retrieval) / 0.18), transparent 65%)',
          }}
        />
        <div
          className="absolute left-[2%] top-[40%] h-[24rem] w-[24rem] rounded-full blur-3xl animate-glow-drift-slow"
          style={{
            animationDelay: '-8s',
            background:
              'radial-gradient(circle, hsl(var(--kind-evaluation) / 0.14), transparent 65%)',
          }}
        />
        {/* Fine grain to remove gradient banding */}
        <div className="absolute inset-0 bg-noise opacity-[0.18] mix-blend-soft-light" />
        {/* Ambient floating nodes */}
        <FloatingNodes count={20} accent="brand" className="opacity-70" />
        {/* Flowing trace path across the hero */}
        <TraceBeam className="left-0 top-[58%] h-40 w-full opacity-60" duration={5} />
      </motion.div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        {/* Left: copy */}
        <div>
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 backdrop-blur-sm"
          >
            <span className="relative flex h-1.5 w-1.5">
              {!reduced && (
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                  style={{ backgroundColor: 'hsl(var(--score-pass))' }}
                />
              )}
              <span
                className="relative inline-flex h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: 'hsl(var(--score-pass))' }}
              />
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              Observability for RAG &amp; AI agents
            </span>
          </motion.div>

          {/* Staggered headline */}
          <motion.h1
            variants={reduced ? fadeOnly : wordContainer}
            initial="hidden"
            animate="visible"
            className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
          >
            {HEADLINE.map((word, i) => (
              <motion.span
                key={i}
                variants={reduced ? undefined : wordChild}
                className="mr-[0.25em] inline-block"
              >
                {word === 'AI' ? (
                  <span
                    className="animate-text-gradient"
                    style={{
                      background:
                        'linear-gradient(120deg, hsl(var(--kind-retrieval)), hsl(var(--brand)), hsl(var(--kind-evaluation)), hsl(var(--brand)), hsl(var(--kind-retrieval)))',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    {word}
                  </span>
                ) : (
                  word
                )}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            variants={itemVariant}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.5 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            TraceLens gives RAG and LLM teams a clear view into requests, retrieval,
            model calls, latency, metadata, and evaluation scores — in one place.
          </motion.p>

          <motion.div
            variants={itemVariant}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.62 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href="/traces"
              className="btn-sheen group inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: 'hsl(var(--brand))',
                boxShadow: '0 8px 30px hsl(var(--brand) / 0.35)',
              }}
            >
              Open dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://github.com/varunm354/tracelens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card/60 px-5 py-2.5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-accent"
            >
              <Github className="h-4 w-4" />
              View GitHub
            </a>
          </motion.div>
        </div>

        {/* Right: animated mockup */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex justify-center lg:justify-end"
        >
          <AnimatedTraceMockup />
        </motion.div>
      </div>
    </section>
  )
}
