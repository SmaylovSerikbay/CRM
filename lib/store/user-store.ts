// Хранилище пользователей и их состояний

import { apiClient } from '@/lib/api/client';

export type UserRole = 'clinic' | 'employer';
export type ClinicUserRole = 'manager' | 'doctor' | 'profpathologist' | 'receptionist';

export interface User {
  id: string;
  phone: string;
  role: UserRole;
  clinicRole?: ClinicUserRole;
  registrationCompleted: boolean;
  registrationData?: {
    name: string;
    inn: string;
    address: string;
    contactPerson: string;
    email: string;
  };
  createdAt: string;
  lastLoginAt?: string;
}

class UserStore {
  private currentUser: User | null = null;

  async sendOTP(phone: string): Promise<void> {
    await apiClient.sendOTP(phone);
  }

  async verifyOTP(phone: string, otp: string): Promise<User> {
    const userData: any = await apiClient.verifyOTP(phone, otp);
    const user: User = {
      id: String(userData.id ?? ''),
      phone: userData.phone,
      role: userData.role,
      clinicRole: userData.clinic_role,
      registrationCompleted: userData.registration_completed,
      registrationData: userData.registration_data,
      createdAt: userData.created_at,
      lastLoginAt: userData.last_login_at,
    };
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem('userPhone', phone);
      localStorage.setItem('userData', JSON.stringify(user));
    }
    return user;
  }

  async completeRegistration(
    phone: string,
    role: UserRole,
    registrationData: User['registrationData'],
    clinicRole?: ClinicUserRole
  ): Promise<User> {
    const userData: any = await apiClient.completeRegistration(phone, role, registrationData, clinicRole);
    const user: User = {
      id: String(userData.id ?? ''),
      phone: userData.phone,
      role: userData.role,
      clinicRole: userData.clinic_role,
      registrationCompleted: userData.registration_completed,
      registrationData: userData.registration_data,
      createdAt: userData.created_at,
      lastLoginAt: userData.last_login_at,
    };
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem('userData', JSON.stringify(user));
    }
    return user;
  }

  getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser;
    
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('userData');
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
          return this.currentUser;
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  setCurrentUser(phone: string): void {
    // User is set after verifyOTP
  }

  updateUserRole(phone: string, role: UserRole, clinicRole?: ClinicUserRole): void {
    const user = this.getCurrentUser();
    if (user && user.phone === phone) {
      user.role = role;
      if (role === 'clinic' && clinicRole) {
        user.clinicRole = clinicRole;
      }
      this.currentUser = user;
      if (typeof window !== 'undefined') {
        localStorage.setItem('userData', JSON.stringify(user));
      }
    }
  }

  async updateClinicRole(phone: string, clinicRole: ClinicUserRole): Promise<User> {
    const user = this.getCurrentUser();
    if (!user || user.phone !== phone) {
      throw new Error('User not found');
    }
    
    // Обновляем роль через API
    const userData: any = await apiClient.completeRegistration(phone, 'clinic', user.registrationData, clinicRole);
    const updatedUser: User = {
      id: String(userData.id ?? ''),
      phone: userData.phone,
      role: userData.role,
      clinicRole: userData.clinic_role,
      registrationCompleted: userData.registration_completed,
      registrationData: userData.registration_data,
      createdAt: userData.created_at,
      lastLoginAt: userData.last_login_at,
    };
    this.currentUser = updatedUser;
    if (typeof window !== 'undefined') {
      localStorage.setItem('userData', JSON.stringify(updatedUser));
    }
    return updatedUser;
  }

  logout(): void {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userPhone');
      localStorage.removeItem('userData');
    }
  }
}

export const userStore = new UserStore();
