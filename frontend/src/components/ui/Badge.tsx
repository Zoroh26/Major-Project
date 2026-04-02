import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "neutral";
  className?: string;
}

export const Badge = ({ children, variant = "neutral", className = "" }: BadgeProps) => {
  const variants = {
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    danger: "bg-error/10 text-error border-error/20",
    neutral: "bg-surface-container text-primary border-outline-variant",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
