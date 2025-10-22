import React, { ReactNode } from "react";
import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const Card = ({ children, className, ...props }: CardProps) => {
  return (
    <div
      {...props}
      className={clsx(
        "bg-white dark:bg-gray-900 rounded-3xl shadow-md border border-gray-200 dark:border-gray-700",
        "transition-colors duration-300",
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
    <div {...props} className={clsx("p-6", className)}>
      {children}
    </div>
  );
};

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const CardHeader = ({ children, className, ...props }: CardHeaderProps) => {
  return (
    <div
      {...props}
      className={clsx("p-6 pb-4 border-b border-gray-200 dark:border-gray-700", className)}
    >
      {children}
    </div>
  );
};

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  className?: string;
}

export const CardTitle = ({ children, className, ...props }: CardTitleProps) => {
  return (
    <h3
      {...props}
      className={clsx(
        "text-xl font-semibold text-gray-900 dark:text-gray-100",
        className
      )}
    >
      {children}
    </h3>
  );
};
