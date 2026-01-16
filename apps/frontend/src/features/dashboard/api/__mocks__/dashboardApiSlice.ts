/**
 * Mock manual para dashboardApiSlice
 */
const { jest } = require('@jest/globals');

export const useGetUserDashboardQuery = jest.fn();
export const useGetAdminDashboardQuery = jest.fn();
export const useGetSuperAdminDashboardQuery = jest.fn();
export const useRefreshDashboardMutation = jest.fn();

export const dashboardApiSlice = {
  reducer: 'dashboardReducer',
  reducerPath: 'dashboardApi',
  endpoints: {
    getUserDashboard: {},
    getAdminDashboard: {},
    getSuperAdminDashboard: {},
    refreshDashboard: {},
  },
  util: {
    prefetch: jest.fn(),
  },
};
