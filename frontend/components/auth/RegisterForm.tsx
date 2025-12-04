'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Building2, Stethoscope } from 'lucide-react';

interface RegisterFormProps {
  role: 'clinic' | 'employer' | null;
  phone: string;
  onComplete: (data: {
    name: string;
    inn: string;
    address: string;
    contactPerson: string;
    email: string;
  }) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ role, phone, onComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    inn: '',
    address: '',
    contactPerson: '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Симуляция регистрации
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    // Передаем данные регистрации в родительский компонент
    onComplete(formData);
  };

  const isClinic = role === 'clinic';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        {isClinic ? (
          <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        ) : (
          <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        )}
        <div>
          <p className="text-sm font-medium">
            {isClinic ? 'Регистрация клиники' : 'Регистрация работодателя'}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">{phone}</p>
        </div>
      </div>

      <Input
        type="text"
        label={isClinic ? 'Название клиники' : 'Название организации'}
        placeholder={isClinic ? 'ТОО "Медицинский центр" или ИП "Медицинский центр"' : 'ТОО "Компания" или ИП "Компания"'}
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <Input
        type="text"
        label="ИИН/БИН"
        placeholder="123456789012"
        value={formData.inn}
        onChange={(e) => {
          // Разрешаем только цифры и ограничиваем до 12 символов
          const value = e.target.value.replace(/\D/g, '').slice(0, 12);
          setFormData({ ...formData, inn: value });
        }}
        required
        maxLength={12}
      />

      <Input
        type="text"
        label="Адрес"
        placeholder="г. Алматы, ул. Примерная, д. 1"
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        required
      />

      <Input
        type="text"
        label="ФИО первого руководителя"
        placeholder="Иванов Иван Иванович"
        value={formData.contactPerson}
        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
        required
      />

      <Input
        type="email"
        label="Email"
        placeholder="info@example.com"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />

      <Button
        type="submit"
        className="w-full"
        isLoading={isLoading}
      >
        Зарегистрироваться
      </Button>
    </form>
  );
};

