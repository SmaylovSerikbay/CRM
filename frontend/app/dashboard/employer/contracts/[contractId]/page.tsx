'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Users, Calendar, Route, FileText, CheckCircle, Clock, AlertCircle, History, ChevronDown, ChevronUp } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface Contract {
  id: string;
  contract_number: string;
  contract_date: string;
  amount: number;
  people_count: number;
  execution_date: string;
  status: string;
  employer_bin?: string;
  employer_phone?: string;
  employer_name?: string;
  clinic_name?: string;
  notes?: string;
  createdAt: string;
  // Поля для двухэтапного исполнения
  execution_type?: 'full' | 'partial';
  executed_by_clinic_at?: string;
  execution_notes?: string;
  confirmed_by_employer_at?: string;
  employer_rejection_reason?: string;
}

interface ContractHistoryItem {
  id: string;
  action: string;
  user_role: string;
  user_name: string;
  comment: string;
  old_status: string;
  new_status: string;
  changes: any;
  created_at: string;
}

export default function EmployerContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const contractId = params.contractId as string;
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contingentCount, setContingentCount] = useState(0);
  const [plansCount, setPlansCount] = useState(0);
  const [routeSheetsCount, setRouteSheetsCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [contractHistory, setContractHistory] = useState<ContractHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (contractId) {
      loadContractDetails();
    }
  }, [contractId]);

  const loadContractDetails = async () => {
    try {
      // Загружаем основную информацию о договоре
      const contracts = await workflowStoreAPI.getContracts();
      const foundContract = contracts.find((c: any) => c.id.toString() === contractId);
      
      if (!foundContract) {
        showToast('Договор не найден', 'error');
        router.push('/dashboard/employer/contracts');
        return;
      }

      setContract({
        id: foundContract.id.toString(),
        contract_number: foundContract.contract_number,
        contract_date: foundContract.contract_date,
        amount: foundContract.amount,
        people_count: foundContract.people_count,
        execution_date: foundContract.execution_date,
        status: foundContract.status,
        employer_bin: foundContract.employer_bin,
        employer_phone: foundContract.employer_phone,
        employer_name: foundContract.employer_name,
        clinic_name: foundContract.clinic_name,
        notes: foundContract.notes,
        createdAt: foundContract.created_at,
        execution_type: foundContract.execution_type,
        executed_by_clinic_at: foundContract.executed_by_clinic_at,
        execution_notes: foundContract.execution_notes,
        confirmed_by_employer_at: foundContract.confirmed_by_employer_at,
        employer_rejection_reason: foundContract.employer_rejection_reason,
      });

      // Загружаем счетчики (быстро, без полных данных)
      loadCounts();
    } catch (error) {
      console.error('Error loading contract:', error);
      showToast('Ошибка загрузки договора', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      // Загружаем только счетчики для быстрого отображения
      const [contingentData, plansData, routeData] = await Promise.all([
        workflowStoreAPI.getContingentByContract(contractId),
        workflowStoreAPI.getCalendarPlansByContract(contractId),
        workflowStoreAPI.getRouteSheets() // TODO: добавить фильтрацию по договору
      ]);

      setContingentCount(contingentData.length);
      setPlansCount(plansData.length);
      // Для маршрутных листов пока считаем все (нужно добавить фильтрацию в API)
      setRouteSheetsCount(routeData.length);
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  const handleShowHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    
    setIsLoadingHistory(true);
    try {
      const history = await workflowStoreAPI.getContractHistory(contractId);
      setContractHistory(history);
      setShowHistory(true);
    } catch (error: any) {
      showToast(error.message || 'Ошибка загрузки истории', 'error');
    } finally 