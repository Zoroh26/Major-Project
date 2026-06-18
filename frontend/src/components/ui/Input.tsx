import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = "", ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && <label className="text-sm text-primary font-medium">{label}</label>}
        <input
          ref={ref}
          className={`bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-sm text-primary focus:outline-none focus:border-secondary transition-colors ${className}`}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";
