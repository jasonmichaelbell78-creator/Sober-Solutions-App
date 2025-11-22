import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden ${className}`}>
      {title && (
        <div className="px-8 py-5 border-b border-stone-100 bg-stone-50/80 backdrop-blur-sm">
            <h3 className="font-bold text-xl text-stone-800">{title}</h3>
        </div>
      )}
      <div className="p-8">
        {children}
      </div>
    </div>
  );
};