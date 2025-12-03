import React from 'react';
import { Card } from '@/components/ui/Card';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, children }) => {
  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </Card>
  );
};

