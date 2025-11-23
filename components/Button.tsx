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
  const baseStyles = "rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-sm";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-6 py-2.5 text-base",
    lg: "px-8 py-4 text-lg"
  };

  // Inline styles for colors (bypasses Tailwind compilation issues)
  const inlineStyles: React.CSSProperties = {
    backgroundColor: variant === 'primary' ? '#588157' :
                     variant === 'secondary' ? '#BC4749' :
                     variant === 'danger' ? '#ef4444' :
                     'white',
    color: variant === 'outline' ? '#57534e' : 'white',
    border: variant === 'outline' ? '2px solid #e7e5e4' : 'none'
  };

  const variants = {
    primary: "text-white",
    secondary: "text-white",
    outline: "text-stone-600",
    danger: "text-white"
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      style={inlineStyles}
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