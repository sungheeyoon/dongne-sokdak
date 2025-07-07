'use client';

import { useEffect, useState } from 'react';
import { useAdmin, UserManagement as UserData } from '../../hooks/useAdmin';
import { getRoleLabel as getRoleDisplay, getRoleBadgeColor } from '../../lib/constants/status';

interface UserRowProps {
  user: UserData;
  onRoleChange: (userId: string, role: string) => void;
  onToggleActive: (userId: string, activate: boolean) => void;
  canModifyRole: boolean;
}

const UserRow: React.FC<UserRowProps> = ({ user, onRoleChange, onToggleActive, canModifyRole }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newRole, setNewRole] = useState(user.role);

  const handleRoleSubmit = () => {
    if (newRole !== user.role) {
      onRoleChange(user.id, newRole);
    }
    setIsEditing(false);
  };

  return (
    <tr className="hover:bg-gray-50">
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
        {isEditing && canModifyRole ? (
          <div className="flex items-center space-x-2">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="user">일반사용자</option>
              <option value="moderator">중간관리자</option>
              <option value="admin">최고관리자</option>
            </select>
            <button
              onClick={handleRoleSubmit}
              className="text-green-600 hover:text-green-900"
            >
              ✓
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setNewRole(user.role);
              }}
              className="text-red-600 hover:text-red-900"
            >
              ✗
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
              {getRoleDisplay(user.role)}
            </span>
            {canModifyRole && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-900 text-sm"
              >
                편집
              </button>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {user.is_active ? '활성' : '비활성'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : '없음'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {user.login_count}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => onToggleActive(user.id, !user.is_active)}
          className={`${
            user.is_active
              ? 'text-red-600 hover:text-red-900'
              : 'text-green-600 hover:text-green-900'
          }`}
        >
          {user.is_active ? '비활성화' : '활성화'}
        </button>
      </td>
    </tr>
  );
};

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
  } = useAdmin();

  const [filters, setFilters] = useState({
    role: '',
    is_active: '',
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
    if (newFilters.is_active) params.is_active = newFilters.is_active === 'true';
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
          <h1 className="text-3xl font-bold text-gray-900">사용자 관리</h1>
          <p className="text-gray-600 mt-1">사용자 계정을 관리하고 권한을 설정합니다.</p>
        </div>

        {/* 필터 */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                역할
              </label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="user">일반사용자</option>
                <option value="moderator">중간관리자</option>
                <option value="admin">최고관리자</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                활성 상태
              </label>
              <select
                value={filters.is_active}
                onChange={(e) => handleFilterChange('is_active', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="닉네임 또는 이메일 검색"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ role: '', is_active: '', search: '' });
                  fetchUsers();
                }}
                className="w-full bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600"
              >
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
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <UserRow
                        user={user}
                        onRoleChange={handleRoleChange}
                        onToggleActive={handleToggleActive}
                        canModifyRole={isSuperAdmin()}
                      />
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