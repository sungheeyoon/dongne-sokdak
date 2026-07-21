'use client'

import { createPortal } from 'react-dom'
import { Report as ReportType } from '@/types'
import { ProximityGroup } from '@/features/map/domain/proximityGrouping'
import { UiBottomSheet } from '@/shared/ui/UiBottomSheet'
import { ReportCard } from '@/shared/ui/ReportCard'

interface ProximityGroupSheetProps {
  group: ProximityGroup<ReportType>
  onClose: () => void
  onSelectReport: (report: ReportType) => void
}

// react-kakao-maps-sdk의 <Map> 자식 트리 안에서 렌더링되므로(MapMarkerLayer), 지도
// 캔버스 레이아웃과 무관하게 뜨도록 document.body로 포탈링한다.
export function ProximityGroupSheet({ group, onClose, onSelectReport }: ProximityGroupSheetProps) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <UiBottomSheet isOpen onClose={onClose} title={`이 근처 제보 ${group.members.length}건`}>
      <div className="space-y-3">
        {group.members.map((report) => (
          <ReportCard
            key={report.id}
            id={report.id}
            title={report.title}
            description={report.description}
            category={report.category as 'NOISE' | 'TRASH' | 'FACILITY' | 'TRAFFIC' | 'OTHER'}
            status={report.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'}
            imageUrl={report.imageUrl}
            address={report.address}
            location={report.location}
            voteCount={report.voteCount}
            commentCount={report.commentCount}
            createdAt={report.createdAt}
            size="compact"
            onClick={() => onSelectReport(report)}
          />
        ))}
      </div>
    </UiBottomSheet>,
    document.body
  )
}
