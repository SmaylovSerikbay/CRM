// API интеграция для workflow-store

import { apiClient } from '@/lib/api/client';
import { userStore } from './user-store';

export interface ContingentEmployee {
  id: string;
  name: string;
  position: string;
  department: string;
  iin: string;
  phone?: string;
  birthDate?: string;
  gender?: 'male' | 'female';
  harmfulFactors: string[];
  requiresExamination: boolean;
  lastExaminationDate?: string;
  nextExaminationDate?: string;
  totalExperienceYears?: number;
  positionExperienceYears?: number;
  notes?: string;
  quarter?: string;
  contractId?: string;
  contractNumber?: string;
  employerName?: string;
  routeSheetInfo?: {
    visit_date?: string;
    time_range?: string;
    doctors?: Array<{
      name: string;
      specialization: string;
      cabinet?: string;
      time?: string;
    }>;
    services_count?: number;
  };
}

export interface CalendarPlan {
  id: string;
  contractId?: string;
  contractNumber?: string;
  department: string;
  startDate: string;
  endDate: string;
  employeeIds: string[];
  departmentsInfo?: Array<{
    department: string;
    startDate: string;
    endDate: string;
    employeeIds: string[];
  }>;
  harmfulFactors?: string[];
  selectedDoctors?: string[];
  status: 'draft' | 'pending_clinic' | 'pending_employer' | 'approved' | 'rejected' | 'sent_to_ses';
  clinicName?: string;
  clinicDirector?: string;
  employerName?: string;
  employerRepresentative?: string;
  sesRepresentative?: string;
  rejectionReason?: string;
  rejectedByEmployerAt?: string;
  createdAt: string;
  approvedByClinicAt?: string;
  approvedByEmployerAt?: string;
  sentToSESAt?: string;
}

export interface RouteSheet {
  id: string;
  patientId: string;
  patientName: string;
  iin: string;
  position: string;
  department: string;
  visitDate: string;
  services: {
    id: string;
    name: string;
    cabinet: string;
    doctorId: string;
    specialization?: string;
    time?: string;
    status: 'pending' | 'completed';
  }[];
}

export interface DoctorExamination {
  id?: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  conclusion: 'healthy' | 'unhealthy' | null;
  notes: string;
  examinationDate: string;
  doctorSignature?: string;
  recommendations?: string;
}

export interface Expertise {
  id: string;
  patientId: string;
  patientName: string;
  iin: string;
  position: string;
  department: string;
  doctorConclusions: DoctorExamination[];
  finalVerdict?: 'fit' | 'temporary_unfit' | 'permanent_unfit';
  healthGroup?: '1' | '2' | '3' | '4' | '5' | '6';
  verdictDate?: string;
  profpathologistName?: string;
  profpathologistSignature?: string;
  temporaryUnfitUntil?: string;
  reason?: string;
  requiresReferral?: boolean;
  referralType?: 'rehabilitation' | 'profpathology' | 'specialist';
  referralSent?: boolean;
  referralDate?: string;
}

class WorkflowStoreAPI {
  private getUserId(): string {
    const user = userStore.getCurrentUser();
    if (!user) throw new Error('User not authenticated');
    return user.id;
  }

  async getContingent(): Promise<ContingentEmployee[]> {
    const userId = this.getUserId();
    const data: any = await apiClient.getContingent(userId);
    const results = Array.isArray(data) ? data : (data.results || []);
    return results.map((emp: any) => ({
      id: emp.id.toString(),
      name: emp.name,
      position: emp.position,
      department: emp.department,
      iin: emp.iin,
      phone: emp.phone,
      birthDate: emp.birth_date,
      gender: emp.gender,
      harmfulFactors: emp.harmful_factors || [],
      requiresExamination: emp.requires_examination !== false,
      lastExaminationDate: emp.last_examination_date,
      nextExaminationDate: emp.next_examination_date,
      totalExperienceYears: emp.total_experience_years,
      positionExperienceYears: emp.position_experience_years,
      notes: emp.notes,
      quarter: emp.quarter,
      contractId: emp.contract ? emp.contract.toString() : undefined,
      contractNumber: emp.contract_number || undefined,
      employerName: emp.employer_name || undefined,
      routeSheetInfo: emp.route_sheet_info || undefined,
    }));
  }

  async getContingentByContract(contractId: string): Promise<ContingentEmployee[]> {
    const userId = this.getUserId();
    const data: any = await apiClient.getContingentByContract(userId, contractId);
    const results = Array.isArray(data) ? data : (data.results || []);
    return results.map((emp: any) => ({
      id: emp.id.toString(),
      name: emp.name,
      position: emp.position,
      department: emp.department,
      iin: emp.iin,
      phone: emp.phone,
      birthDate: emp.birth_date,
      gender: emp.gender,
      harmfulFactors: emp.harmful_factors || [],
      requiresExamination: emp.requires_examination !== false,
      lastExaminationDate: emp.last_examination_date,
      nextExaminationDate: emp.next_examination_date,
      totalExperienceYears: emp.total_experience_years,
      positionExperienceYears: emp.position_experience_years,
      notes: emp.notes,
      quarter: emp.quarter,
      contractId: emp.contract ? emp.contract.toString() : undefined,
      contractNumber: emp.contract_number || undefined,
      employerName: emp.employer_name || undefined,
      routeSheetInfo: emp.route_sheet_info || undefined,
    }));
  }

  getContingentByDepartment(department: string): ContingentEmployee[] {
    // Этот метод должен вызываться после getContingent, так как он работает с уже загруженными данными
    // В реальности нужно будет кэшировать или передавать данные
    return [];
  }

  async generateEmployeeQRCode(employeeId: string): Promise<string> {
    return await apiClient.generateEmployeeQRCode(employeeId);
  }

  async findEmployeeByQR(qrData: string): Promise<any> {
    return await apiClient.findEmployeeByQR(qrData);
  }

  async uploadExcelContingent(file: File, contractId?: string): Promise<{ 
    created: number; 
    skipped: number; 
    skipped_reasons?: {
      duplicate?: number;
      no_iin?: number;
      no_name?: number;
    };
  }> {
    const userId = this.getUserId();
    return await apiClient.uploadExcelContingent(userId, file, contractId);
  }

  async downloadContingentTemplate(): Promise<void> {
    await apiClient.downloadContingentTemplate();
  }

  async deleteContingentEmployee(employeeId: string): Promise<void> {
    const userId = this.getUserId();
    await apiClient.deleteContingentEmployee(userId, employeeId);
  }

  async deleteAllContingentEmployees(): Promise<void> {
    const userId = this.getUserId();
    await apiClient.deleteAllContingentEmployees(userId);
  }

  async updateContingentEmployee(userId: string, employeeId: string, data: Partial<ContingentEmployee>): Promise<ContingentEmployee> {
    // Преобразуем camelCase в snake_case для бэкенда
    const backendData: any = {};
    if (data.name !== undefined) backendData.name = data.name;
    if (data.position !== undefined) backendData.position = data.position;
    if (data.department !== undefined) backendData.department = data.department;
    if (data.birthDate !== undefined) backendData.birth_date = data.birthDate;
    if (data.gender !== undefined) backendData.gender = data.gender;
    if (data.harmfulFactors !== undefined) backendData.harmful_factors = data.harmfulFactors;
    if (data.lastExaminationDate !== undefined) backendData.last_examination_date = data.lastExaminationDate;
    if (data.totalExperienceYears !== undefined) backendData.total_experience_years = data.totalExperienceYears;
    if (data.positionExperienceYears !== undefined) backendData.position_experience_years = data.positionExperienceYears;
    if (data.notes !== undefined) backendData.notes = data.notes;
    if (data.iin !== undefined) backendData.iin = data.iin;
    if (data.phone !== undefined) backendData.phone = data.phone;
    
    const updated: any = await apiClient.updateContingentEmployee(userId, employeeId, backendData);
    return {
      id: updated.id.toString(),
      name: updated.name,
      position: updated.position,
      department: updated.department,
      iin: updated.iin,
      phone: updated.phone,
      birthDate: updated.birth_date,
      gender: updated.gender,
      harmfulFactors: updated.harmful_factors || [],
      requiresExamination: updated.requires_examination !== false,
      lastExaminationDate: updated.last_examination_date,
      nextExaminationDate: updated.next_examination_date,
      totalExperienceYears: updated.total_experience_years,
      positionExperienceYears: updated.position_experience_years,
      notes: updated.notes,
      quarter: updated.quarter,
      contractId: updated.contract ? updated.contract.toString() : undefined,
      contractNumber: updated.contract_number || undefined,
      employerName: updated.employer_name || undefined,
      routeSheetInfo: updated.route_sheet_info || undefined,
    };
  }

  async createContingentEmployee(data: Partial<ContingentEmployee> & { contractId: string }): Promise<ContingentEmployee> {
    const userId = this.getUserId();
    // Преобразуем camelCase в snake_case для бэкенда
    const backendData: any = {
      contract: parseInt(data.contractId, 10), // Преобразуем в число для ForeignKey
    };
    if (data.name !== undefined) backendData.name = data.name;
    if (data.position !== undefined) backendData.position = data.position;
    if (data.department !== undefined) backendData.department = data.department;
    if (data.birthDate !== undefined) backendData.birth_date = data.birthDate;
    if (data.gender !== undefined) backendData.gender = data.gender;
    if (data.harmfulFactors !== undefined) backendData.harmful_factors = data.harmfulFactors;
    if (data.lastExaminationDate !== undefined) backendData.last_examination_date = data.lastExaminationDate;
    if (data.totalExperienceYears !== undefined) backendData.total_experience_years = data.totalExperienceYears;
    if (data.positionExperienceYears !== undefined) backendData.position_experience_years = data.positionExperienceYears;
    if (data.notes !== undefined) backendData.notes = data.notes;
    if (data.iin !== undefined) backendData.iin = data.iin;
    if (data.phone !== undefined) backendData.phone = data.phone;
    if (data.quarter !== undefined) backendData.quarter = data.quarter;
    
    const created: any = await apiClient.createContingentEmployee(userId, backendData);
    return {
      id: created.id.toString(),
      name: created.name,
      position: created.position,
      department: created.department,
      iin: created.iin,
      phone: created.phone,
      birthDate: created.birth_date,
      gender: created.gender,
      harmfulFactors: created.harmful_factors || [],
      requiresExamination: created.requires_examination !== false,
      lastExaminationDate: created.last_examination_date,
      nextExaminationDate: created.next_examination_date,
      totalExperienceYears: created.total_experience_years,
      positionExperienceYears: created.position_experience_years,
      notes: created.notes,
      quarter: created.quarter,
      contractId: created.contract ? created.contract.toString() : undefined,
      contractNumber: created.contract_number || undefined,
      employerName: created.employer_name || undefined,
      routeSheetInfo: created.route_sheet_info || undefined,
    };
  }

  async getCalendarPlans(): Promise<CalendarPlan[]> {
    const userId = this.getUserId();
    const data: any = await apiClient.getCalendarPlans(userId);
    const results = Array.isArray(data) ? data : (data.results || []);
    return results.map((plan: any) => ({
      id: plan.id.toString(),
      contractId: plan.contract ? plan.contract.toString() : undefined,
      contractNumber: plan.contract_number || undefined,
      department: plan.department,
      startDate: plan.start_date,
      endDate: plan.end_date,
      employeeIds: plan.employee_ids || [],
      departmentsInfo: plan.departments_info ? plan.departments_info.map((dept: any) => ({
        department: dept.department,
        startDate: dept.start_date || dept.startDate,
        endDate: dept.end_date || dept.endDate,
        employeeIds: dept.employee_ids || dept.employeeIds || [],
      })) : undefined,
      harmfulFactors: plan.harmful_factors || [],
      selectedDoctors: plan.selected_doctors || [],
      status: plan.status,
      clinicName: plan.clinic_name,
      clinicDirector: plan.clinic_director,
      employerName: plan.employer_name || plan.employer_name_field || undefined,
      employerRepresentative: plan.employer_representative,
      sesRepresentative: plan.ses_representative,
      rejectionReason: plan.rejection_reason,
      rejectedByEmployerAt: plan.rejected_by_employer_at,
      createdAt: plan.created_at,
      approvedByClinicAt: plan.approved_by_clinic_at,
      approvedByEmployerAt: plan.approved_by_employer_at,
      sentToSESAt: plan.sent_to_ses_at,
    }));
  }

  async getCalendarPlansByContract(contractId: string): Promise<CalendarPlan[]> {
    const userId = this.getUserId();
    const data: any = await apiClient.getCalendarPlansByContract(userId, contractId);
    const results = Array.isArray(data) ? data : (data.results || []);
    return results.map((plan: any) => ({
      id: plan.id.toString(),
      contractId: plan.contract ? plan.contract.toString() : undefined,
      contractNumber: plan.contract_number || undefined,
      department: plan.department,
      startDate: plan.start_date,
      endDate: plan.end_date,
      employeeIds: plan.employee_ids || [],
      departmentsInfo: plan.departments_info ? plan.departments_info.map((dept: any) => ({
        department: dept.department,
        startDate: dept.start_date || dept.startDate,
        endDate: dept.end_date || dept.endDate,
        employeeIds: dept.employee_ids || dept.employeeIds || [],
      })) : undefined,
      harmfulFactors: plan.harmful_factors || [],
      selectedDoctors: plan.selected_doctors || [],
      status: plan.status,
      clinicName: plan.clinic_name,
      clinicDirector: plan.clinic_director,
      employerName: plan.employer_name || plan.employer_name_field || undefined,
      employerRepresentative: plan.employer_representative,
      sesRepresentative: plan.ses_representative,
      rejectionReason: plan.rejection_reason,
      rejectedByEmployerAt: plan.rejected_by_employer_at,
      createdAt: plan.created_at,
      approvedByClinicAt: plan.approved_by_clinic_at,
      approvedByEmployerAt: plan.approved_by_employer_at,
      sentToSESAt: plan.sent_to_ses_at,
    }));
  }

  async addCalendarPlan(plan: Omit<CalendarPlan, 'id' | 'status' | 'createdAt'> & { contractId?: string; departmentsInfo?: Array<{department: string; startDate: string; endDate: string; employeeIds: string[]}> }, employeeIds: string[]): Promise<void> {
    const userId = this.getUserId();
    const requestData = {
      user: userId,
      contract: plan.contractId,
      department: plan.department,
      start_date: plan.startDate,
      end_date: plan.endDate,
      employee_ids: employeeIds,
      departments_info: plan.departmentsInfo || [],
      harmful_factors: plan.harmfulFactors || [],
      selected_doctors: plan.selectedDoctors || [],
      status: 'draft',
    };
    console.log('Creating calendar plan with data:', requestData);
    try {
      await apiClient.createCalendarPlan(requestData);
    } catch (error: any) {
      console.error('Error creating calendar plan:', error);
      throw error;
    }
  }

  async updateCalendarPlanStatus(id: string, status: CalendarPlan['status'], rejectionReason?: string): Promise<void> {
    await apiClient.updateCalendarPlanStatus(id, status, rejectionReason);
  }

  async updateCalendarPlan(id: string, plan: Partial<Omit<CalendarPlan, 'id' | 'status' | 'createdAt'>> & { contractId?: string; departmentsInfo?: Array<{department: string; startDate: string; endDate: string; employeeIds: string[]}> }): Promise<void> {
    const userId = this.getUserId();
    await apiClient.updateCalendarPlan(id, {
      user: userId,
      contract: plan.contractId,
      department: plan.department,
      start_date: plan.startDate,
      end_date: plan.endDate,
      employee_ids: plan.employeeIds,
      departments_info: plan.departmentsInfo || [],
      harmful_factors: plan.harmfulFactors || [],
      selected_doctors: plan.selectedDoctors || [],
    });
  }

  async deleteCalendarPlan(id: string): Promise<void> {
    const userId = this.getUserId();
    await apiClient.deleteCalendarPlan(id, userId);
  }

  async getRouteSheets(): Promise<RouteSheet[]> {
    const userId = this.getUserId();
    const data: any = await apiClient.getRouteSheets(userId);
    const results = Array.isArray(data) ? data : (data.results || []);
    return results.map((rs: any) => ({
      id: rs.id.toString(),
      patientId: rs.patient_id,
      patientName: rs.patient_name,
      iin: rs.iin,
      position: rs.position,
      department: rs.department,
      visitDate: rs.visit_date,
      services: (rs.services || []).map((s: any) => ({
        id: s.id || '',
        name: s.name,
        cabinet: s.cabinet,
        doctorId: s.doctorId || s.doctor_id || '',
        specialization: s.specialization,
        time: s.time,
        status: s.status || 'pending',
      })),
    }));
  }

  async generateRouteSheet(searchValue: string): Promise<RouteSheet | null> {
    const userId = this.getUserId();
    const visitDate = new Date().toISOString().split('T')[0];
    try {
      // Поиск по номеру телефона (приоритет)
      // Очищаем от пробелов и символов, оставляем только цифры
      const phoneClean = searchValue.trim().replace(/\D/g, '');
      const phone = phoneClean.length >= 10 ? phoneClean : '';
      
      // Для обратной совместимости оставляем поддержку ИИН и ФИО
      const isIIN = /^\d{12}$/.test(searchValue.trim());
      const iin = isIIN ? searchValue.trim() : '';
      const name = (!phone && !isIIN) ? searchValue.trim() : '';
      
      const data: any = await apiClient.createRouteSheetByIIN(userId, phone, iin, visitDate, name);
      return {
        id: data.id.toString(),
        patientId: data.patient_id,
        patientName: data.patient_name,
        iin: data.iin,
        position: data.position,
        department: data.department,
        visitDate: data.visit_date,
        services: (data.services || []).map((s: any) => ({
          id: s.id || '',
          name: s.name,
          cabinet: s.cabinet,
          doctorId: s.doctorId || s.doctor_id || '',
          specialization: s.specialization,
          time: s.time,
          status: s.status || 'pending',
        })),
      };
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка генерации маршрутного листа');
    }
  }

  async updateRouteSheetServiceStatus(routeSheetId: string, serviceId: string, status: 'pending' | 'completed'): Promise<void> {
    const userId = this.getUserId();
    await apiClient.updateRouteSheetService(routeSheetId, serviceId, status, userId);
  }

  async addExamination(examination: DoctorExamination): Promise<void> {
    await apiClient.createExamination({
      patient_id: examination.patientId,
      doctor_id: examination.doctorId,
      doctor_name: examination.doctorName,
      specialization: examination.specialization,
      conclusion: examination.conclusion,
      notes: examination.notes,
      recommendations: examination.recommendations,
    });
  }

  async getExaminationsByPatient(patientId: string): Promise<DoctorExamination[]> {
    const data: any = await apiClient.getExaminations(patientId);
    return (data.results || data).map((exam: any) => ({
      id: exam.id?.toString(),
      patientId: exam.patient_id,
      doctorId: exam.doctor_id,
      doctorName: exam.doctor_name,
      specialization: exam.specialization,
      conclusion: exam.conclusion,
      notes: exam.notes || '',
      examinationDate: exam.examination_date,
      doctorSignature: exam.doctor_signature,
      recommendations: exam.recommendations,
    }));
  }

  async getPatientHistory(patientId?: string, iin?: string): Promise<any> {
    return await apiClient.getPatientHistory(patientId, iin);
  }

  async updateRouteSheetService(routeSheetId: string, serviceId: string, status: 'pending' | 'completed'): Promise<void> {
    await apiClient.updateRouteSheetService(routeSheetId, serviceId, status);
  }

  async getExpertises(): Promise<Expertise[]> {
    const userId = this.getUserId();
    const data: any = await apiClient.getExpertises(userId);
    const results = Array.isArray(data) ? data : (data.results || []);
    return results.map((exp: any) => ({
      id: exp.id.toString(),
      patientId: exp.patient_id,
      patientName: exp.patient_name,
      iin: exp.iin,
      position: exp.position,
      department: exp.department,
      doctorConclusions: exp.doctor_conclusions || [],
      finalVerdict: exp.final_verdict,
      healthGroup: exp.health_group,
      verdictDate: exp.verdict_date,
      profpathologistName: exp.profpathologist_name,
      temporaryUnfitUntil: exp.temporary_unfit_until,
      reason: exp.reason,
      requiresReferral: exp.requires_referral,
      referralType: exp.referral_type,
      referralSent: exp.referral_sent,
      referralDate: exp.referral_date,
    }));
  }

  async updateExpertiseVerdict(
    expertiseId: string,
    verdict: Expertise['finalVerdict'],
    profpathologistName?: string,
    temporaryUnfitUntil?: string,
    reason?: string
  ): Promise<void> {
    await apiClient.updateExpertiseVerdict(
      expertiseId,
      verdict || '',
      profpathologistName,
      temporaryUnfitUntil,
      reason
    );
  }

  async getFinalActStats(department?: string) {
    const userId = this.getUserId();
    return await apiClient.getFinalActStats(userId, department);
  }

  async getHealthPlanItems(department?: string) {
    const userId = this.getUserId();
    return await apiClient.getHealthPlanItems(userId, department);
  }

  // Send Final Act to TSB
  async sendFinalActToTSB(finalActData: any): Promise<void> {
    const userId = this.getUserId();
    await apiClient.sendFinalActToTSB(userId, finalActData);
  }

  // Emergency Notifications
  async createEmergencyNotification(data: {
    patientId: string;
    patientName: string;
    iin: string;
    position: string;
    department: string;
    diseaseType: string;
    diagnosis: string;
    doctorName: string;
  }): Promise<void> {
    const userId = this.getUserId();
    await apiClient.createEmergencyNotification(userId, data);
  }

  async sendEmergencyNotification(notificationId: string): Promise<void> {
    await apiClient.sendEmergencyNotification(notificationId);
  }

  async getEmergencyNotifications(): Promise<any[]> {
    const userId = this.getUserId();
    const data: any = await apiClient.getEmergencyNotifications(userId);
    return Array.isArray(data) ? data : (data.results || []);
  }

  // Health Improvement Plans
  async getHealthImprovementPlans(): Promise<any[]> {
    const userId = this.getUserId();
    const data: any = await apiClient.getHealthImprovementPlans(userId);
    return Array.isArray(data) ? data : (data.results || []);
  }

  async createHealthImprovementPlan(year: number, planData: any): Promise<void> {
    const userId = this.getUserId();
    await apiClient.createHealthImprovementPlan(userId, { year, plan_data: planData });
  }

  async updateHealthImprovementPlan(id: string, data: any): Promise<void> {
    await apiClient.updateHealthImprovementPlan(id, data);
  }

  // Recommendations
  async getRecommendations(): Promise<any[]> {
    const userId = this.getUserId();
    const data: any = await apiClient.getRecommendations(userId);
    return Array.isArray(data) ? data : (data.results || []);
  }

  async createRecommendation(data: {
    patientId: string;
    patientName: string;
    recommendation: string;
    recommendationType: 'transfer' | 'treatment' | 'observation' | 'rehabilitation';
  }): Promise<void> {
    const userId = this.getUserId();
    await apiClient.createRecommendation(userId, data);
  }

  async updateRecommendation(id: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled', completionDate?: string, notes?: string): Promise<void> {
    await apiClient.updateRecommendation(id, { status, completion_date: completionDate, notes });
  }

  // Doctors
  async getDoctors(): Promise<any[]> {
    const userId = this.getUserId();
    const data: any = await apiClient.getDoctors(userId);
    const results = Array.isArray(data) ? data : (data.results || []);
    return results.map((doctor: any) => ({
      id: doctor.id.toString(),
      name: doctor.name,
      specialization: doctor.specialization,
      cabinet: doctor.cabinet || '',
      workSchedule: doctor.work_schedule || {},
      iin: doctor.iin || '',
      phone: doctor.phone || '',
    }));
  }

  async createDoctor(doctorData: {
    name: string;
    specialization: string;
    cabinet?: string;
    workSchedule?: {
      [key: string]: { start: string; end: string };
    };
    iin?: string;
    phone?: string;
    email?: string;
  }): Promise<void> {
    const userId = this.getUserId();
    await apiClient.createDoctor(userId, doctorData);
  }

  async updateDoctor(doctorId: string, doctorData: {
    name: string;
    specialization: string;
    cabinet?: string;
    workSchedule?: {
      [key: string]: { start: string; end: string };
    };
    iin?: string;
    phone?: string;
    email?: string;
  }): Promise<void> {
    await apiClient.updateDoctor(doctorId, doctorData);
  }

  async deleteDoctor(doctorId: string): Promise<void> {
    await apiClient.deleteDoctor(doctorId);
  }

  // Laboratory Tests
  async getLaboratoryTests(patientId?: string, routeSheetId?: string): Promise<any[]> {
    return await apiClient.getLaboratoryTests(patientId, routeSheetId);
  }

  async createLaboratoryTest(data: {
    routeSheetId?: string;
    patientId: string;
    patientName: string;
    testType: string;
    testName: string;
  }): Promise<void> {
    await apiClient.createLaboratoryTest(data);
  }

  async updateLaboratoryTest(id: string, data: {
    status?: 'pending' | 'in_progress' | 'completed';
    results?: any;
    notes?: string;
    performedBy?: string;
  }): Promise<void> {
    await apiClient.updateLaboratoryTest(id, data);
  }

  // Functional Tests
  async getFunctionalTests(patientId?: string, routeSheetId?: string): Promise<any[]> {
    return await apiClient.getFunctionalTests(patientId, routeSheetId);
  }

  async createFunctionalTest(data: {
    routeSheetId?: string;
    patientId: string;
    patientName: string;
    testType: string;
    testName: string;
  }): Promise<void> {
    await apiClient.createFunctionalTest(data);
  }

  async updateFunctionalTest(id: string, data: {
    status?: 'pending' | 'in_progress' | 'completed';
    results?: any;
    notes?: string;
    performedBy?: string;
  }): Promise<void> {
    await apiClient.updateFunctionalTest(id, data);
  }

  // Referrals
  async getReferrals(patientId?: string, status?: string): Promise<any[]> {
    const userId = this.getUserId();
    const data = await apiClient.getReferrals(userId, patientId, status);
    return Array.isArray(data) ? data : [];
  }

  async createReferral(data: {
    expertiseId?: string;
    patientId: string;
    patientName: string;
    iin: string;
    referralType: 'rehabilitation' | 'profpathology' | 'specialist';
    targetOrganization?: string;
    reason: string;
  }): Promise<void> {
    const userId = this.getUserId();
    await apiClient.createReferral(userId, data);
  }

  async updateReferralStatus(id: string, status: 'created' | 'sent' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'): Promise<void> {
    await apiClient.updateReferralStatus(id, status);
  }

  // Check expertise readiness
  async checkExpertiseReadiness(patientId: string, routeSheetId?: string): Promise<{
    is_ready: boolean;
    errors: string[];
  }> {
    return await apiClient.checkExpertiseReadiness(patientId, routeSheetId);
  }

  // Export reports
  async exportSummaryReportPDF(department?: string, startDate?: string, endDate?: string): Promise<void> {
    const userId = this.getUserId();
    const blob = await apiClient.exportSummaryReportPDF(userId, department, startDate, endDate);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary_report_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async exportSummaryReportExcel(department?: string, startDate?: string, endDate?: string): Promise<void> {
    const userId = this.getUserId();
    const blob = await apiClient.exportSummaryReportExcel(userId, department, startDate, endDate);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async exportFinalActPDF(department?: string): Promise<void> {
    const userId = this.getUserId();
    const blob = await apiClient.exportFinalActPDF(userId, department);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `final_act_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async exportFinalActExcel(department?: string): Promise<void> {
    const userId = this.getUserId();
    const blob = await apiClient.exportFinalActExcel(userId, department);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `final_act_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Patient Queue
  async getPatientQueue(params?: { doctor_id?: string; status?: string; date?: string }): Promise<any[]> {
    const userId = this.getUserId();
    return await apiClient.getPatientQueue({ ...params, user_id: userId });
  }

  async addToQueueFromRouteSheet(routeSheetId: string, serviceId: string, priority?: string): Promise<void> {
    const userId = this.getUserId();
    await apiClient.addToQueueFromRouteSheet(routeSheetId, serviceId, userId, priority);
  }

  async callPatient(queueId: string): Promise<void> {
    await apiClient.callPatient(queueId);
  }

  async startExamination(queueId: string): Promise<void> {
    await apiClient.startExamination(queueId);
  }

  async completeExamination(queueId: string): Promise<void> {
    await apiClient.completeExamination(queueId);
  }

  async skipPatient(queueId: string): Promise<void> {
    await apiClient.skipPatient(queueId);
  }

  // Harmful Factors
  async getHarmfulFactorsList(): Promise<string[]> {
    return await apiClient.getHarmfulFactorsList();
  }

  // Users
  async getUsers(): Promise<any[]> {
    return await apiClient.getUsers();
  }

  // Export methods
  async exportClinicsExcel(): Promise<void> {
    const blob = await apiClient.exportClinicsExcel();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `clinics_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async exportEmployersExcel(): Promise<void> {
    const blob = await apiClient.exportEmployersExcel();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `employers_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Contracts
  async getContracts(): Promise<any[]> {
    const userId = this.getUserId();
    const data: any = await apiClient.getContracts(userId);
    const results = Array.isArray(data) ? data : (data.results || []);
    // Маппим данные из API
    return results.map((contract: any) => ({
      id: contract.id.toString(),
      contract_number: contract.contract_number,
      contract_date: contract.contract_date,
      amount: contract.amount,
      people_count: contract.people_count,
      execution_date: contract.execution_date,
      status: contract.status,
      employer_bin: contract.employer_bin,
      employer_phone: contract.employer_phone,
      employer_name: contract.employer_name,
      clinic_name: contract.clinic_name,
      notes: contract.notes,
      created_at: contract.created_at,
      approved_by_employer_at: contract.approved_by_employer_at,
      approved_by_clinic_at: contract.approved_by_clinic_at,
      sent_at: contract.sent_at,
      executed_at: contract.executed_at,
    }));
  }

  async createContract(contractData: {
    employer_bin: string;
    employer_phone: string;
    contract_number: string;
    contract_date: string;
    amount: number;
    people_count: number;
    execution_date: string;
    notes?: string;
  }): Promise<void> {
    const userId = this.getUserId();
    await apiClient.createContract(userId, contractData);
  }

  async findEmployerByBin(bin: string): Promise<any> {
    return await apiClient.findEmployerByBin(bin);
  }

  async approveContract(contractId: string): Promise<void> {
    const userId = this.getUserId();
    await apiClient.approveContract(contractId, userId);
  }

  async rejectContract(contractId: string, reason: string): Promise<void> {
    const userId = this.getUserId();
    await apiClient.rejectContract(contractId, userId, reason);
  }

  async updateContract(contractId: string, data: {
    contract_number?: string;
    contract_date?: string;
    amount?: number;
    people_count?: number;
    execution_date?: string;
    notes?: string;
  }): Promise<void> {
    const userId = this.getUserId();
    await apiClient.updateContract(contractId, userId, data);
  }

  async resendContractForApproval(contractId: string, comment?: string): Promise<void> {
    const userId = this.getUserId();
    await apiClient.resendContractForApproval(contractId, userId, comment);
  }

  async getContractHistory(contractId: string): Promise<any[]> {
    return await apiClient.getContractHistory(contractId);
  }

  async sendContract(contractId: string): Promise<void> {
    const userId = this.getUserId();
    await apiClient.sendContract(contractId, userId);
  }

  async executeContract(contractId: string): Promise<void> {
    const userId = this.getUserId();
    await apiClient.executeContract(contractId, userId);
  }

  async markExecutedByClinic(contractId: string, executionType: 'full' | 'partial', executionNotes: string): Promise<void> {
    const userId = this.getUserId();
    await apiClient.markExecutedByClinic(contractId, userId, executionType, executionNotes);
  }

  async confirmExecutionByEmployer(contractId: string): Promise<void> {
    const userId = this.getUserId();
    await apiClient.confirmExecutionByEmployer(contractId, userId);
  }

  async rejectExecutionByEmployer(contractId: string, rejectionReason: string): Promise<void> {
    const userId = this.getUserId();
    await apiClient.rejectExecutionByEmployer(contractId, userId, rejectionReason);
  }
}

export const workflowStoreAPI = new WorkflowStoreAPI();

