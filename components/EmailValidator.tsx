import React, { useState, useEffect, useRef } from 'react';
import { Mail, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { validateEmail } from '../utils/emailValidator';

interface EmailValidatorProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange: (isValid: boolean) => void;
  name?: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  errorMessage?: string;
}

const EmailValidator: React.FC<EmailValidatorProps> = ({
  value,
  onChange,
  onValidationChange,
  name = 'email',
  id = 'email',
  required = true,
  placeholder = 'Email address',
  className = '',
  disabled = false,
  label = 'Email',
  errorMessage
}) => {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Basic email format check (just for immediate feedback)
  const isBasicEmailFormat = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Only validate after the user has stopped typing
  useEffect(() => {
    if (!value || !isTouched) return;
    
    // Clear previous errors/suggestions while typing
    if (isFocused) {
      setSuggestion(null);
      setValidationError(null);
      return;
    }
    
    // Clear any previous timer
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }
    
    // Check basic format first for immediate feedback
    if (!isBasicEmailFormat(value)) {
      setValidationError('Please enter a valid email address');
      setSuggestion(null);
      onValidationChange(false);
      return;
    } else {
      setValidationError(null);
      onValidationChange(true);
    }
    
    // If it passes basic validation, do more thorough checks with a debounce
    validationTimerRef.current = setTimeout(async () => {
      if (!value) return;
      
      setIsValidating(true);
      const result = await validateEmail(value);
      setIsValidating(false);
      
      if (!result.isValid) {
        setValidationError(result.error || 'Invalid email address');
        setSuggestion(null);
        onValidationChange(false);
      } else {
        setValidationError(null);
        setSuggestion(result.suggestedEmail || null);
        onValidationChange(true);
      }
    }, 800);

    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, [value, onValidationChange, isTouched, isFocused]);
  
  // Apply external error message if provided
  useEffect(() => {
    if (errorMessage) {
      setValidationError(errorMessage);
      onValidationChange(false);
    }
  }, [errorMessage, onValidationChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setIsTouched(true);
  };

  const applySuggestion = () => {
    if (suggestion) {
      onChange(suggestion);
      setSuggestion(null);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label 
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Mail className="h-5 w-5 text-gray-400" />
        </div>

        <input
          type="email"
          id={id}
          name={name}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          className={`w-full h-[42px] pl-10 pr-4 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 ${
            validationError 
              ? 'border-red-500 bg-red-50' 
              : suggestion
                ? 'border-yellow-300 bg-yellow-50'
                : 'border-gray-200'
          }`}
          placeholder={placeholder}
          required={required}
          disabled={disabled || isValidating}
          aria-invalid={!!validationError}
          aria-describedby={validationError ? `${id}-error` : (suggestion ? `${id}-suggestion` : undefined)}
        />

        {isValidating && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {validationError && !isValidating && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
        )}

        {!validationError && value && !isValidating && !suggestion && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
        )}
      </div>

      {/* Suggestion message */}
      {suggestion && !validationError && (
        <div 
          id={`${id}-suggestion`}
          className="mt-1 text-sm text-yellow-700 bg-yellow-50 p-2 rounded-md flex justify-between items-center"
        >
          <span>Did you mean <span className="font-medium">{suggestion}</span>?</span>
          <button
            type="button"
            onClick={applySuggestion}
            className="text-blue-600 hover:text-blue-800 flex items-center ml-2 text-xs font-medium"
          >
            Use this <ArrowRight className="ml-1 h-3 w-3" />
          </button>
        </div>
      )}

      {/* Error message */}
      {validationError && (
        <p 
          id={`${id}-error`}
          className="mt-1 text-sm text-red-600 font-medium"
          role="alert"
        >
          {validationError}
        </p>
      )}
    </div>
  );
};

export default EmailValidator;