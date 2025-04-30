import React from 'react';

interface FormErrorMessageProps {
  id: string;
  error?: string | null;
  className?: string;
}

export const FormErrorMessage: React.FC<FormErrorMessageProps> = ({ 
  id,
  error,
  className = ''
}) => {
  if (!error) return null;
  
  return (
    <p 
      id={id}
      className={`mt-1 text-sm text-red-600 font-medium ${className}`}
      role="alert"
    >
      {error}
    </p>
  );
};

export default FormErrorMessage;