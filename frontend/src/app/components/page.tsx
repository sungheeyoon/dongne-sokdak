'use client'

import { notFound } from 'next/navigation'
import UIShowcase from '@/shared/ui/demo/UIShowcase'

export default function ComponentsPage() {
  // 개발 환경이나 명시적으로 활성화된 경우에만 데모 페이지 노출
  const enableDemo = process.env.NEXT_PUBLIC_ENABLE_DEMO_ROUTES === 'true'
  
  if (!enableDemo && process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <UIShowcase />
}