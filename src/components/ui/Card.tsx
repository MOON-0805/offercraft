import React from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ className = '', children, hover, onClick }) => (
  <div
    className={`bg-white rounded-xl border border-gray-200 shadow-sm ${hover ? 'hover:shadow-md hover:border-primary-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '', children
}) => <div className={`px-5 py-4 border-b border-gray-100 ${className}`}>{children}</div>;

export const CardContent: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '', children
}) => <div className={`px-5 py-4 ${className}`}>{children}</div>;

export const CardTitle: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '', children
}) => <h3 className={`font-semibold text-gray-900 ${className}`}>{children}</h3>;

export const CardDescription: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '', children
}) => <p className={`text-sm text-gray-500 mt-1 ${className}`}>{children}</p>;

export const CardFooter: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '', children
}) => <div className={`px-5 py-3 border-t border-gray-100 ${className}`}>{children}</div>;
