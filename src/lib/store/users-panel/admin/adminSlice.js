// Admin slice for managing users and roles
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api';

// Get auth token from localStorage
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

// Helper function to make API requests
const makeApiRequest = async (url, method = 'GET', body = null) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
    throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
};

// Async thunks
export const fetchUsers = createAsyncThunk(
  'admin/fetchUsers',
  async ({ page = 1, limit = 50, role = null }, { rejectWithValue }) => {
    try {
      let url = `${API_URL}/admin/users?page=${page}&limit=${limit}`;
      if (role) {
        url += `&role=${role}`;
      }
      
      const data = await makeApiRequest(url, 'GET');
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch users');
    }
  }
);

export const fetchUser = createAsyncThunk(
  'admin/fetchUser',
  async (userId, { rejectWithValue }) => {
    try {
      const data = await makeApiRequest(`${API_URL}/admin/users/${userId}`, 'GET');
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch user');
    }
  }
);

export const updateUserRole = createAsyncThunk(
  'admin/updateUserRole',
  async ({ userId, newRole, reason = null }, { rejectWithValue }) => {
    try {
      let url = `${API_URL}/admin/users/${userId}/role?new_role=${newRole}`;
      if (reason) {
        url += `&reason=${encodeURIComponent(reason)}`;
      }
      const data = await makeApiRequest(url, 'PUT');
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update user role');
    }
  }
);

export const updateUserStatus = createAsyncThunk(
  'admin/updateUserStatus',
  async ({ userId, isActive }, { rejectWithValue }) => {
    try {
      const data = await makeApiRequest(
        `${API_URL}/admin/users/${userId}/status?is_active=${isActive}`,
        'PUT'
      );
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update user status');
    }
  }
);

export const fetchRoles = createAsyncThunk(
  'admin/fetchRoles',
  async (_, { rejectWithValue }) => {
    try {
      const data = await makeApiRequest(`${API_URL}/admin/roles`, 'GET');
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch roles');
    }
  }
);

export const fetchAuditLog = createAsyncThunk(
  'admin/fetchAuditLog',
  async ({ page = 1, limit = 50, userId = null }, { rejectWithValue }) => {
    try {
      let url = `${API_URL}/admin/audit-log?page=${page}&limit=${limit}`;
      if (userId) {
        url += `&user_id=${userId}`;
      }
      
      const data = await makeApiRequest(url, 'GET');
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch audit log');
    }
  }
);

// Initial state
const initialState = {
  users: [],
  selectedUser: null,
  roles: [],
  auditLog: [],
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  },
  status: 'idle',
  error: null,
  filterRole: null,
};

// Slice
const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setFilterRole: (state, action) => {
      state.filterRole = action.payload;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
    resetAdminState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // Fetch users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.users = action.payload.data.users;
        state.pagination = action.payload.data.pagination;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch user
    builder
      .addCase(fetchUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedUser = action.payload.data;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Update user role
    builder
      .addCase(updateUserRole.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Update user in list
        const userId = action.payload.data.user_id;
        const userIndex = state.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          state.users[userIndex].role = action.payload.data.new_role;
        }
        // Update selected user if it's the same
        if (state.selectedUser && state.selectedUser.id === userId) {
          state.selectedUser.role = action.payload.data.new_role;
        }
      })
      .addCase(updateUserRole.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Update user status
    builder
      .addCase(updateUserStatus.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // Refresh users list
      })
      .addCase(updateUserStatus.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });

    // Fetch roles
    builder
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.roles = action.payload.data.roles;
      });

    // Fetch audit log
    builder
      .addCase(fetchAuditLog.fulfilled, (state, action) => {
        state.auditLog = action.payload.data.logs;
      });
  },
});

export const { setFilterRole, clearSelectedUser, resetAdminState } = adminSlice.actions;
export default adminSlice.reducer;
