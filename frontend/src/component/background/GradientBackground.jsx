import React from 'react';
import './GradientBackground.css';

export default function GradientBackground({ children, animated = true, className = '' }) {
  return (
    <div className={`gradient-bg ${animated ? 'gradient-bg-animated' : ''} ${className}`}>
      {children}
    </div>
  );
}