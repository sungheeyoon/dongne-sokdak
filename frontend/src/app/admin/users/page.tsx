'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../../hooks/useAdmin';
import UserManagement from '../../../components/admin/UserManagement';

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAdmin, checkAdminAccess, loading } = useAdmin();

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const hasAccess = await checkAdminAccess();
        if (!hasAccess) {
          router.push('/');
        }
      } catch (error) {
        console.error('Admin access check failed:', error);
        router.push('/');
      }
    };

    verifyAccess();
  }, [checkAdminAccess, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h1>
          <p className="text-gray-600 mb-4">관리자 권한이 필요한 페이지입니다.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UserManagement />
      </div>
    </div>
  );
}