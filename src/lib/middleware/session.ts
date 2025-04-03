import { supabase } from '../supabase';
import { AuthError } from '../errors';
import { retryWithBackoff } from '../retryHandler';
import { handleError } from '../errorTracking';

interface SessionData {
  id: string;
  user_id: string;
  refresh_token: string | null;
  user_agent: string;
  ip_address: string;
  expires_at: string;
}

export class SessionManager {
  private static readonly SESSION_KEY = 'revoa-auth-session';
  private static readonly SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

  static async createSession(userId: string): Promise<SessionData> {
    try {
      const sessionData: Partial<SessionData> = {
        user_id: userId,
        user_agent: navigator.userAgent,
        expires_at: new Date(Date.now() + this.SESSION_DURATION).toISOString()
      };

      const { data: session, error } = await retryWithBackoff(
        () => supabase
          .from('auth_sessions')
          .insert([sessionData])
          .select()
          .single()
      );

      if (error) throw error;
      if (!session) throw new Error('Failed to create session');

      // Store session data
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

      return session;
    } catch (error) {
      handleError(error);
      throw new AuthError('Failed to create session', 'auth/session-creation-failed', 500);
    }
  }

  static async validateSession(sessionId: string): Promise<boolean> {
    try {
      const { data: session, error } = await retryWithBackoff(
        () => supabase
          .from('auth_sessions')
          .select('*')
          .eq('id', sessionId)
          .single()
      );

      if (error) throw error;
      if (!session) return false;

      // Check expiration
      if (new Date(session.expires_at) < new Date()) {
        await this.destroySession(sessionId);
        return false;
      }

      // Verify user agent
      if (session.user_agent !== navigator.userAgent) {
        await this.destroySession(sessionId);
        return false;
      }

      return true;
    } catch (error) {
      handleError(error);
      return false;
    }
  }

  static async refreshSession(sessionId: string): Promise<SessionData | null> {
    try {
      const { data: session, error } = await retryWithBackoff(
        () => supabase
          .from('auth_sessions')
          .update({
            expires_at: new Date(Date.now() + this.SESSION_DURATION).toISOString()
          })
          .eq('id', sessionId)
          .select()
          .single()
      );

      if (error) throw error;
      if (!session) return null;

      // Update stored session
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

      return session;
    } catch (error) {
      handleError(error);
      return null;
    }
  }

  static async destroySession(sessionId: string): Promise<void> {
    try {
      await retryWithBackoff(
        () => supabase
          .from('auth_sessions')
          .delete()
          .eq('id', sessionId)
      );

      localStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      handleError(error);
    }
  }

  static async getCurrentSession(): Promise<SessionData | null> {
    try {
      const storedSession = localStorage.getItem(this.SESSION_KEY);
      if (!storedSession) return null;

      const session = JSON.parse(storedSession);
      const isValid = await this.validateSession(session.id);

      if (!isValid) {
        await this.destroySession(session.id);
        return null;
      }

      return session;
    } catch (error) {
      handleError(error);
      return null;
    }
  }
}