interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-surface-dark/70 backdrop-blur border border-border-dark/50 rounded-xl p-6 ${className}`}>
      {children}
    </div>
  );
}