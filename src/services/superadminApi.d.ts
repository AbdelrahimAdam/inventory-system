// src/services/superadminApi.d.ts
export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  username: string;
  role_id: number;
  role_name?: string;
  is_active: boolean;
  is_locked: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export const enhancedSuperadminApi: {
  safeGetUsers: (params?: any) => Promise<any>;
  safeCreateUser: (data: any) => Promise<any>;
  safeGetRoles: () => Promise<any>;
  safeUpdateUser: (id: number, data: any) => Promise<any>;
  safeDeleteUser: (id: number) => Promise<any>;
  checkApiHealth: () => Promise<any>;
};

export const debugSuperAdminAccess: () => Promise<any>;
export const handleApiError: (error: any, context?: string) => any;