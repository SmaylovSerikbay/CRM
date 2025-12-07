// Централизованное хранилище для workflow согласно userflow.md

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
  requiresExamination: boolean; // Требуется ли обязательный медосмотр
  lastExaminationDate?: string; // Дата последнего осмотра
  nextExaminationDate?: string; // Дата следующего осмотра
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
  status: 'draft' | 'pending_clinic' | 'pending_employer' | 'approved' | 'sent_to_ses';
  clinicName?: string;
  clinicDirector?: string;
  employerName?: string;
  employerRepresentative?: string;
  sesRepresentative?: string;
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
    status: 'pending' | 'completed';
  }[];
}

export interface DoctorExamination {
  patientId: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  conclusion: 'healthy' | 'unhealthy' | null;
  notes: string;
  examinationDate: string;
  doctorSignature?: string; // Подпись врача
  recommendations?: string; // Рекомендации врача
}

export interface Expertise {
  patientId: string;
  patientName: string;
  iin: string;
  position: string;
  department: string;
  doctorConclusions: DoctorExamination[];
  finalVerdict: 'fit' | 'temporary_unfit' | 'permanent_unfit' | null;
  verdictDate?: string;
  profpathologistName?: string; // Имя профпатолога
  profpathologistSignature?: string; // Подпись профпатолога
  temporaryUnfitUntil?: string; // До какой даты временная непригодность
  reason?: string; // Причина вердикта
}

// In-memory store (в реальности будет API/база данных)
class WorkflowStore {
  private contingent: ContingentEmployee[] = [];
  private calendarPlans: CalendarPlan[] = [];
  private routeSheets: RouteSheet[] = [];
  private examinations: DoctorExamination[] = [];
  private expertises: Expertise[] = [];

  // Contingent
  setContingent(employees: ContingentEmployee[]) {
    this.contingent = employees;
  }

  getContingent(): ContingentEmployee[] {
    return this.contingent;
  }

  getContingentByDepartment(department: string): ContingentEmployee[] {
    return this.contingent.filter(emp => emp.department === department);
  }

  // Calendar Plans
  addCalendarPlan(plan: CalendarPlan) {
    const planWithMetadata: CalendarPlan = {
      ...plan,
      createdAt: plan.createdAt || new Date().toISOString(),
    };
    this.calendarPlans.push(planWithMetadata);
  }

  getCalendarPlans(): CalendarPlan[] {
    return this.calendarPlans;
  }

  getApprovedCalendarPlans(): CalendarPlan[] {
    return this.calendarPlans.filter(p => p.status === 'approved');
  }

  updateCalendarPlanStatus(id: string, status: CalendarPlan['status']) {
    const plan = this.calendarPlans.find(p => p.id === id);
    if (plan) {
      plan.status = status;
      if (status === 'pending_employer') {
        plan.approvedByClinicAt = new Date().toISOString();
      } else if (status === 'approved') {
        plan.approvedByEmployerAt = new Date().toISOString();
      }
    }
  }

  // Route Sheets
  createRouteSheet(patientId: string, visitDate: string): RouteSheet | null {
    const patient = this.contingent.find(e => e.id === patientId);
    if (!patient) return null;

    // Проверяем, есть ли утвержденный календарный план для этого пациента
    const plan = this.calendarPlans.find(p => 
      p.employeeIds.includes(patientId) && 
      p.status === 'approved' &&
      visitDate >= p.startDate && 
      visitDate <= p.endDate
    );

    if (!plan) return null;

    // Генерируем маршрутный лист на основе должности и вредных факторов
    const services = this.generateServicesForPosition(patient.position, patient.harmfulFactors);

    const routeSheet: RouteSheet = {
      id: Date.now().toString(),
      patientId: patient.id,
      patientName: patient.name,
      iin: patient.iin,
      position: patient.position,
      department: patient.department,
      visitDate,
      services,
    };

    this.routeSheets.push(routeSheet);
    return routeSheet;
  }

  getRouteSheetByIIN(iin: string): RouteSheet | null {
    return this.routeSheets.find(rs => rs.iin === iin) || null;
  }

  getRouteSheets(): RouteSheet[] {
    return this.routeSheets;
  }

  // Examinations
  addExamination(examination: DoctorExamination) {
    const examinationWithDate: DoctorExamination = {
      ...examination,
      examinationDate: examination.examinationDate || new Date().toISOString(),
    };
    
    const existing = this.examinations.find(
      e => e.patientId === examination.patientId && e.doctorId === examination.doctorId
    );
    if (existing) {
      Object.assign(existing, examinationWithDate);
    } else {
      this.examinations.push(examinationWithDate);
    }
  }

  getExaminationsByPatient(patientId: string): DoctorExamination[] {
    return this.examinations.filter(e => e.patientId === patientId);
  }

  isPatientReadyForExpertise(patientId: string): boolean {
    const routeSheet = this.routeSheets.find(rs => rs.patientId === patientId);
    if (!routeSheet) return false;

    // Проверяем, что все услуги пройдены
    const allServicesCompleted = routeSheet.services.every(s => s.status === 'completed');
    if (!allServicesCompleted) return false;

    // Проверяем, что все врачи заполнили заключения
    const requiredDoctors = routeSheet.services.map(s => s.doctorId);
    const completedExaminations = this.examinations.filter(
      e => e.patientId === patientId && e.conclusion !== null
    );
    
    return requiredDoctors.length === completedExaminations.length;
  }

  // Expertise
  createExpertise(patientId: string): Expertise | null {
    if (!this.isPatientReadyForExpertise(patientId)) return null;

    const routeSheet = this.routeSheets.find(rs => rs.patientId === patientId);
    const patient = this.contingent.find(e => e.id === patientId);
    if (!routeSheet || !patient) return null;

    const doctorConclusions = this.getExaminationsByPatient(patientId);

    const expertise: Expertise = {
      patientId,
      patientName: patient.name,
      iin: patient.iin,
      position: patient.position,
      department: patient.department,
      doctorConclusions,
      finalVerdict: null,
    };

    this.expertises.push(expertise);
    return expertise;
  }

  getExpertises(): Expertise[] {
    return this.expertises;
  }

  updateExpertiseVerdict(
    patientId: string, 
    verdict: Expertise['finalVerdict'],
    profpathologistName?: string,
    temporaryUnfitUntil?: string,
    reason?: string
  ) {
    const expertise = this.expertises.find(e => e.patientId === patientId);
    if (expertise) {
      expertise.finalVerdict = verdict;
      expertise.verdictDate = new Date().toISOString();
      expertise.profpathologistName = profpathologistName;
      expertise.temporaryUnfitUntil = temporaryUnfitUntil;
      expertise.reason = reason;
    }
  }

  // Final Act & Health Plan
  isDepartmentReadyForFinalAct(department: string): boolean {
    const departmentEmployees = this.contingent.filter(e => e.department === department);
    const departmentExpertises = this.expertises.filter(
      e => e.department === department && e.finalVerdict !== null
    );

    return departmentEmployees.length > 0 && 
           departmentEmployees.length === departmentExpertises.length;
  }

  getFinalActStats(department?: string) {
    const expertises = department 
      ? this.expertises.filter(e => e.department === department && e.finalVerdict !== null)
      : this.expertises.filter(e => e.finalVerdict !== null);

    // Подсчет профзаболеваний (если в заключениях врачей указано)
    const occupationalDiseases = expertises.filter(e => 
      e.doctorConclusions.some(dc => 
        dc.conclusion === 'unhealthy' && 
        dc.notes.toLowerCase().includes('профзаболевание')
      )
    ).length;

    return {
      totalExamined: expertises.length,
      healthy: expertises.filter(e => e.finalVerdict === 'fit').length,
      temporaryContraindications: expertises.filter(e => e.finalVerdict === 'temporary_unfit').length,
      permanentContraindications: expertises.filter(e => e.finalVerdict === 'permanent_unfit').length,
      occupationalDiseases,
      examinationPeriod: department 
        ? this.getExaminationPeriodForDepartment(department)
        : this.getOverallExaminationPeriod(),
    };
  }

  private getExaminationPeriodForDepartment(department: string): { start: string; end: string } {
    const routeSheets = this.routeSheets.filter(rs => rs.department === department);
    if (routeSheets.length === 0) return { start: '', end: '' };
    
    const dates = routeSheets.map(rs => rs.visitDate).sort();
    return { start: dates[0], end: dates[dates.length - 1] };
  }

  private getOverallExaminationPeriod(): { start: string; end: string } {
    if (this.routeSheets.length === 0) return { start: '', end: '' };
    
    const dates = this.routeSheets.map(rs => rs.visitDate).sort();
    return { start: dates[0], end: dates[dates.length - 1] };
  }

  getHealthPlanItems(department?: string) {
    const expertises = department
      ? this.expertises.filter(e => e.department === department && e.finalVerdict !== null)
      : this.expertises.filter(e => e.finalVerdict !== null);

    return expertises
      .filter(e => e.finalVerdict !== 'fit')
      .map(e => {
        const unhealthyExamination = e.doctorConclusions.find(dc => dc.conclusion === 'unhealthy');
        return {
          patientId: e.patientId,
          employeeName: e.patientName,
          position: e.position,
          recommendation: unhealthyExamination?.notes || 'Требуется дополнительное обследование',
        };
      });
  }

  // Helper: Генерация услуг на основе должности
  private generateServicesForPosition(position: string, harmfulFactors: string[]): RouteSheet['services'] {
    const positionToServices: Record<string, { name: string; cabinet: string; doctorId: string }[]> = {
      'Бухгалтер': [
        { name: 'Терапевт', cabinet: '5', doctorId: '1' },
        { name: 'Окулист', cabinet: '8', doctorId: '2' },
        { name: 'Невропатолог', cabinet: '12', doctorId: '3' },
      ],
      'Сварщик': [
        { name: 'Профпатолог', cabinet: '1', doctorId: '4' },
        { name: 'ЛОР', cabinet: '3', doctorId: '5' },
        { name: 'Окулист', cabinet: '5', doctorId: '2' },
        { name: 'Хирург', cabinet: '7', doctorId: '6' },
        { name: 'Невропатолог', cabinet: '9', doctorId: '3' },
        { name: 'Терапевт', cabinet: '11', doctorId: '1' },
        { name: 'Рентген', cabinet: 'Рентген-кабинет', doctorId: '7' },
      ],
      'Водитель': [
        { name: 'Профпатолог', cabinet: '1', doctorId: '4' },
        { name: 'Окулист', cabinet: '5', doctorId: '2' },
        { name: 'Невропатолог', cabinet: '9', doctorId: '3' },
        { name: 'Терапевт', cabinet: '11', doctorId: '1' },
      ],
    };

    const services = positionToServices[position] || [];
    return services.map((service, idx) => ({
      id: idx.toString(),
      name: service.name,
      cabinet: service.cabinet,
      doctorId: service.doctorId,
      status: 'pending' as const,
    }));
  }
}

export const workflowStore = new WorkflowStore();

