'use client'

import { useEffect, useState } from 'react'
import { checkKakaoMapStatus, analyzeKakaoMapError, forceReloadKakaoMap } from '@/lib/map/kakaoMapUtils'

export default function MapDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [issues, setIssues] = useState<string[]>([])

  useEffect(() => {
    const updateDebugInfo = () => {
      const info = checkKakaoMapStatus()
      const problems = analyzeKakaoMapError()

      setDebugInfo(info)
      setIssues(problems)
    }

    updateDebugInfo()

    // 1초마다 상태 업데이트
    const interval = setInterval(updateDebugInfo, 1000)

    return () => clearInterval(interval)
  }, [])

  // 개발 환경에서만 표시
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-sm z-50 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">🔧 카카오맵 디버그</h3>
        <button
          onClick={forceReloadKakaoMap}
          className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
        >
          새로고침
        </button>
      </div>

      {debugInfo && (
        <div className="space-y-1 mb-3">
          <div>Window: {debugInfo.windowExists ? '✅' : '❌'}</div>
          <div>Script: {debugInfo.scriptLoaded ? '✅' : '❌'}</div>
          <div>Kakao: {debugInfo.kakaoExists ? '✅' : '❌'}</div>
          <div>Maps: {debugInfo.mapsExists ? '✅' : '❌'}</div>
          <div>LatLng: {debugInfo.latLngExists ? '✅' : '❌'}</div>
          <div>API Key: {debugInfo.hasApiKey ? '✅' : '❌'}</div>
          {debugInfo.hasApiKey && (
            <div className="text-xs text-gray-300">
              Key: {debugInfo.apiKey?.substring(0, 8)}...
            </div>
          )}
        </div>
      )}

      {issues.length > 0 && (
        <div className="mb-3">
          <h4 className="font-semibold text-red-300 mb-1">❌ 문제점:</h4>
          <ul className="text-xs space-y-1">
            {issues.map((issue, index) => (
              <li key={index} className="text-red-200">• {issue}</li>
            ))}
          </ul>
        </div>
      )}

      {issues.length === 0 && debugInfo?.latLngExists && (
        <div className="text-green-300 font-semibold">✅ 모든 설정 완료!</div>
      )}

      {issues.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-300">
            💡 문제 해결: 새로고침 버튼 클릭 또는 F5
          </div>
        </div>
      )}
    </div>
  )
}
