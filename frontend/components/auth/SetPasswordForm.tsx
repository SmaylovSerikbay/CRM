'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { userStore } from '@/lib/store/user-store';

interface SetPasswordFormProps {
  phone: string;
  hasPassword?: boolean;
  onSuccess?: () => void;
}

export function SetPasswordForm({ phone, hasPassword = false, onSuccess }: SetPasswordFormProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Валидация
    if (newPassword.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (hasPassword && !oldPassword) {
      setError('Введите текущий пароль');
      return;
    }

    setIsLoading(true);

    try {
      await userStore.setPassword(phone, newPassword, hasPassword ? oldPassword : undefined);
      setSuccess(hasPassword ? 'Пароль успешно изменен' : 'Пароль успешно установлен');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка при установке пароля');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {hasPassword 
            ? 'Вы можете изменить свой пароль для входа в систему'
            : 'Установите пароль для быстрого входа в систему без кода из WhatsApp'}
        </p>
      </div>

      {hasPassword && (
        <Input
          type="password"
          label="Текущий пароль"
          placeholder="Введите текущий пароль"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
        />
      )}

      <Input
        type="password"
        label="Новый пароль"
        placeholder="Минимум 6 символов"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        minLength={6}
      />

      <Input
        type="password"
        label="Подтвердите пароль"
        placeholder="Повторите новый пароль"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        minLength={6}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        isLoading={isLoading}
      >
        {hasPassword ? 'Изменить пароль' : 'Установить пароль'}
      </Button>
    </form>
  );
}
