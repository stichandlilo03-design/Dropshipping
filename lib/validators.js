// Email validation
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password validation
export function validatePassword(password) {
  return password && password.length >= 8;
}

// Phone validation
export function validatePhone(phone) {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phone && phoneRegex.test(phone);
}

// Name validation
export function validateName(name) {
  return name && name.trim().length >= 2;
}

// ZIP code validation (US)
export function validateZipCode(zip) {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip);
}

// Credit card validation (Luhn algorithm)
export function validateCreditCard(cardNumber) {
  const cleaned = cardNumber.replace(/\s/g, '');
  
  if (!/^\d{13,19}$/.test(cleaned)) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// Order validation
export function validateOrder(order) {
  const errors = [];

  if (!order.customerId) errors.push('Customer ID required');
  if (!order.items || order.items.length === 0) errors.push('Items required');
  if (!order.total || order.total <= 0) errors.push('Valid total required');

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// Customer validation
export function validateCustomer(customer) {
  const errors = [];

  if (!validateEmail(customer.email)) errors.push('Valid email required');
  if (!validateName(customer.firstName)) errors.push('Valid first name required');
  if (!validateName(customer.lastName)) errors.push('Valid last name required');
  if (customer.phone && !validatePhone(customer.phone)) errors.push('Valid phone required');

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// Coupon validation
export function validateCoupon(coupon) {
  const errors = [];

  if (!coupon.code) errors.push('Coupon code required');
  if (!coupon.type || !['percentage', 'fixed', 'free_shipping'].includes(coupon.type)) {
    errors.push('Valid coupon type required');
  }
  if (coupon.value <= 0) errors.push('Valid coupon value required');
  if (coupon.max_uses < 1) errors.push('Max uses must be at least 1');
  if (!coupon.start_date) errors.push('Start date required');
  if (!coupon.end_date) errors.push('End date required');

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// Helper: Validate date
export function validateDate(dateString) {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

// Helper: Is future date
export function isFutureDate(dateString) {
  return new Date(dateString) > new Date();
}

// Helper: Is past date
export function isPastDate(dateString) {
  return new Date(dateString) < new Date();
}
