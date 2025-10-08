import { apiSlice } from '../../../store/apiSlice';

export interface ActivityItem {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  description: string;
  type?: string;
  severity?: 'info' | 'warning' | 'error';
}

export interface BotStatus {
  botNumber: number;
  botName: string;
  total: number;
  configured: number;
  status: 'good' | 'warning' | 'danger';
}

export interface UserDashboardData {
  bots?: BotStatus[];
  empresa?: {
    id: number;
    nombre: string;
    descripcion?: string;
  };
  recentActivity: ActivityItem[];
}

export interface AdminDashboardData {
  usersCount: number;
  bots: {
    id: number;
    name: string;
  }[];
  botCompleteness: {
    botId: number;
    botName: string;
    completedPercentage: number;
  }[];
  recentActivity: ActivityItem[];
  users: {
    id: number;
    email: string;
    role: string;
    botsEnabled: number[];
    lastActive: string;
  }[];
  clientsCount: number;
}

export interface SuperAdminDashboardData {
  empresasCount: number;
  totalUsersCount: number;
  activeBotsCount: number;
  totalBots: number;
  serverUsage: number;
  empresasStats: {
    month: string;
    count: number;
  }[];
  empresas: {
    id: number;
    nombre: string;
    descripcion: string | null;
    usuariosCount: number;
    createdAt: string;
    updatedAt: string;
  }[];
  systemActivity: ActivityItem[];
  totalTextsCount: number;
  pendingTextsCount: number;
  completedTextsCount: number;
  processedToday: number;
  recentActivity: ActivityItem[];
}

export const dashboardApiSlice = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getUserDashboard: builder.query<UserDashboardData, void>({
      query: () => '/dashboard/user',
      providesTags: ['Dashboard'],
    }),
    getAdminDashboard: builder.query<AdminDashboardData, void>({
      query: () => '/dashboard/admin',
      providesTags: ['Dashboard'],
    }),
    getSuperAdminDashboard: builder.query<SuperAdminDashboardData, void>({
      query: () => '/dashboard/superadmin',
      providesTags: ['Dashboard'],
    }),
    refreshDashboard: builder.mutation<{ success: boolean }, void>({
      query: () => ({
        url: '/dashboard/refresh',
        method: 'POST',
      }),
      invalidatesTags: ['Dashboard'],
    }),
  }),
});

export const {
  useGetUserDashboardQuery,
  useGetAdminDashboardQuery,
  useGetSuperAdminDashboardQuery,
  useRefreshDashboardMutation,
} = dashboardApiSlice;
