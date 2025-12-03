'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Plus, UserPlus, Edit2, Trash2, X, Save } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  cabinet: string;
  workSchedule?: {
    monday?: { start: string; end: string };
    tuesday?: { start: string; end: string };
    wednesday?: { start: string; end: string };
    thursday?: { start: string; end: string };
    friday?: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
    [key: string]: { start: string; end: string } | undefined;
  };
  iin: string;
  phone: string;
  email?: string;
}

const SPECIALIZATIONS = [
  'Терапевт',
  'Профпатолог',
  'ЛОР',
  'Окулист',
  'Невропатолог',
  'Хирург',
  'Рентгенолог',
  'Кардиолог',
  'Пульмонолог',
  'Дерматолог',
  'Психиатр',
  'Нарколог',
  'Гинеколог',
  'Уролог',
  'Эндокринолог',
  'Гастроэнтеролог',
];

// Валидация ИИН (12 цифр)
const validateIIN = (iin: string): boolean => {
  if (!iin) return true; // Необязательное поле
  const cleaned = iin.replace(/\D/g, ''); // Удаляем все нецифровые символы
  return cleaned.length === 12 && /^\d{12}$/.test(cleaned);
};

// Валидация телефона (формат: +7 777 123 4567 или 8 777 123 4567)
const validatePhone = (phone: string): boolean => {
  if (!phone) return true; // Необязательное поле
  const cleaned = phone.replace(/\D/g, ''); // Удаляем все нецифровые символы
  // Проверяем казахстанский формат: начинается с 7 или 8, затем 10 цифр
  return (cleaned.startsWith('7') && cleaned.length === 11) || 
         (cleaned.startsWith('8') && cleaned.length === 11) ||
         (cleaned.length === 10); // Без кода страны
};

// Форматирование ИИН (только цифры)
const formatIIN = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 12);
};

// Форматирование телефона
const formatPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.startsWith('8')) {
    return `8 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)}`.trim();
  }
  if (cleaned.startsWith('7')) {
    return `+7 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 11)}`.trim();
  }
  if (cleaned.length <= 10) {
    return `+7 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`.trim();
  }
  return value;
};

export default function DoctorsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    cabinet: '',
    workSchedule: {
      monday: { start: '09:00', end: '18:00' },
      tuesday: { start: '09:00', end: '18:00' },
      wednesday: { start: '09:00', end: '18:00' },
      thursday: { start: '09:00', end: '18:00' },
      friday: { start: '09:00', end: '18:00' },
      saturday: { start: '', end: '' },
      sunday: { start: '', end: '' },
    },
    iin: '',
    phone: '',
    email: '',
  });
  const [errors, setErrors] = useState<{
    iin?: string;
    phone?: string;
  }>({});

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const data = await workflowStoreAPI.getDoctors();
        setDoctors(data);
      } catch (error) {
        console.error('Error loading doctors:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDoctors();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      specialization: '',
      cabinet: '',
      workSchedule: {
        monday: { start: '09:00', end: '18:00' },
        tuesday: { start: '09:00', end: '18:00' },
        wednesday: { start: '09:00', end: '18:00' },
        thursday: { start: '09:00', end: '18:00' },
        friday: { start: '09:00', end: '18:00' },
        saturday: { start: '', end: '' },
        sunday: { start: '', end: '' },
      },
      iin: '',
      phone: '',
      email: '',
    });
    setErrors({});
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingId(doctor.id);
    const defaultSchedule = {
      monday: { start: '09:00', end: '18:00' },
      tuesday: { start: '09:00', end: '18:00' },
      wednesday: { start: '09:00', end: '18:00' },
      thursday: { start: '09:00', end: '18:00' },
      friday: { start: '09:00', end: '18:00' },
      saturday: { start: '', end: '' },
      sunday: { start: '', end: '' },
    };
    setFormData({
      name: doctor.name,
      specialization: doctor.specialization,
      cabinet: doctor.cabinet || '',
      workSchedule: doctor.workSchedule ? {
        ...defaultSchedule,
        ...doctor.workSchedule,
      } : defaultSchedule,
      iin: doctor.iin || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
    });
    setErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация обязательных полей
    if (!formData.name.trim()) {
      alert('Укажите ФИО врача');
      return;
    }
    if (!formData.specialization) {
      alert('Выберите специализацию');
      return;
    }

    // Валидация ИИН
    if (formData.iin && !validateIIN(formData.iin)) {
      setErrors({ ...errors, iin: 'ИИН должен содержать ровно 12 цифр' });
      return;
    }

    // Валидация телефона
    if (formData.phone && !validatePhone(formData.phone)) {
      setErrors({ ...errors, phone: 'Неверный формат телефона. Используйте формат: +7 777 123 4567' });
      return;
    }
    
    try {
      const doctorData = {
        name: formData.name.trim(),
        specialization: formData.specialization,
        cabinet: formData.cabinet.trim() || undefined,
        workSchedule: formData.workSchedule,
        iin: formData.iin.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
      };

      if (editingId) {
        await workflowStoreAPI.updateDoctor(editingId, doctorData);
        alert('Врач успешно обновлен');
      } else {
        await workflowStoreAPI.createDoctor(doctorData);
        alert('Врач успешно добавлен');
      }

      // Перезагружаем список врачей
      const updated = await workflowStoreAPI.getDoctors();
      setDoctors(updated);
      resetForm();
    } catch (error: any) {
      console.error('Error saving doctor:', error);
      let errorMessage = editingId ? 'Ошибка обновления врача' : 'Ошибка добавления врача';
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'object') {
          errorMessage = Object.values(errorData).flat().join(', ');
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого врача?')) {
      return;
    }
    try {
      await workflowStoreAPI.deleteDoctor(id);
      const updated = await workflowStoreAPI.getDoctors();
      setDoctors(updated);
      alert('Врач успешно удален');
    } catch (error: any) {
      console.error('Error deleting doctor:', error);
      alert(error.message || 'Ошибка удаления врача');
    }
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Врачи клиники</h1>
              <p className="text-gray-600 dark:text-gray-400">Управление списком врачей</p>
            </div>
            <div>
              <Button onClick={() => {
                resetForm();
                setShowForm(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить врача
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : (
          <>
        {/* Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">
                      {editingId ? 'Редактировать врача' : 'Добавить врача'}
                    </h2>
                <button
                      onClick={resetForm}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="ФИО"
                    placeholder="Иванов Иван Иванович"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Специализация <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                      required
                    >
                      <option value="">Выберите специализацию</option>
                      {SPECIALIZATIONS.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          ИИН (необязательно)
                        </label>
                  <Input
                    placeholder="123456789012"
                    value={formData.iin}
                          onChange={(e) => {
                            const formatted = formatIIN(e.target.value);
                            setFormData({ ...formData, iin: formatted });
                            if (errors.iin) {
                              setErrors({ ...errors, iin: undefined });
                            }
                          }}
                          maxLength={12}
                        />
                        {errors.iin && (
                          <p className="text-sm text-red-500 mt-1">{errors.iin}</p>
                        )}
                        {formData.iin && !validateIIN(formData.iin) && (
                          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                            ИИН должен содержать 12 цифр
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Телефон (необязательно)
                        </label>
                  <Input
                    placeholder="+7 777 123 4567"
                    value={formData.phone}
                          onChange={(e) => {
                            const formatted = formatPhone(e.target.value);
                            setFormData({ ...formData, phone: formatted });
                            if (errors.phone) {
                              setErrors({ ...errors, phone: undefined });
                            }
                          }}
                        />
                        {errors.phone && (
                          <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                        )}
                        {formData.phone && !validatePhone(formData.phone) && (
                          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                            Неверный формат телефона
                          </p>
                        )}
                      </div>
                      <Input
                        label="Номер кабинета (необязательно)"
                        placeholder="5"
                        value={formData.cabinet}
                        onChange={(e) => setFormData({ ...formData, cabinet: e.target.value })}
                      />
                      <Input
                        label="Email (необязательно)"
                        placeholder="doctor@example.com"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        {editingId ? 'Сохранить изменения' : 'Добавить врача'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                        onClick={resetForm}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

            {/* Doctors Table */}
            {doctors.length > 0 ? (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">ФИО</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Специализация</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Кабинет</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">ИИН</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Телефон</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Email</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctors.map((doctor) => (
                        <tr
              key={doctor.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-medium">
                            {doctor.name}
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                        {doctor.specialization}
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                            {doctor.cabinet || '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                            {doctor.iin || '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                            {doctor.phone || '-'}
                          </td>
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                            {doctor.email || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(doctor)}
                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                                title="Редактировать"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                  <button
                    onClick={() => handleDelete(doctor.id)}
                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                                title="Удалить"
                  >
                                <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              !showForm && (
          <Card>
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет врачей</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Добавьте первого врача в клинику
              </p>
                    <Button onClick={() => {
                      resetForm();
                      setShowForm(true);
                    }}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить врача
              </Button>
            </div>
          </Card>
              )
        )}
          </>
        )}
      </main>
    </div>
  );
}
