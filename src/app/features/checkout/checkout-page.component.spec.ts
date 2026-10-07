import {
  CheckoutPageComponent,
  addressValidationMessage,
  nameValidationMessage,
  phoneValidationMessage
} from './checkout-page.component';

describe('CheckoutPageComponent', () => {
  it('is defined', () => {
    expect(CheckoutPageComponent).toBeDefined();
  });
});

describe('checkout name validation', () => {
  it('accepts a name at the 5 character minimum', () => {
    expect(nameValidationMessage('Alyan')).toBe('');
  });

  it('accepts a name at the 20 character maximum', () => {
    expect(nameValidationMessage('AbdelrahmanMohamed')).toBe('');
  });

  it('rejects a name shorter than 5 characters', () => {
    expect(nameValidationMessage('Ali')).toContain('at least 5');
  });

  it('rejects a name longer than 20 characters', () => {
    expect(nameValidationMessage('Abdelrahman Mohamed Aly')).toContain('more than 20');
  });

  it('rejects numbers in a name', () => {
    expect(nameValidationMessage('Ahmed12345')).toContain('letters and spaces');
  });

  it('rejects special characters in a name', () => {
    expect(nameValidationMessage('Ahmed Aly@!')).toContain('letters and spaces');
  });

  it('accepts letters and spaces only', () => {
    expect(nameValidationMessage('Ahmed Aly')).toBe('');
  });

  it('rejects an empty name', () => {
    expect(nameValidationMessage('   ')).toContain('enter your full name');
  });
});

describe('checkout address validation', () => {
  it('accepts an address between 5 and 20 letters', () => {
    expect(addressValidationMessage('Nasr City')).toBe('');
    expect(addressValidationMessage('Maadi')).toBe('');
    expect(addressValidationMessage('Fifth Settlemen')).toBe('');
    expect(addressValidationMessage('AbdelrahmanMohamedEl')).toBe('');
  });

  it('rejects an address shorter than 5 characters', () => {
    expect(addressValidationMessage('Giza')).toContain('at least 5');
  });

  it('rejects an address longer than 20 characters', () => {
    expect(addressValidationMessage('New Cairo Fifth Settlement')).toContain('more than 20');
  });

  it('rejects numbers in an address', () => {
    expect(addressValidationMessage('Street Twelve')).toBe('');
    expect(addressValidationMessage('Street 12')).toContain('letters and spaces');
  });

  it('rejects hyphenated and special addresses', () => {
    expect(addressValidationMessage('Nasr City One')).toBe('');
    expect(addressValidationMessage('Nasr City 1')).toContain('letters and spaces');
  });
});

describe('checkout phone validation', () => {
  it('accepts an Egyptian mobile number', () => {
    expect(phoneValidationMessage('01012345678')).toBe('');
  });

  it('rejects letters', () => {
    expect(phoneValidationMessage('call me now')).toContain('valid EG phone number');
  });
  it('rejects numbers longer than 11 digits', () => {
    expect(phoneValidationMessage('010123456789')).toContain('more than 11');
  });

  it('rejects an empty phone number', () => {
    expect(phoneValidationMessage('')).toContain('enter your phone number');
  });
});
