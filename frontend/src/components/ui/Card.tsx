import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = ({ children, className = "", ...props }: CardProps) => {
  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant/15 rounded-md p-4 shadow-[0px_12px_32px_rgba(4,47,46,0.06)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
