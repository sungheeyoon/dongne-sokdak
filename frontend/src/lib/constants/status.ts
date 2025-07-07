// 상태 관련 상수 및 유틸리티

export const REPORT_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS', 
  RESOLVED: 'RESOLVED'
} as const;

export const REPORT_CATEGORY = {
  NOISE: 'NOISE',
  TRASH: 'TRASH',
  FACILITY: 'FACILITY',
  TRAFFIC: 'TRAFFIC',
  OTHER: 'OTHER'
} as const;

export const USER_ROLE = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
} as const;

// 상태별 색상 매핑
export const getStatusColor = (status: string) => {
  switch (status) {
    case REPORT_STATUS.OPEN: return 'bg-red-100 text-red-800';
    case REPORT_STATUS.IN_PROGRESS: return 'bg-yellow-100 text-yellow-800';
    case REPORT_STATUS.RESOLVED: return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// 카테고리 한글 매핑
export const getCategoryLabel = (category: string) => {
  switch (category) {
    case REPORT_CATEGORY.NOISE: return '소음';
    case REPORT_CATEGORY.TRASH: return '쓰레기';
    case REPORT_CATEGORY.FACILITY: return '시설';
    case REPORT_CATEGORY.TRAFFIC: return '교통';
    case REPORT_CATEGORY.OTHER: return '기타';
    default: return category;
  }
};

// 상태 한글 매핑
export const getStatusLabel = (status: string) => {
  switch (status) {
    case REPORT_STATUS.OPEN: return '접수됨';
    case REPORT_STATUS.IN_PROGRESS: return '처리중';
    case REPORT_STATUS.RESOLVED: return '해결됨';
    default: return status;
  }
};

// 역할 한글 매핑
export const getRoleLabel = (role: string) => {
  switch (role) {
    case USER_ROLE.ADMIN: return '최고관리자';
    case USER_ROLE.MODERATOR: return '중간관리자';
    case USER_ROLE.USER: return '일반사용자';
    default: return role;
  }
};

// 역할별 색상 매핑
export const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case USER_ROLE.ADMIN: return 'bg-purple-100 text-purple-800';
    case USER_ROLE.MODERATOR: return 'bg-blue-100 text-blue-800';
    case USER_ROLE.USER: return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};