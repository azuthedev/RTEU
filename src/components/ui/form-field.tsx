import React, { useState, useEffect } from 'react';
import { PlayCircleIcon as ExclamationCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ValidationRule {
  pattern?: RegExp;
  validate?: (value: string) => boolean;
  message: string;
  required?: boolean;
}

interface FormFieldProps {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onValueChange?: (value: string) => void; // Added this prop
  required?: boolean;
  autoComplete?: string;
  className?: string;
  validationRules?: ValidationRule[];
  disabled?: boolean;
  onValidationChange?: (fieldName: string, isValid: boolean, errorMessage?: string) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  icon?: React.ReactNode;
  inputClassName?: string;
  labelClassName?: string;
  helpText?: string;
  isTextarea?: boolean;
  textareaRows?: number;
  error?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  id,
  name,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onValueChange,
  required = false,
  autoComplete,
  className,
  validationRules = [],
  disabled = false,
  onValidationChange,
  validateOnChange = false,
  validateOnBlur = true,
  icon,
  inputClassName,
  labelClassName,
  helpText,
  isTextarea = false,
  textareaRows = 3,
  error: externalError,
}) => {
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const errorId = `${id}-error`;
  const helpTextId = helpText ? `${id}-help` : undefined;
  
  // Use externally provided error if available, otherwise use internal error
  const error = externalError || internalError;

  const validate = (inputValue: string) => {
    if (required && !inputValue.trim()) {
      return 'This field is required';
    }

    if (inputValue.trim() === '') {
      return null; // Don't validate empty optional fields
    }

    for (const rule of validationRules) {
      if (rule.pattern && !rule.pattern.test(inputValue)) {
        return rule.message;
      }
      if (rule.validate && !rule.validate(inputValue)) {
        return rule.message;
      }
    }

    return null;
  };

  const handleBlur = () => {
    setTouched(true);
    if (validateOnBlur) {
      const validationError = validate(value);
      setInternalError(validationError);
      if (onValidationChange) {
        onValidationChange(name, !validationError, validationError || undefined);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e);
    
    // Call the onValueChange prop if provided
    if (onValueChange) {
      onValueChange(e.target.value);
    }
    
    if (validateOnChange) {
      const validationError = validate(e.target.value);
      setInternalError(validationError);
      if (onValidationChange) {
        onValidationChange(name, !validationError, validationError || undefined);
      }
    }
  };

  // Reset errors when value prop changes externally (like form reset)
  useEffect(() => {
    if (value === '' && touched) {
      setTouched(false);
      setInternalError(null);
      if (onValidationChange) {
        onValidationChange(name, true, undefined);
      }
    }
  }, [value, name, onValidationChange, touched]);

  return (
    <div className={cn("mb-4", className)}>
      <div className="flex justify-between items-baseline mb-1">
        <label 
          htmlFor={id} 
          className={cn(
            "block text-sm font-medium text-gray-700",
            required && "after:content-['*'] after:ml-0.5 after:text-red-600",
            labelClassName
          )}
        >
          {label}
        </label>
      </div>
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        
        {isTextarea ? (
          <textarea
            id={id}
            name={name}
            value={value}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={cn(
              "w-full px-4 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600",
              error ? "border-red-500 bg-red-50" : "border-gray-200",
              icon && "pl-10",
              inputClassName
            )}
            required={required}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={cn(
              error ? errorId : null,
              helpText ? helpTextId : null
            )}
            rows={textareaRows}
          />
        ) : (
          <input
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={handleInputChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            autoComplete={autoComplete}
            className={cn(
              "w-full h-[42px] px-4 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600",
              error ? "border-red-500 bg-red-50" : "border-gray-200",
              icon && "pl-10",
              inputClassName
            )}
            required={required}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={cn(
              error ? errorId : null,
              helpText ? helpTextId : null
            )}
          />
        )}
        
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <ExclamationCircle className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>
      
      {error && (
        <p 
          className="mt-1 text-sm text-red-600 font-medium" 
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      )}
      
      {helpText && !error && (
        <p 
          className="mt-1 text-sm text-gray-500" 
          id={helpTextId}
        >
          {helpText}
        </p>
      )}
    </div>
  );
};

export default FormField;