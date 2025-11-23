import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading,
  ...props
}) => {
  const baseStyles = "rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-sm [&>svg]:flex-shrink-0";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-2.5 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const variants = {
    primary: "bg-primary text-white hover:bg-[#4A6E49] shadow-primary/20 hover:shadow-primary/40 [&>svg]:!text-white [&>svg]:!opacity-100",
    secondary: "bg-secondary text-white hover:bg-[#A0393B] shadow-secondary/20 hover:shadow-secondary/40 [&>svg]:!text-white [&>svg]:!opacity-100",
    outline: "border-2 border-stone-200 text-stone-600 hover:border-primary hover:text-primary bg-white [&>svg]:!opacity-100",
    danger: "bg-red-500 text-white hover:bg-red-600 [&>svg]:!text-white [&>svg]:!opacity-100"
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
      ) : null}
      {children}
    </button>
  );
};