'use client';

import { useEffect, useState } from 'react';
import { useAdminViewModel } from '../../features/admin/presentation/hooks/useAdminViewModel';
import { getRoleLabel as getRoleDisplay, getRoleBadgeColor } from '../../lib/constants/status';
import {
  Users, Search, Filter, RefreshCw,
  UserCheck, UserX, Crown
} from 'lucide-react';


export default function UserManagement() {
  const {
    users,
    fetchUsers,
    updateUserRole,
    toggleUserActive,
    loading,
    error,
    isAdmin,
    isSuperAdmin,
  } = useAdminViewModel();

  const [filters, setFilters] = useState({
    role: '',
    isActive: '',
    search: '',
  });

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // 필터 적용
    const params: any = {};
    if (newFilters.role) params.role = newFilters.role;
    if (newFilters.isActive) params.isActive = newFilters.isActive === 'true';
    if (newFilters.search) params.search = newFilters.search;

    fetchUsers(params);
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateUserRole(userId, role);
    } catch (error) {
      console.error('역할 변경 실패:', error);
    }
  };

  const handleToggleActive = async (userId: string, activate: boolean) => {
    try {
      await toggleUserActive(userId, activate);
    } catch (error) {
      console.error('계정 상태 변경 실패:', error);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === users.length
        ? []
        : users.map(user => user.id)
    );
  };

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h1>
          <p className="text-gray-600">관리자 권한이 필요한 페이지입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center">
            <Users className="w-8 h-8 mr-4 text-blue-600" />
            사용자 관리
          </h1>
          <p className="text-gray-600 mt-2 ml-12">사용자 계정을 관리하고 권한을 설정합니다.</p>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Filter className="w-5 h-5 mr-2 text-gray-600" />
            필터 및 검색
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Crown className="w-4 h-4 mr-1 text-purple-500" />
                역할
              </label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                <option value="user">일반사용자</option>
                <option value="moderator">중간관리자</option>
                <option value="admin">최고관리자</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <UserCheck className="w-4 h-4 mr-1 text-emerald-500" />
                활성 상태
              </label>
              <select
                value={filters.isActive}
                onChange={(e) => handleFilterChange('is_active', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">전체</option>
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Search className="w-4 h-4 mr-1 text-blue-500" />
                검색
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="닉네임 또는 이메일 검색"
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ role: '', isActive: '', search: '' });
                  fetchUsers();
                }}
                className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-medium flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                필터 초기화
              </button>
            </div>
          </div>
        </div>

        {/* 사용자 목록 */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                사용자 목록 ({users.length}명)
              </h2>
              {selectedUsers.length > 0 && (
                <div className="flex space-x-2">
                  <span className="text-sm text-gray-600">
                    {selectedUsers.length}명 선택됨
                  </span>
                  <button className="text-blue-600 hover:text-blue-900 text-sm">
                    일괄 활성화
                  </button>
                  <button className="text-red-600 hover:text-red-900 text-sm">
                    일괄 비활성화
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">사용자 목록을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-600 mb-4">⚠️</div>
              <p className="text-red-600">{error}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      사용자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      역할
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      마지막 로그인
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      로그인 수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      가입일
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.nickname.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.nickname}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {getRoleDisplay(user.role)}
                          </span>
                          {isSuperAdmin() && (
                            <select
                              value={user.role}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              className="text-sm border rounded px-2 py-1 bg-white"
                            >
                              <option value="user">일반사용자</option>
                              <option value="moderator">중간관리자</option>
                              <option value="admin">최고관리자</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {user.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '없음'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.loginCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleToggleActive(user.id, !user.isActive)}
                          className={`flex items-center px-3 py-1 rounded-lg font-medium transition-all duration-200 ${user.isActive
                              ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                        >
                          {user.isActive ? (
                            <>
                              <UserX className="w-4 h-4 mr-1" />
                              비활성화
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-1" />
                              활성화
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}