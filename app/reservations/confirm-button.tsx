"use client";

type ConfirmButtonProps = {
  className?: string;
  message: string;
  children: React.ReactNode;
};

export function ConfirmButton({ children, className, message }: ConfirmButtonProps) {
  return (
    <button
      className={className}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
