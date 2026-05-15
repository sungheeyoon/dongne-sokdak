'use client'

import { useEffect, useState } from 'react'
import {
  PortfolioNoticeModal,
  PORTFOLIO_NOTICE_STORAGE_KEY,
  PORTFOLIO_NOTICE_VERSION,
} from '@/shared/ui/PortfolioNoticeModal'

export default function PortfolioNoticeMount() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SHOW_PORTFOLIO_NOTICE !== 'true') return

    try {
      const dismissed = window.localStorage.getItem(PORTFOLIO_NOTICE_STORAGE_KEY)
      if (dismissed !== PORTFOLIO_NOTICE_VERSION) {
        setIsOpen(true)
      }
    } catch {
      setIsOpen(true)
    }
  }, [])

  if (!isOpen) return null

  return <PortfolioNoticeModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
}
