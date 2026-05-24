// utils/validation.js

/**
 * Password validation utility
 * @param {string} password - The password to validate
 * @returns {Object} { isValid: boolean, errors: string[], strength: 'weak' | 'medium' | 'strong' }
 */
export const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors, strength: 'weak' };
  }
  
  if (password.length < 8) {
    errors.push('At least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('One number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('One special character (optional)');
  }
  
  const isValid = errors.length === 0;
  
  // Calculate password strength
  let strength = 'weak';
  const score = [password.length >= 8, /[A-Z]/.test(password), /[a-z]/.test(password), /[0-9]/.test(password)].filter(Boolean).length;
  if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  
  return { isValid, errors, strength };
};

/**
 * Email validation utility
 * @param {string} email - The email to validate
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Name validation utility
 * @param {string} name - The name to validate
 * @returns {boolean}
 */
export const isValidName = (name) => {
  return name && name.trim().length >= 2;
};

/**
 * Get password strength color
 * @param {string} strength - 'weak', 'medium', or 'strong'
 * @returns {string} Color hex code
 */
export const getPasswordStrengthColor = (strength) => {
  switch (strength) {
    case 'strong': return '#10b981';
    case 'medium': return '#f59e0b';
    default: return '#ef4444';
  }
};

/**
 * Get password strength text
 * @param {string} strength - 'weak', 'medium', or 'strong'
 * @returns {string}
 */
export const getPasswordStrengthText = (strength) => {
  switch (strength) {
    case 'strong': return 'Strong password!';
    case 'medium': return 'Medium strength - add special characters';
    default: return 'Weak password - add more variety';
  }
};