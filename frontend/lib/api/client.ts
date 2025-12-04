// @ts-ignore - process is available in Next.js runtime
const API_URL = (process?.env?.NEXT_PUBLIC_API_URL) || 'http://localhost:8000/api';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Для поддержки сессий/cookies если нужно
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    // Проверяем, есть ли контент в ответе (для DELETE запросов может быть 204 No Content)
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    
    // Если нет контента или это 204 No Content, возвращаем пустой объект
    if (response.status === 204 || contentLength === '0' || !contentType?.includes('application/json')) {
      return {} as T;
    }

    // Пытаемся парсить JSON только если есть контент
    const text = await response.text();
    if (!text || text.trim() === '') {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (e) {
      // Если не JSON, возвращаем пустой объект
      return {} as T;
    }
  }

  // Auth
  async sendOTP(phone: string) {
    return this.request('/users/send_otp/', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOTP(phone: string, otp: string) {
    return this.request('/users/verify_otp/', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  }

  async loginWithPassword(phone: string, password: string) {
    return this.request('/users/login_with_password/', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  }

  async setPassword(phone: string, newPassword: string, oldPassword?: string) {
    return this.request('/users/set_password/', {
      method: 'POST',
      body: JSON.stringify({ 
        phone, 
        new_password: newPassword,
        ...(oldPassword && { old_password: oldPassword })
      }),
    });
  }

  async completeRegistration(phone: string, role: string, registrationData: any, clinicRole?: string, password?: string) {
    return this.request('/users/complete_registration/', {
      method: 'POST',
      body: JSON.stringify({ 
        phone, 
        role, 
        registration_data: registrationData, 
        clinic_role: clinicRole,
        ...(password && { password })
      }),
    });
  }

  // Contingent
  async getContingent(userId: string) {
    return this.request(`/contingent-employees/?user_id=${userId}`);
  }

  async uploadExcelContingent(userId: string, file: File): Promise<{
    created: number;
    skipped: number;
    skipped_reasons?: {
      duplicate?: number;
      no_iin?: number;
      no_name?: number;
    };
    employees?: any[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    
    const response = await fetch(`${this.baseUrl}/contingent-employees/upload_excel/`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async downloadContingentTemplate() {
    const response = await fetch(`${this.baseUrl}/contingent-employees/download_template/`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'шаблон_список_контингента.xlsx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async deleteContingentEmployee(userId: string, employeeId: string) {
    return this.request(`/contingent-employees/${employeeId}/`, {
      method: 'DELETE',
    });
  }

  async deleteAllContingentEmployees(userId: string) {
    return this.request(`/contingent-employees/delete_all/?user_id=${userId}`, {
      method: 'DELETE',
    });
  }

  async updateContingentEmployee(userId: string, employeeId: string, data: any) {
    return this.request(`/contingent-employees/${employeeId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async generateEmployeeQRCode(employeeId: string): Promise<string> {
    // @ts-ignore - process is available in Next.js runtime
    const apiUrl = (process?.env?.NEXT_PUBLIC_API_URL) || 'http://localhost:8000/api';
    return `${apiUrl}/contingent-employees/${employeeId}/generate_qr_code/`;
  }

  async findEmployeeByQR(qrData: string): Promise<any> {
    return this.request('/contingent-employees/find_by_qr/', {
      method: 'POST',
      body: JSON.stringify({ qr_data: qrData }),
    });
  }

  // Calendar Plans
  async getCalendarPlans(userId: string) {
    return this.request(`/calendar-plans/?user_id=${userId}`);
  }

  async createCalendarPlan(data: any) {
    return this.request('/calendar-plans/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Contracts
  async getContracts(userId: string): Promise<any[]> {
    return this.request(`/contracts/?user_id=${userId}`);
  }

  async createContract(userId: string, data: {
    employer_bin: string;
    employer_phone: string;
    contract_number: string;
    contract_date: string;
    amount: number;
    people_count: number;
    execution_date: string;
    notes?: string;
  }): Promise<any> {
    return this.request('/contracts/', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        ...data,
      }),
    });
  }

  async findEmployerByBin(bin: string): Promise<any> {
    return this.request(`/users/find_by_bin/?bin=${bin}`);
  }

  async approveContract(contractId: string, userId: string): Promise<any> {
    return this.request(`/contracts/${contractId}/approve/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async rejectContract(contractId: string, userId: string, reason: string): Promise<any> {
    return this.request(`/contracts/${contractId}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, reason }),
    });
  }

  async updateContract(contractId: string, userId: string, data: {
    contract_number?: string;
    contract_date?: string;
    amount?: number;
    people_count?: number;
    execution_date?: string;
    notes?: string;
  }): Promise<any> {
    return this.request(`/contracts/${contractId}/update_contract/`, {
      method: 'PATCH',
      body: JSON.stringify({ user_id: userId, ...data }),
    });
  }

  async resendContractForApproval(contractId: string, userId: string, comment?: string): Promise<any> {
    return this.request(`/contracts/${contractId}/resend_for_approval/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, comment }),
    });
  }

  async getContractHistory(contractId: string): Promise<any[]> {
    return this.request(`/contracts/${contractId}/history/`);
  }

  async sendContract(contractId: string, userId: string): Promise<any> {
    return this.request(`/contracts/${contractId}/send/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async executeContract(contractId: string, userId: string): Promise<any> {
    return this.request(`/contracts/${contractId}/execute/`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async getHarmfulFactorsList(): Promise<string[]> {
    // Список вредных факторов согласно приказу №131
    return [
      'Шум',
      'Вибрация',
      'Инфразвук',
      'Ультразвук',
      'Электромагнитные поля',
      'Ионизирующее излучение',
      'Неионизирующее излучение',
      'Микроклимат',
      'Освещение',
      'Аэрозоли преимущественно фиброгенного действия (АПФД)',
      'Химические факторы',
      'Биологические факторы',
      'Физические перегрузки',
      'Нервно-психические перегрузки',
      'Сварочные аэрозоли',
      'Пыль',
      'Газы',
      'Пары',
      'Работа на высоте',
      'Работа в замкнутом пространстве',
      'Работа в условиях повышенного давления',
      'Работа в условиях пониженного давления',
      'Работа с источниками ионизирующего излучения',
      'Работа с лазерным излучением',
      'Работа с ультрафиолетовым излучением',
      'Работа с виброинструментом',
      'Работа с пневмоинструментом',
      'Работа с химическими веществами',
      'Работа с биологическими агентами',
      'Работа в условиях воздействия электромагнитных полей',
    ];
  }

  async updateCalendarPlanStatus(id: string, status: string) {
    return this.request(`/calendar-plans/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Route Sheets
  async getRouteSheets(userId: string) {
    return this.request(`/route-sheets/?user_id=${userId}`);
  }

  async createRouteSheetByIIN(userId: string, phone?: string, iin?: string, visitDate?: string, name?: string) {
    return this.request('/route-sheets/create_by_iin/', {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: userId, 
        phone: phone || '',
        iin: iin || '', 
        name: name || '',
        visit_date: visitDate || new Date().toISOString().split('T')[0]
      }),
    });
  }

  async updateRouteSheetService(routeSheetId: string, serviceId: string, status: 'pending' | 'completed', userId?: string) {
    const url = `/route-sheets/${routeSheetId}/update_service_status/`;
    const params = userId ? `?user_id=${userId}` : '';
    return this.request(`${url}${params}`, {
      method: 'PATCH',
      body: JSON.stringify({
        service_id: serviceId,
        status: status,
        user_id: userId,
      }),
    });
  }

  // Examinations
  async getExaminations(patientId: string) {
    return this.request(`/examinations/?patient_id=${patientId}`);
  }

  async getPatientHistory(patientId?: string, iin?: string): Promise<any> {
    const params = new URLSearchParams();
    if (patientId) params.append('patient_id', patientId);
    if (iin) params.append('iin', iin);
    return this.request(`/examinations/patient_history/?${params.toString()}`);
  }

  async createExamination(data: any) {
    return this.request('/examinations/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Expertises
  async getExpertises(userId: string) {
    return this.request(`/expertises/?user_id=${userId}`);
  }

  async createExpertise(data: any) {
    return this.request('/expertises/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpertiseVerdict(id: string, verdict: string, profpathologistName?: string, temporaryUnfitUntil?: string, reason?: string) {
    return this.request(`/expertises/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({
        final_verdict: verdict,
        profpathologist_name: profpathologistName,
        temporary_unfit_until: temporaryUnfitUntil,
        reason,
        verdict_date: new Date().toISOString(),
      }),
    });
  }

  // Emergency Notifications
  async createEmergencyNotification(userId: string, data: any) {
    return this.request('/emergency-notifications/', {
      method: 'POST',
      body: JSON.stringify({ ...data, user: userId }),
    });
  }

  async sendEmergencyNotification(id: string) {
    return this.request(`/emergency-notifications/${id}/send_notification/`, {
      method: 'POST',
    });
  }

  async getEmergencyNotifications(userId: string) {
    return this.request(`/emergency-notifications/?user_id=${userId}`);
  }

  // Health Improvement Plans
  async getHealthImprovementPlans(userId: string) {
    return this.request(`/health-improvement-plans/?user_id=${userId}`);
  }

  async createHealthImprovementPlan(userId: string, data: any) {
    return this.request('/health-improvement-plans/', {
      method: 'POST',
      body: JSON.stringify({ ...data, user: userId }),
    });
  }

  async updateHealthImprovementPlan(id: string, data: any) {
    return this.request(`/health-improvement-plans/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Recommendations
  async getRecommendations(userId: string) {
    return this.request(`/recommendations/?user_id=${userId}`);
  }

  async createRecommendation(userId: string, data: any) {
    return this.request('/recommendations/', {
      method: 'POST',
      body: JSON.stringify({ ...data, user: userId }),
    });
  }

  async updateRecommendation(id: string, data: any) {
    return this.request(`/recommendations/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Send Final Act to TSB/SESBN
  async sendFinalActToTSB(userId: string, finalActData: any) {
    // В реальности здесь будет интеграция с API ТСБ/СЭБН
    // Пока симуляция
    return Promise.resolve({ message: 'Заключительный акт отправлен в ТСБ/СЭБН' });
  }

  async getFinalActStats(userId: string, department?: string) {
    const url = department
      ? `/expertises/final_act_stats/?user_id=${userId}&department=${department}`
      : `/expertises/final_act_stats/?user_id=${userId}`;
    return this.request(url);
  }

  async getHealthPlanItems(userId: string, department?: string) {
    const url = department
      ? `/expertises/health_plan_items/?user_id=${userId}&department=${department}`
      : `/expertises/health_plan_items/?user_id=${userId}`;
    return this.request(url);
  }

  // Doctors
  async getDoctors(userId: string) {
    return this.request(`/doctors/?user_id=${userId}`);
  }

  async createDoctor(userId: string, doctorData: {
    name: string;
    specialization: string;
    cabinet?: string;
    workSchedule?: {
      [key: string]: { start: string; end: string };
    };
    iin?: string;
    phone?: string;
    email?: string;
  }) {
    const url = `${this.baseUrl}/doctors/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        user_id: userId,
        name: doctorData.name,
        specialization: doctorData.specialization,
        ...(doctorData.cabinet !== undefined && { cabinet: doctorData.cabinet }),
        ...(doctorData.workSchedule && { work_schedule: doctorData.workSchedule }),
        ...(doctorData.iin && { iin: doctorData.iin }),
        ...(doctorData.phone && { phone: doctorData.phone }),
        ...(doctorData.email && { email: doctorData.email }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorData.error || errorData.detail || (typeof errorData === 'object' ? Object.values(errorData).flat().join(', ') : String(errorData)) || `HTTP error! status: ${response.status}`;
      const error: any = new Error(errorMessage);
      error.response = { data: errorData, status: response.status };
      throw error;
    }

    return response.json();
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
  }) {
    const url = `${this.baseUrl}/doctors/${doctorId}/`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        name: doctorData.name,
        specialization: doctorData.specialization,
        ...(doctorData.cabinet !== undefined && { cabinet: doctorData.cabinet }),
        ...(doctorData.workSchedule && { work_schedule: doctorData.workSchedule }),
        ...(doctorData.iin && { iin: doctorData.iin }),
        ...(doctorData.phone && { phone: doctorData.phone }),
        ...(doctorData.email && { email: doctorData.email }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorData.error || errorData.detail || (typeof errorData === 'object' ? Object.values(errorData).flat().join(', ') : String(errorData)) || `HTTP error! status: ${response.status}`;
      const error: any = new Error(errorMessage);
      error.response = { data: errorData, status: response.status };
      throw error;
    }

    return await response.json();
  }

  async deleteDoctor(doctorId: string) {
    return this.request(`/doctors/${doctorId}/`, {
      method: 'DELETE',
    });
  }

  // Laboratory Tests
  async getLaboratoryTests(patientId?: string, routeSheetId?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (patientId) params.append('patient_id', patientId);
    if (routeSheetId) params.append('route_sheet_id', routeSheetId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<any>(`/laboratory-tests${query}`);
    return Array.isArray(response) ? response : (response.results || []);
  }

  async createLaboratoryTest(data: any): Promise<any> {
    return this.request('/laboratory-tests/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLaboratoryTest(id: string, data: any): Promise<any> {
    return this.request(`/laboratory-tests/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Functional Tests
  async getFunctionalTests(patientId?: string, routeSheetId?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (patientId) params.append('patient_id', patientId);
    if (routeSheetId) params.append('route_sheet_id', routeSheetId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<any>(`/functional-tests${query}`);
    return Array.isArray(response) ? response : (response.results || []);
  }

  async createFunctionalTest(data: any): Promise<any> {
    return this.request('/functional-tests/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFunctionalTest(id: string, data: any): Promise<any> {
    return this.request(`/functional-tests/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Referrals
  async getReferrals(userId?: string, patientId?: string, status?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (patientId) params.append('patient_id', patientId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<any>(`/referrals${query}`);
    return Array.isArray(response) ? response : (response.results || []);
  }

  async createReferral(userId: string, data: any): Promise<any> {
    return this.request('/referrals/', {
      method: 'POST',
      body: JSON.stringify({ ...data, user_id: userId }),
    });
  }

  async updateReferralStatus(id: string, status: string): Promise<any> {
    return this.request(`/referrals/${id}/update_status/`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Check expertise readiness
  async checkExpertiseReadiness(patientId: string, routeSheetId?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('patient_id', patientId);
    if (routeSheetId) params.append('route_sheet_id', routeSheetId);
    return this.request(`/expertises/check_readiness/?${params.toString()}`);
  }

  // Export reports
  async exportSummaryReportPDF(userId: string, department?: string, startDate?: string, endDate?: string): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('user_id', userId);
    if (department) params.append('department', department);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const url = `${this.baseUrl}/expertises/export_summary_report_pdf/?${params.toString()}`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.blob();
  }

  async exportSummaryReportExcel(userId: string, department?: string, startDate?: string, endDate?: string): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('user_id', userId);
    if (department) params.append('department', department);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const url = `${this.baseUrl}/expertises/export_summary_report_excel/?${params.toString()}`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.blob();
  }

  async exportFinalActPDF(userId: string, department?: string): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('user_id', userId);
    if (department) params.append('department', department);
    
    const url = `${this.baseUrl}/expertises/export_final_act_pdf/?${params.toString()}`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.blob();
  }

  async exportFinalActExcel(userId: string, department?: string): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('user_id', userId);
    if (department) params.append('department', department);
    
    const url = `${this.baseUrl}/expertises/export_final_act_excel/?${params.toString()}`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.blob();
  }

  // Patient Queue
  async getPatientQueue(params?: { user_id?: string; doctor_id?: string; status?: string; date?: string }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.doctor_id) queryParams.append('doctor_id', params.doctor_id);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.date) queryParams.append('date', params.date);
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await this.request<any>(`/patient-queue/current_queue/${query}`);
    return Array.isArray(response) ? response : (response.results || []);
  }

  async addToQueueFromRouteSheet(routeSheetId: string, serviceId: string, userId: string, priority?: string): Promise<any> {
    return this.request('/patient-queue/add_from_route_sheet/', {
      method: 'POST',
      body: JSON.stringify({
        route_sheet_id: routeSheetId,
        service_id: serviceId,
        user_id: userId,
        priority: priority || 'normal',
      }),
    });
  }

  async callPatient(queueId: string): Promise<any> {
    return this.request(`/patient-queue/${queueId}/call_patient/`, {
      method: 'POST',
    });
  }

  async startExamination(queueId: string): Promise<any> {
    return this.request(`/patient-queue/${queueId}/start_examination/`, {
      method: 'POST',
    });
  }

  async completeExamination(queueId: string): Promise<any> {
    return this.request(`/patient-queue/${queueId}/complete_examination/`, {
      method: 'POST',
    });
  }

  async skipPatient(queueId: string): Promise<any> {
    return this.request(`/patient-queue/${queueId}/skip_patient/`, {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();

