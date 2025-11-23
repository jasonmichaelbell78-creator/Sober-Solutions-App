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

  const variants = {
    primary: "bg-[#588157] text-white hover:bg-[#4A6E49]",
    secondary: "bg-[#BC4749] text-white hover:bg-[#A0393B]",
    outline: "border-2 border-stone-200 text-stone-600 hover:border-[#588157] hover:text-[#588157] bg-white",
    danger: "bg-red-500 text-white hover:bg-red-600"
  };

  // Clone children and add white color to any SVG icons
  const processChildren = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, child => {
      if (React.isValidElement(child)) {
        // If it's an SVG or icon component, add color prop
        if (child.type === 'svg' || (typeof child.type !== 'string' && child.type)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            color: variant === 'outline' ? undefined : 'white',
            style: { color: variant === 'outline' ? undefined : 'white' }
          });
        }
      }
      return child;
    });
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
      {processChildren(children)}
    </button>
  );
};