import { useState, useCallback, useEffect } from 'react';

interface ValidationRules {
  [key: string]: {
    required?: boolean;
    pattern?: RegExp;
    validate?: (value: any, allValues?: any) => boolean;
    message: string;
  }[];
}

interface FieldErrors {
  [key: string]: string;
}

interface FormState {
  [key: string]: any;
}

interface FieldStates {
  [key: string]: {
    touched: boolean;
    valid: boolean;
  };
}

interface UseFormValidationResult {
  errors: FieldErrors;
  isValid: boolean;
  validateField: (name: string, value: any) => string | null;
  validateAllFields: () => boolean;
  handleBlur: (name: string) => void;
  resetField: (name: string) => void;
  resetForm: () => void;
  setFieldError: (name: string, error: string | null) => void;
  touchedFields: string[];
}

const useFormValidation = (
  formState: FormState,
  validationRules: ValidationRules
): UseFormValidationResult => {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [fieldStates, setFieldStates] = useState<FieldStates>({});
  const [isValid, setIsValid] = useState(false);

  // Initialize field states
  useEffect(() => {
    const initialFieldStates: FieldStates = {};
    Object.keys(validationRules).forEach((field) => {
      initialFieldStates[field] = {
        touched: false,
        valid: true
      };
    });
    setFieldStates(initialFieldStates);
  }, [validationRules]);

  // Check initial validity on mount and whenever formState changes
  useEffect(() => {
    // Only run full validation if we have all required fields with values
    const requiredFieldsComplete = Object.keys(validationRules).every(fieldName => {
      const isRequired = validationRules[fieldName].some(rule => rule.required);
      return !isRequired || (formState[fieldName] && formState[fieldName].trim() !== '');
    });

    // If we have values for all required fields, run validation
    if (requiredFieldsComplete) {
      const hasErrors = Object.keys(validationRules).some(fieldName => {
        const value = formState[fieldName];
        const errorMessage = validateField(fieldName, value);
        return !!errorMessage;
      });
      
      setIsValid(!hasErrors);
    }
  }, [formState]);

  const validateField = useCallback(
    (name: string, value: any): string | null => {
      if (!validationRules[name]) return null;

      for (const rule of validationRules[name]) {
        // Check required
        if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
          return rule.message;
        }

        // Skip other validations if value is empty and not required
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          continue;
        }

        // Check regex pattern
        if (rule.pattern && !rule.pattern.test(value)) {
          return rule.message;
        }

        // Check custom validation function
        if (rule.validate && !rule.validate(value, formState)) {
          return rule.message;
        }
      }

      return null;
    },
    [formState, validationRules]
  );

  const validateAllFields = useCallback((): boolean => {
    const newErrors: FieldErrors = {};
    let formValid = true;
    const newFieldStates = { ...fieldStates };

    Object.keys(validationRules).forEach((fieldName) => {
      const value = formState[fieldName];
      const errorMessage = validateField(fieldName, value);
      
      if (errorMessage) {
        newErrors[fieldName] = errorMessage;
        formValid = false;
        
        newFieldStates[fieldName] = {
          ...newFieldStates[fieldName],
          touched: true,
          valid: false
        };
      } else {
        newFieldStates[fieldName] = {
          ...newFieldStates[fieldName],
          touched: true,
          valid: true
        };
      }
    });

    setErrors(newErrors);
    setFieldStates(newFieldStates);
    setIsValid(formValid);
    
    // Log validation results for debugging
    console.log('Form validation results:', {
      formValid,
      errors: newErrors,
      fieldStates: newFieldStates
    });
    
    return formValid;
  }, [formState, validateField, validationRules, fieldStates]);

  const handleBlur = useCallback(
    (name: string) => {
      const newFieldStates = { ...fieldStates };
      newFieldStates[name] = {
        ...newFieldStates[name],
        touched: true
      };
      setFieldStates(newFieldStates);

      const errorMessage = validateField(name, formState[name]);
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: errorMessage
      }));

      // Check if all required fields that have been touched are valid
      const touchedRequiredFields = Object.keys(validationRules).filter(fieldName => {
        const isRequired = validationRules[fieldName].some(rule => rule.required);
        return isRequired && newFieldStates[fieldName]?.touched;
      });
      
      const touchedFieldsValid = touchedRequiredFields.every(fieldName => {
        const error = fieldName === name ? errorMessage : errors[fieldName];
        return !error;
      });
      
      setIsValid(touchedFieldsValid);
      
      console.log('Field blur validation:', {
        field: name,
        isValid: touchedFieldsValid,
        touchedRequiredFields
      });
    },
    [errors, fieldStates, formState, validateField, validationRules]
  );

  const resetField = useCallback(
    (name: string) => {
      setErrors((prevErrors) => {
        const newErrors = { ...prevErrors };
        delete newErrors[name];
        return newErrors;
      });

      setFieldStates((prevStates) => ({
        ...prevStates,
        [name]: { touched: false, valid: true }
      }));

      // Update isValid state after resetting a field
      setTimeout(() => {
        const hasErrors = Object.values(errors).some(
          (error) => error !== null && error !== undefined
        );
        setIsValid(!hasErrors);
      }, 0);
    },
    [errors]
  );

  const resetForm = useCallback(() => {
    setErrors({});
    
    const resetStates: FieldStates = {};
    Object.keys(fieldStates).forEach((field) => {
      resetStates[field] = { touched: false, valid: true };
    });
    
    setFieldStates(resetStates);
    setIsValid(true);
  }, [fieldStates]);

  const setFieldError = useCallback((name: string, error: string | null) => {
    setErrors(prevErrors => {
      if (!error) {
        const newErrors = { ...prevErrors };
        delete newErrors[name];
        return newErrors;
      }
      
      return {
        ...prevErrors,
        [name]: error
      };
    });

    // Update field state
    setFieldStates(prevStates => ({
      ...prevStates,
      [name]: {
        ...prevStates[name],
        touched: true,
        valid: !error
      }
    }));

    // Update global validity
    setTimeout(() => {
      setIsValid(Object.keys(errors).length === 0);
    }, 0);
  }, [errors]);

  // Calculate touched fields for rendering
  const touchedFields = Object.entries(fieldStates)
    .filter(([_, state]) => state.touched)
    .map(([field]) => field);

  return {
    errors,
    isValid,
    validateField,
    validateAllFields,
    handleBlur,
    resetField,
    resetForm,
    setFieldError,
    touchedFields
  };
};

export default useFormValidation;