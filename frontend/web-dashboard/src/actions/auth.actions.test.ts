import { loginAction, registerAction } from './auth.actions';
import * as api from '@/lib/api/auth';
import { cookies } from 'next/headers';

// Mock the API layer and next/headers
jest.mock('@/lib/api/auth');
jest.mock('next/headers');

const mockApi = api as jest.Mocked<typeof api>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

describe('Auth Actions', () => {
  const mockSet = jest.fn();
  const mockGet = jest.fn();
  const mockDelete = jest.fn();

  beforeEach(() => {
    mockSet.mockClear();
    mockGet.mockClear();
    mockDelete.mockClear();
    mockCookies.mockReturnValue({
      set: mockSet,
      get: mockGet,
      delete: mockDelete,
    } as any);
  });

  describe('loginAction', () => {
    it('should return success and set cookies on valid login', async () => {
      const formData = new FormData();
      formData.append('email', 'owner@gym.com');
      formData.append('password', 'password123');

      mockApi.loginUser.mockResolvedValue({
        access_token: 'fake-jwt-token',
        user: {
          firstName: 'Gym',
          lastName: 'Owner',
          email: 'owner@gym.com',
          role: 'OWNER',
        },
      });

      const result = await loginAction(
        { success: false, message: '' },
        formData,
      );

      expect(mockApi.loginUser).toHaveBeenCalledWith({
        email: 'owner@gym.com',
        password: 'password123',
      });
      expect(mockSet).toHaveBeenCalledTimes(4); // jwt_token, user_role, user_name, user_email
      expect(mockSet).toHaveBeenCalledWith('user_role', 'owner', expect.any(Object));
      expect(result).toEqual({
        success: true,
        message: 'Login exitoso.',
        redirectUrl: '/owner',
      });
    });

    it('should return failure message if login API throws an error', async () => {
      const formData = new FormData();
      formData.append('email', 'wrong@gym.com');
      formData.append('password', 'wrong');

      mockApi.loginUser.mockRejectedValue(new Error('Credenciales inválidas.'));

      const result = await loginAction(
        { success: false, message: '' },
        formData,
      );

      expect(mockSet).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Credenciales inválidas.',
      });
    });

    it('should return validation error for invalid form data', async () => {
      const formData = new FormData();
      formData.append('email', 'not-an-email');
      formData.append('password', 'short');

      const result = await loginAction(
        { success: false, message: '' },
        formData,
      );

      expect(mockApi.loginUser).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Datos inválidos. Por favor, revisa el formulario.',
      });
    });

    it('should redirect to correct path based on user role', async () => {
      const formData = new FormData();
      formData.append('email', 'manager@gym.com');
      formData.append('password', 'password123');

      mockApi.loginUser.mockResolvedValue({
        access_token: 'fake-jwt-token',
        user: {
          firstName: 'Gym',
          lastName: 'Manager',
          email: 'manager@gym.com',
          role: 'MANAGER',
        },
      });

      const result = await loginAction(
        { success: false, message: '' },
        formData,
      );

      expect(result.redirectUrl).toBe('/manager');
    });
  });

  describe('registerAction', () => {
    it('should return success message on valid registration', async () => {
      const formData = new FormData();
      formData.append('firstName', 'John');
      formData.append('lastName', 'Doe');
      formData.append('email', 'john@example.com');
      formData.append('password', 'password123');
      formData.append('confirmPassword', 'password123');

      mockApi.registerUser.mockResolvedValue({
        id: 'user-123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'MEMBER',
        message: 'Usuario registrado exitosamente.',
      });

      const result = await registerAction(
        { success: false, message: '' },
        formData,
      );

      expect(mockApi.registerUser).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      });
      expect(result).toEqual({
        success: true,
        message: 'Usuario registrado exitosamente.',
      });
    });

    it('should return failure message if registration API throws an error', async () => {
      const formData = new FormData();
      formData.append('firstName', 'John');
      formData.append('lastName', 'Doe');
      formData.append('email', 'existing@example.com');
      formData.append('password', 'password123');
      formData.append('confirmPassword', 'password123');

      mockApi.registerUser.mockRejectedValue(
        new Error('El email ya está registrado.'),
      );

      const result = await registerAction(
        { success: false, message: '' },
        formData,
      );

      expect(result).toEqual({
        success: false,
        message: 'El email ya está registrado.',
      });
    });

    it('should return validation error for mismatched passwords', async () => {
      const formData = new FormData();
      formData.append('firstName', 'John');
      formData.append('lastName', 'Doe');
      formData.append('email', 'john@example.com');
      formData.append('password', 'password123');
      formData.append('confirmPassword', 'different-password');

      const result = await registerAction(
        { success: false, message: '' },
        formData,
      );

      expect(mockApi.registerUser).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Datos inválidos. Por favor, revisa el formulario.',
      });
    });

    it('should return validation error for invalid email format', async () => {
      const formData = new FormData();
      formData.append('firstName', 'John');
      formData.append('lastName', 'Doe');
      formData.append('email', 'invalid-email');
      formData.append('password', 'password123');
      formData.append('confirmPassword', 'password123');

      const result = await registerAction(
        { success: false, message: '' },
        formData,
      );

      expect(mockApi.registerUser).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Datos inválidos. Por favor, revisa el formulario.',
      });
    });
  });
});
