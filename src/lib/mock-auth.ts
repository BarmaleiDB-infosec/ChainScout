// Mock auth service for MVP - uses localStorage instead of Supabase
import { User } from '@supabase/supabase-js';

interface MockUser extends User {
  id: string;
  email: string;
  user_metadata?: {
    [key: string]: any;
  };
}

const MOCK_AUTH_KEY = 'chainscout_mock_user';
const MOCK_USERS_KEY = 'chainscout_mock_users';

export const mockAuthService = {
  async signUp(email: string, password: string): Promise<{ user: MockUser | null; error: Error | null }> {
    try {
      // Get existing users
      const usersJson = localStorage.getItem(MOCK_USERS_KEY) || '{}';
      const users = JSON.parse(usersJson);

      // Check if user already exists
      if (users[email]) {
        return {
          user: null,
          error: new Error('User already exists'),
        };
      }

      // Create new user
      const user: MockUser = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
      };

      users[email] = { password, user };
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
      localStorage.setItem(MOCK_AUTH_KEY, JSON.stringify(user));

      return { user, error: null };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error : new Error('Sign up failed'),
      };
    }
  },

  async signIn(email: string, password: string): Promise<{ user: MockUser | null; error: Error | null }> {
    try {
      const usersJson = localStorage.getItem(MOCK_USERS_KEY) || '{}';
      const users = JSON.parse(usersJson);

      const userRecord = users[email];
      if (!userRecord || userRecord.password !== password) {
        return {
          user: null,
          error: new Error('Invalid email or password'),
        };
      }

      localStorage.setItem(MOCK_AUTH_KEY, JSON.stringify(userRecord.user));
      return { user: userRecord.user, error: null };
    } catch (error) {
      return {
        user: null,
        error: error instanceof Error ? error : new Error('Sign in failed'),
      };
    }
  },

  async getUser(): Promise<MockUser | null> {
    try {
      const userJson = localStorage.getItem(MOCK_AUTH_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  },

  async signOut(): Promise<{ error: Error | null }> {
    try {
      localStorage.removeItem(MOCK_AUTH_KEY);
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Sign out failed'),
      };
    }
  },
};
