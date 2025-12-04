'use client';

import { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  label?: string;
}

export function PhoneInput({ 
  value, 
  onChange, 
  placeholder = '+7 (___) ___-__-__',
  required = false,
  className = '',
  label
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  // Форматирование номера телефона
  const formatPhoneNumber = (input: string): string => {
    // Убираем все нецифровые символы
    const digits = input.replace(/\D/g, '');
    
    // Если начинается с 8, заменяем на 7
    let cleanDigits = digits;
    if (cleanDigits.startsWith('8')) {
      cleanDigits = '7' + cleanDigits.slice(1);
    }
    
    // Если не начинается с 7, добавляем 7
    if (!cleanDigits.startsWith('7') && cleanDigits.length > 0) {
      cleanDigits = '7' + cleanDigits;
    }
    
    // Ограничиваем до 11 цифр (7 + 10 цифр)
    cleanDigits = cleanDigits.slice(0, 11);
    
    // Форматируем в +7 (XXX) XXX-XX-XX
    if (cleanDigits.length === 0) {
      return '';
    }
    
    let formatted = '+7';
    
    if (cleanDigits.length > 1) {
      formatted += ' (' + cleanDigits.slice(1, 4);
    }
    
    if (cleanDigits.length >= 4) {
      formatted += ') ' + cleanDigits.slice(4, 7);
    }
    
    if (cleanDigits.length >= 7) {
      formatted += '-' + cleanDigits.slice(7, 9);
    }
    
    if (cleanDigits.length >= 9) {
      formatted += '-' + cleanDigits.slice(9, 11);
    }
    
    return formatted;
  };

  // Получение чистого номера (только цифры)
  const getCleanNumber = (input: string): string => {
    const digits = input.replace(/\D/g, '');
    let cleanDigits = digits;
    
    if (cleanDigits.startsWith('8')) {
      cleanDigits = '7' + cleanDigits.slice(1);
    }
    
    if (!cleanDigits.startsWith('7') && cleanDigits.length > 0) {
      cleanDigits = '7' + cleanDigits;
    }
    
    return cleanDigits;
  };

  // Обновляем отображаемое значение при изменении value
  useEffect(() => {
    if (value) {
      setDisplayValue(formatPhoneNumber(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatPhoneNumber(input);
    const clean = getCleanNumber(input);
    
    setDisplayValue(formatted);
    onChange(clean);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Разрешаем: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
      // Разрешаем: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 86 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true) ||
      // Разрешаем: home, end, left, right
      (e.keyCode >= 35 && e.keyCode <= 39)) {
      return;
    }
    
    // Запрещаем все, кроме цифр
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
        <input
          type="tel"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          required={required}
          className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all duration-200"
        />
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Формат: +7 (777) 123-45-67
      </p>
    </div>
  );
}
