'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Settings, Save, User, Building2, Mail, Phone, MapPin, Lock } from 'lucide-react';
import { userStore } from '@/lib/store/user-store';
import { SetPasswordForm } from '@/components/auth/SetPasswordForm';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [user, setUser] = useState(userStore.getCurrentUser());
  const [formData, setFormData] = useState({
    name: '',
    inn: '',
    address: '',
    contactPerson: '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const currentUser = userStore.getCurrentUser();
    setUser(currentUser);
    if (currentUser?.registrationData) {
      setFormData({
        name: currentUser.registrationData.name || '',
        inn: currentUser.registrationData.inn || '',
        address: currentUser.registrationData.address || '',
        contactPerson: currentUser.registrationData.contactPerson || '',
        email: currentUser.registrationData.email || '',
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // В будущем здесь будет обновление данных через API
      // await apiClient.updateUserSettings(user!.id, formData);
      
      // Пока просто обновляем локально
      if (user) {
        userStore.updateUserRole(user.phone, user.role, user.clinicRole);
      }
      
      showToast('Настройки сохранены', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка сохранения настроек', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Пользователь не авторизован</p>
      </div>
    );
  }

  return (
    <div>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Настройки</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* User Info */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold">Информация о пользователе</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Телефон
                </label>
                <Input
                  value={user.phone}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Роль
                </label>
                <Input
                  value={user.role === 'clinic' ? 'Клиника' : 'Работодатель'}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800"
                />
              </div>
              {user.clinicRole && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Роль в клинике
                  </label>
                  <Input
                    value={
                      user.clinicRole === 'manager' ? 'Менеджер' :
                      user.clinicRole === 'doctor' ? 'Врач' :
                      user.clinicRole === 'profpathologist' ? 'Профпатолог' :
                      'Регистратура'
                    }
                    disabled
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Security Settings */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold">Безопасность</h2>
            </div>
            <SetPasswordForm phone={user.phone} hasPassword={false} />
          </Card>

          {/* Organization Info */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-xl font-semibold">Информация об организации</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название организации
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Введите название организации"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ИИН/БИН
                </label>
                <Input
                  value={formData.inn}
                  onChange={(e) => {
                    // Разрешаем только цифры и ограничиваем до 12 символов
                    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                    setFormData({ ...formData, inn: value });
                  }}
                  placeholder="Введите ИИН/БИН (12 цифр)"
                  required
                  maxLength={12}
                />
                {formData.inn && formData.inn.length !== 12 && (
                  <p className="text-sm text-red-500 mt-1">ИИН/БИН должен содержать ровно 12 цифр</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Адрес
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Введите адрес"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ФИО первого руководителя
                </label>
                <Input
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Введите ФИО первого руководителя"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@email.com"
                  required
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" isLoading={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить изменения
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

