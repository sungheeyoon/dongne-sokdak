'use client'

import { useEffect, useState } from 'react'
import { BaseModal } from './UiBaseModal'
import { Button } from './UiButton'
import { API_BASE_URL } from '@/lib/api/config'
import { debugLog } from '@/lib/utils/logger'

export const PORTFOLIO_NOTICE_STORAGE_KEY = 'dongne-sokdak:portfolio-notice-dismissed'
export const PORTFOLIO_NOTICE_VERSION = 'v1'

type WakeStatus = 'pending' | 'ready' | 'failed'

const getHealthCheckUrl = (): string => {
  // /health/live는 DB 호출이 없는 liveness 엔드포인트라 Supabase 장애 시에도 hang 없이 빠르게 응답한다.
  // API_BASE_URL은 ".../api/v1"까지 포함되어 있을 수 있으므로 루트 도메인을 추출한다.
  try {
    const url = new URL(API_BASE_URL)
    return `${url.origin}/health/live`
  } catch {
    return `${API_BASE_URL.replace(/\/api\/v\d+\/?$/, '')}/health/live`
  }
}

export interface PortfolioNoticeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PortfolioNoticeModal({ isOpen, onClose }: PortfolioNoticeModalProps) {
  const [wakeStatus, setWakeStatus] = useState<WakeStatus>('pending')

  useEffect(() => {
    if (!isOpen) return

    const controller = new AbortController()
    setWakeStatus('pending')

    fetch(getHealthCheckUrl(), {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((res) => {
        setWakeStatus(res.ok ? 'ready' : 'failed')
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        debugLog('[PortfolioNotice] wake-up failed', err)
        setWakeStatus('failed')
      })

    return () => controller.abort()
  }, [isOpen])

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(PORTFOLIO_NOTICE_STORAGE_KEY, PORTFOLIO_NOTICE_VERSION)
    } catch (err) {
      debugLog('[PortfolioNotice] failed to persist dismissal', err)
    }
    onClose()
  }

  const statusLabel: Record<WakeStatus, { dot: string; text: string }> = {
    pending: { dot: 'bg-amber-400 animate-pulse', text: '서버 준비 중...' },
    ready: { dot: 'bg-emerald-500', text: '서버 준비 완료' },
    failed: { dot: 'bg-gray-400', text: '서버 응답 없음 — 잠시 후 다시 시도해 주세요' },
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEscape={false}
      title="👋 포트폴리오 데모 안내"
      footer={
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span
              data-testid="portfolio-notice-status-dot"
              className={`inline-block h-2 w-2 rounded-full ${statusLabel[wakeStatus].dot}`}
            />
            <span>{statusLabel[wakeStatus].text}</span>
          </div>
          <Button onClick={handleDismiss}>확인하고 시작하기</Button>
        </div>
      }
    >
      <div className="space-y-5 text-sm leading-relaxed text-gray-700">
        <p>이 사이트는 포트폴리오용 데모입니다. 시작하기 전에 두 가지만 안내 드릴게요.</p>

        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-1 font-semibold text-gray-900">📦 더미 데이터</h3>
          <p className="text-gray-600">
            표시되는 모든 제보·댓글은 실제 사용자 데이터가 아닌 데모용 더미 데이터입니다.
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-1 font-semibold text-gray-900">⏱️ 서버 콜드 스타트</h3>
          <p className="text-gray-600">
            백엔드(FastAPI)가 Render 무료 플랜으로 운영되어 첫 요청 시{' '}
            <strong className="text-gray-900">30초~1분</strong> 정도 응답이 지연될 수 있습니다.
            지금 자동으로 서버를 깨우고 있으니 잠시만 기다려 주세요.
          </p>
        </section>
      </div>
    </BaseModal>
  )
}

export default PortfolioNoticeModal
