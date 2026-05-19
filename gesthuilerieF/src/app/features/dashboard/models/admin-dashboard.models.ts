import { Huilerie } from '../../machines/models/enterprise.models';
import { ProductionDashboardSummary } from './production-dashboard.models';

export interface ApiResponseDTO<T> {
    data: T;
    message?: string;
    success?: boolean;
    errors?: string[];
}

export interface AdminDashboardSummary {
    selectedHuilerieId: number | null;
    selectedHuilerieNom: string | null;
    allHuileries: boolean;
    productionDashboard: ProductionDashboardSummary | null;
    userStats: AdminUserStats | null;
}

export interface AdminUserStats {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    adminUsers: number;
    employeeUsers: number;
    profilesConfiguredCount: number;
    profiles: AdminProfileStat[];
    huileries: AdminHuilerieStat[];
}

export interface AdminProfileStat {
    profilId: number;
    profilNom: string;
    usersCount: number;
    activeUsers: number;
}

export interface AdminHuilerieStat {
    huilerieId: number;
    huilerieNom: string;
    usersCount: number;
    activeUsers: number;
}

export type HuilerieOption = Huilerie;