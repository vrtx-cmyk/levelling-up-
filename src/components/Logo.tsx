import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  linkTo?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', linkTo = '/' }) => {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const textSizes = {
    sm: 'text-base font-semibold',
    md: 'text-lg font-bold',
    lg: 'text-2xl font-extrabold',
  };

  const content = (
    <div className={`inline-flex items-center gap-2.5 group select-none ${className}`}>
      {/* Black Triangle / Stylized A Icon from Mockup */}
      <div className="relative flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${iconSizes[size]} transition-transform duration-200 group-hover:scale-105`}
        >
          {/* Sharp, clean triangular chevron / A mark */}
          <path
            d="M12 3L2 21H7.5L12 12.5L16.5 21H22L12 3Z"
            fill="black"
          />
        </svg>
      </div>
      <span className={`${textSizes[size]} tracking-tight text-[#111111] font-sans`}>
        Levelling Up
      </span>
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-flex items-center focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
};

