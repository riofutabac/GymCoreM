import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';
import { useActionState } from 'react';
import { useRouter } from 'next/navigation';

// Mock the action
const mockLoginAction = jest.fn();
jest.mock('@/actions/auth.actions', () => ({
  loginAction: mockLoginAction,
}));

describe('LoginForm', () => {
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
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
  });

  it('should display an error message on failed login', () => {
    const initialState = { success: false, message: 'Invalid credentials' };
    (useActionState as jest.Mock).mockReturnValue([
      initialState,
      mockFormAction,
      false,
    ]);

    render(<LoginForm />);
    
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('should call router.push on successful login', async () => {
    const successState = {
      success: true,
      message: 'Success',
      redirectUrl: '/dashboard',
    };
    
    // Mock the useEffect behavior by re-rendering with success state
    const { rerender } = render(<LoginForm />);
    (useActionState as jest.Mock).mockReturnValue([
      successState,
      mockFormAction,
      false,
    ]);
    rerender(<LoginForm />);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should show loading state when form is being submitted', () => {
    (useActionState as jest.Mock).mockReturnValue([
      { success: false, message: '' },
      mockFormAction,
      true, // isPending
    ]);

    render(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /iniciando sesión/i });
    expect(submitButton).toBeDisabled();
  });

  it('should submit form with correct data', async () => {
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // The form should call the action through useActionState
    expect(mockFormAction).toHaveBeenCalled();
  });
});
