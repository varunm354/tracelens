import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'TraceLens',
  description: 'Observability and evaluation platform for RAG and AI agent systems',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Default to dark; suppressHydrationWarning prevents hydration mismatch
    // when the theme toggle changes the class client-side.
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/*
          Reads localStorage before first paint to apply the persisted theme.
          Prevents flash of light theme on a dark-preferred system.
          Runs synchronously so it completes before the browser paints.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('tracelens-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
