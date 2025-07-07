import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterForm } from './RegisterForm';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';

// Mock the action
const mockRegisterAction = jest.fn();
jest.mock('@/actions/auth.actions', () => ({
  registerAction: mockRegisterAction,
}));

describe('RegisterForm', () => {
  let mockRouterPush: jest.Mock;
  let mockFormAction: jest.Mock;

  beforeEach(() => {
    mockRouterPush = jest.fn();
    mockFormAction = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });
    (useActionState as jest.Mock).mockReturnValue([
      { success: false, message: '' },
      mockFormAction,
      false,
    ]);
    jest.clearAllMocks();
  });

  it('should render all form fields and submit button', () => {
    render(<RegisterForm />);
    
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/apellido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /registrarse/i }),
    ).toBeInTheDocument();
  });

  it('should display success message after successful registration', () => {
    const successState = {
      success: true,
      message: 'Registration successful! Please check your email.',
    };
    (useActionState as jest.Mock).mockReturnValue([
      successState,
      mockFormAction,
      false,
    ]);

    render(<RegisterForm />);
    
    expect(
      screen.getByText('Registration successful! Please check your email.'),
    ).toBeInTheDocument();
  });

  it('should display error message on failed registration', () => {
    const errorState = {
      success: false,
      message: 'Email already exists',
    };
    (useActionState as jest.Mock).mockReturnValue([
      errorState,
      mockFormAction,
      false,
    ]);

    render(<RegisterForm />);
    
    expect(screen.getByText('Email already exists')).toBeInTheDocument();
  });

  it('should show loading state when form is being submitted', () => {
    (useActionState as jest.Mock).mockReturnValue([
      { success: false, message: '' },
      mockFormAction,
      true, // isPending
    ]);

    render(<RegisterForm />);
    
    const submitButton = screen.getByRole('button', { name: /registrando/i });
    expect(submitButton).toBeDisabled();
  });

  it('should submit form with correct data', async () => {
    render(<RegisterForm />);
    
    const firstNameInput = screen.getByLabelText(/nombre/i);
    const lastNameInput = screen.getByLabelText(/apellido/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText('Contraseña');
    const confirmPasswordInput = screen.getByLabelText(/confirmar contraseña/i);
    const submitButton = screen.getByRole('button');

    fireEvent.change(firstNameInput, { target: { value: 'John' } });
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // The form should call the action through useActionState
    expect(mockFormAction).toHaveBeenCalled();
  });
});
