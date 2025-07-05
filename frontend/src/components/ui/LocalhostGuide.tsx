'use client'

import { useState } from 'react'

export default function LocalhostGuide() {
  const [isVisible, setIsVisible] = useState(true)

  // IP 주소로 접근하는 경우만 표시
  const isIPAccess = typeof window !== 'undefined' && 
    (window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/) || 
     window.location.hostname === '172.24.19.106')

  if (!isIPAccess || !isVisible) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg z-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span className="text-blue-600 text-lg mr-2">🗺️</span>
            <h4 className="font-semibold text-blue-900">카카오맵 사용 가능</h4>
          </div>
          
          <p className="text-blue-800 text-sm mb-3">
            실제 카카오맵을 사용하려면 localhost로 접속하세요:
          </p>
          
          <div className="bg-blue-100 p-2 rounded text-xs font-mono text-blue-900 mb-3">
            http://localhost:3000
          </div>
          
          <p className="text-blue-700 text-xs">
            현재는 IP 주소 접근으로 인해 임시 지도를 표시합니다.
          </p>
        </div>
        
        <button
          onClick={() => setIsVisible(false)}
          className="text-blue-400 hover:text-blue-600 ml-2 touch-manipulation"
        >
          ✕
        </button>
      </div>
    </div>
  )
}