'use client'

import { BackendStatusBadge } from '@/shared/ui/BackendStatusBadge'

export default function PortfolioNoticeMount() {
  if (process.env.NEXT_PUBLIC_SHOW_PORTFOLIO_NOTICE !== 'true') return null

  return <BackendStatusBadge />
}
