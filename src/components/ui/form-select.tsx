import React, { useState, useEffect } from 'react';
import { PlayCircleIcon as ExclamationCircle, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps {
  id: string;
  name: string;
  label: string;
  options: Option[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  onValidationChange?: (fieldName: string, isValid: boolean, errorMessage?: string) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  helpText?: string;
  labelClassName?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  id,
  name,
  label,
  options,
  value,
  onChange,
  required = false,
  className,
  disabled = false,
  placeholder = 'Select an option',
  error: externalError,
  onValidationChange,
  validateOnChange = false,
  validateOnBlur = true,
  helpText,
  labelClassName
}) => {
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const errorId = `${id}-error`;
  const helpTextId = helpText ? `${id}-help` : undefined;
  
  // Use externally provided error if available, otherwise use internal error
  const error = externalError || internalError;

  const validate = (selectValue: string) => {
    if (required && (!selectValue || selectValue === '')) {
      return 'Please select an option';
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

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e);
    if (touched && validateOnChange) {
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
        <select
          id={id}
          name={name}
          value={value}
          onChange={handleSelectChange}
          onBlur={handleBlur}
          className={cn(
            "w-full h-[42px] appearance-none px-4 py-2 pr-10 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600",
            error ? "border-red-500 bg-red-50" : "border-gray-200",
            value === "" && "text-gray-500"
          )}
          required={required}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={cn(
            error ? errorId : null,
            helpText ? helpTextId : null
          )}
        >
          {placeholder && (
            <option value="" disabled>{placeholder}</option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {error ? (
            <ExclamationCircle className="h-5 w-5 text-red-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
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

export default FormSelect;