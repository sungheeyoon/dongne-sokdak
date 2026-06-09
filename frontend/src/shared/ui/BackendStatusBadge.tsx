'use client'

import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '@/lib/api/config'
import { debugLog } from '@/lib/utils/logger'

type WakeStatus = 'pending' | 'ready' | 'failed'

// 깨어있는 동안 백엔드가 다시 잠들지 않도록 주기적으로 상태를 갱신한다(탭 활성 시 keep-alive 역할).
const POLL_INTERVAL_MS = 60_000

export const getHealthCheckUrl = (): string => {
  // /health/live는 DB 호출이 없는 liveness 엔드포인트라 Supabase 장애 시에도 hang 없이 빠르게 응답한다.
  // API_BASE_URL은 ".../api/v1"까지 포함되어 있을 수 있으므로 루트 도메인을 추출한다.
  try {
    const url = new URL(API_BASE_URL)
    return `${url.origin}/health/live`
  } catch {
    return `${API_BASE_URL.replace(/\/api\/v\d+\/?$/, '')}/health/live`
  }
}

const STATUS_META: Record<WakeStatus, { dot: string; label: string }> = {
  pending: { dot: 'bg-amber-400 animate-pulse', label: '깨우는 중' },
  ready: { dot: 'bg-emerald-500', label: '서버 정상' },
  failed: { dot: 'bg-gray-400', label: '응답 없음' },
}

export function BackendStatusBadge() {
  const [status, setStatus] = useState<WakeStatus>('pending')
  // 최초 폴링만 'pending'을 노출하고, 이후 주기적 갱신은 깜빡임 없이 조용히 결과만 반영한다.
  const firstLoadRef = useRef(true)

  useEffect(() => {
    const controller = new AbortController()

    const ping = () => {
      fetch(getHealthCheckUrl(), {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })
        .then((res) => setStatus(res.ok ? 'ready' : 'failed'))
        .catch((err) => {
          if (controller.signal.aborted) return
          debugLog('[BackendStatusBadge] health check failed', err)
          setStatus('failed')
        })
        .finally(() => {
          firstLoadRef.current = false
        })
    }

    ping()
    const id = window.setInterval(ping, POLL_INTERVAL_MS)

    return () => {
      controller.abort()
      window.clearInterval(id)
    }
  }, [])

  const meta = STATUS_META[status]

  return (
    <div className="group fixed right-3 top-3 z-50 select-none">
      <div
        role="status"
        aria-label={`데모 서버 상태: ${meta.label}`}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur"
      >
        <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} />
        <span>데모 · {meta.label}</span>
      </div>

      {/* 호버 시 안내 툴팁: 콜드 스타트 + 더미 데이터 */}
      <div className="pointer-events-none absolute right-0 top-full mt-2 w-64 rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-600 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        <p className="mb-2">
          <span className="mr-1">⏱</span>
          백엔드가 Render 무료 플랜으로 운영되어 첫 요청 시{' '}
          <strong className="text-gray-900">30초~1분</strong> 지연될 수 있어요.
        </p>
        <p>
          <span className="mr-1">📦</span>
          표시되는 제보·댓글은 모두 데모용 더미 데이터입니다.
        </p>
      </div>
    </div>
  )
}

export default BackendStatusBadge
