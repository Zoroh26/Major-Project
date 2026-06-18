import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

export const Button = ({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) => {
  const baseStyles = "px-4 py-2 text-sm rounded transition-colors font-medium";
  
  const variants = {
    primary: "bg-primary-container text-on-primary-container hover:bg-primary",
    secondary: "bg-surface-container-high text-primary hover:bg-surface-container",
    danger: "bg-error text-on-error hover:bg-red-800",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
