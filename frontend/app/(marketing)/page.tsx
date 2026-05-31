import type { Metadata } from 'next'
import { Hero } from '@/components/marketing/Hero'
import { ScrollytellingTrace } from '@/components/marketing/ScrollytellingTrace'
import { DashboardPreview } from '@/components/marketing/DashboardPreview'
import { FeatureGrid } from '@/components/marketing/FeatureGrid'
import { SDKCodeSection } from '@/components/marketing/SDKCodeSection'
import { CredibilitySection } from '@/components/marketing/CredibilitySection'
import { FinalCTA } from '@/components/marketing/FinalCTA'

export const metadata: Metadata = {
  title: 'TraceLens — Trace, debug, and evaluate AI systems',
  description:
    'TraceLens gives RAG and LLM teams a clear view into requests, retrieval, model calls, latency, metadata, and evaluation scores. Open-source observability with a Python SDK and a dashboard.',
}

/**
 * Marketing homepage (Phase 8.2). Composes the animated landing sections.
 * Each section is its own client component; this page stays a thin server
 * component that just orders them.
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <ScrollytellingTrace />
      <DashboardPreview />
      <SDKCodeSection />
      <FeatureGrid />
      <CredibilitySection />
      <FinalCTA />
    </>
  )
}
