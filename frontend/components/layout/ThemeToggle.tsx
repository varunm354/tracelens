'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  // Start with true (dark) to match the server-rendered default; useEffect corrects
  // it from localStorage before first user interaction, avoiding a hydration mismatch.
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('tracelens-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('tracelens-theme', 'light')
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center w-7 h-7 rounded-md
                 text-muted-foreground hover:text-foreground hover:bg-accent
                 transition-colors"
    >
      {isDark
        ? <Sun className="w-3.5 h-3.5" />
        : <Moon className="w-3.5 h-3.5" />}
    </button>
  )
}
