export type User = {
  id: string;
  name: string;
  role: 'admin' | 'employee' | 'security';
  token: string;
  zone?: string | null;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterData = {
  email: string;
  password: string;
  role: 'employee' | 'admin';
};