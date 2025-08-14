import React from 'react';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

export const CircularProgress = ({ 
  percentage, 
  size = 80, 
  strokeWidth = 8,
  children 
}: CircularProgressProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Half circle circumference
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
  
  // Determine color based on percentage
  const getProgressColor = (percent: number) => {
    if (percent >= 60) return '#10B981'; // green-500
    if (percent >= 30) return '#F59E0B'; // yellow-500
    return '#EF4444'; // red-500
  };
  
  const progressColor = getProgressColor(percentage);
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size / 2 + strokeWidth / 2}
        className="overflow-visible"
      >
        {/* Background semicircle */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
        />
        {/* Progress semicircle */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-300 ease-in-out"
        />
      </svg>
      {/* Center content positioned above the semicircle */}
      <div className="absolute" style={{ top: `${size / 2 - 20}px` }}>
        {children}
      </div>
    </div>
  );
};