'use client';

import { useState, useEffect } from 'react';

type Breakpoint = 'compact' | 'medium';

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('compact');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width >= 768) {
        setBreakpoint('medium');
      } else {
        setBreakpoint('compact');
      }
    };

    // 초기 값 설정
    updateBreakpoint();

    // 리사이즈 이벤트 리스너 등록
    window.addEventListener('resize', updateBreakpoint);

    // 클린업
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}