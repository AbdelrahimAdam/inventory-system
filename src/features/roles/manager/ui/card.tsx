// src/features/roles/manager/ui/card.tsx
import React, { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const Card = ({ children, className, ...props }: CardProps) => {
  return (
    <div
      {...props}
      className={clsx(
        'bg-white dark:bg-gray-900 rounded-3xl shadow-md border border-gray-200 dark:border-gray-700',
        'transition-colors duration-300',
        className
      )}
    >
      {children}
    </div>
  );
};

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const CardContent = ({ children, className, ...props }: CardContentProps) => {
  return (
    <div {...props} className={clsx('p-6', className)}>
      {children}
    </div>
  );
};
