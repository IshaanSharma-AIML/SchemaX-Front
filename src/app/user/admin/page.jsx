// Admin panel page for managing users and roles
'use client';

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchUsers, 
  updateUserRole, 
  updateUserStatus,
  fetchRoles,
  setFilterRole,
  clearSelectedUser
} from '@/lib/store/users-panel/admin/adminSlice';
import { 
  FaUsers, 
  FaUserShield, 
  FaUserTie, 
  FaUser, 
  FaEye, 
  FaBan,
  FaCheckCircle,
  FaTimesCircle,
  FaFilter,
  FaSearch,
  FaSync
} from 'react-icons/fa';

const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  user: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

const ROLE_ICONS = {
  admin: FaUserShield,
  manager: FaUserTie,
  user: FaUser,
  viewer: FaEye,
};

const RoleSelector = ({ currentRole, userId, onRoleChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [reason, setReason] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const dispatch = useDispatch();
  const { status } = useSelector(state => state.admin);

  const roles = ['admin', 'manager', 'user', 'viewer'];

  const handleRoleSelect = (role) => {
    if (role === currentRole) {
      setIsOpen(false);
      return;
    }
    setSelectedRole(role);
    setShowReasonModal(true);
    setIsOpen(false);
  };

  const handleConfirmRoleChange = async () => {
    try {
      await dispatch(updateUserRole({
        userId,
        newRole: selectedRole,
        reason: reason || `Role changed from ${currentRole} to ${selectedRole}`
      })).unwrap();
      setShowReasonModal(false);
      setReason('');
      onRoleChange();
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const RoleIcon = ROLE_ICONS[selectedRole] || FaUser;

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={status === 'loading'}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
            ${ROLE_COLORS[selectedRole] || ROLE_COLORS.user}
            hover:opacity-80 transition-opacity
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          <RoleIcon className="w-4 h-4" />
          <span className="capitalize">{selectedRole}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              {roles.map((role) => {
                const Icon = ROLE_ICONS[role];
                return (
                  <button
                    key={role}
                    onClick={() => handleRoleSelect(role)}
                    className={`
                      w-full flex items-center gap-2 px-4 py-2 text-left text-sm
                      hover:bg-gray-100 dark:hover:bg-gray-700
                      ${role === selectedRole ? 'bg-gray-50 dark:bg-gray-700' : ''}
                      first:rounded-t-lg last:rounded-b-lg
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="capitalize">{role}</span>
                    {role === currentRole && (
                      <span className="ml-auto text-xs text-gray-500">(current)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Change User Role
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Changing role from <span className="font-medium capitalize">{currentRole}</span> to{' '}
              <span className="font-medium capitalize">{selectedRole}</span>
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason (optional):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for role change..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setReason('');
                  setSelectedRole(currentRole);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 
                         rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRoleChange}
                disabled={status === 'loading'}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg 
                         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const AdminPanel = () => {
  const dispatch = useDispatch();
  const { users, pagination, status, error, filterRole, roles } = useSelector(state => state.admin);
  const { user: currentUser } = useSelector(state => state.auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchUsers({ page, limit: 50, role: filterRole }));
      dispatch(fetchRoles());
    }
  }, [dispatch, page, filterRole, isAdmin]);

  const handleRoleChange = () => {
    dispatch(fetchUsers({ page, limit: 50, role: filterRole }));
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      await dispatch(updateUserStatus({
        userId,
        isActive: !currentStatus
      })).unwrap();
      dispatch(fetchUsers({ page, limit: 50, role: filterRole }));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(search) ||
      user.name?.toLowerCase().includes(search)
    );
  });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <FaUserShield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need administrator privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          User Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage users, roles, and permissions
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 
                       rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <select
              value={filterRole || ''}
              onChange={(e) => {
                dispatch(setFilterRole(e.target.value || null));
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="user">User</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={() => dispatch(fetchUsers({ page, limit: 50, role: filterRole }))}
            disabled={status === 'loading'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FaSync className={status === 'loading' ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {status === 'loading' && users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">Error: {error}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RoleSelector
                        currentRole={user.role}
                        userId={user.id}
                        onRoleChange={handleRoleChange}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`
                        inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                        ${user.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }
                      `}>
                        {user.is_active ? (
                          <><FaCheckCircle /> Active</>
                        ) : (
                          <><FaTimesCircle /> Inactive</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleStatusToggle(user.id, user.is_active)}
                        className={`
                          px-3 py-1 rounded-lg text-xs font-medium transition-colors
                          ${user.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                          }
                        `}
                      >
                        {user.is_active ? (
                          <><FaBan className="inline mr-1" /> Deactivate</>
                        ) : (
                          <><FaCheckCircle className="inline mr-1" /> Activate</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} users
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
