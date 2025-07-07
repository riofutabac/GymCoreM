import { render, screen } from '@testing-library/react';
import { SidebarWrapper } from './SidebarWrapper';
import { useAuth } from '@/hooks/useAuth';

// Mock the useAuth hook
jest.mock('@/hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock the Sidebar component
jest.mock('./Sidebar', () => ({
  Sidebar: jest.fn(({ userRole, userName, userEmail }) => (
    <div data-testid="sidebar">
      <span>Role: {userRole}</span>
      <span>Name: {userName}</span>
      <span>Email: {userEmail}</span>
    </div>
  )),
}));

describe('SidebarWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading spinner when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    render(<SidebarWrapper />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('should show "No autenticado" when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    render(<SidebarWrapper />);
    
    expect(screen.getByText('No autenticado')).toBeInTheDocument();
  });

  it('should render Sidebar with normalized role for OWNER', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'owner@gym.com',
        name: 'Gym Owner',
        role: 'OWNER',
      },
      isLoading: false,
    });

    render(<SidebarWrapper />);
    
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByText('Role: owner')).toBeInTheDocument();
    expect(screen.getByText('Name: Gym Owner')).toBeInTheDocument();
    expect(screen.getByText('Email: owner@gym.com')).toBeInTheDocument();
  });

  it('should render Sidebar with normalized role for MANAGER', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-2',
        email: 'manager@gym.com',
        name: 'Gym Manager',
        role: 'MANAGER',
      },
      isLoading: false,
    });

    render(<SidebarWrapper />);
    
    expect(screen.getByText('Role: manager')).toBeInTheDocument();
  });

  it('should render Sidebar with normalized role for MEMBER', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-3',
        email: 'member@gym.com',
        name: 'Gym Member',
        role: 'MEMBER',
      },
      isLoading: false,
    });

    render(<SidebarWrapper />);
    
    expect(screen.getByText('Role: member')).toBeInTheDocument();
  });

  it('should default to member role for unknown roles', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-4',
        email: 'user@gym.com',
        name: 'Unknown User',
        role: 'UNKNOWN_ROLE' as any,
      },
      isLoading: false,
    });

    render(<SidebarWrapper />);
    
    expect(screen.getByText('Role: member')).toBeInTheDocument();
  });

  it('should use email username when name is not provided', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-5',
        email: 'test@example.com',
        name: '',
        role: 'MEMBER',
      },
      isLoading: false,
    });

    render(<SidebarWrapper />);
    
    expect(screen.getByText('Name: test')).toBeInTheDocument();
  });

  it('should use "Usuario" as fallback when no name or email', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-6',
        email: '',
        name: '',
        role: 'MEMBER',
      },
      isLoading: false,
    });

    render(<SidebarWrapper />);
    
    expect(screen.getByText('Name: Usuario')).toBeInTheDocument();
  });
});
