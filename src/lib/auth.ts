import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Note: Using JWT strategy without PrismaAdapter
// PrismaAdapter creates Account/Session records not used with JWT sessions
// JWT strategy required for Edge middleware compatibility
export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required for Vercel/reverse proxy deployments to trust X-Forwarded-Host header
  trustHost: true,
  session: { strategy: 'jwt' },
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      // Include user ID and role in JWT token for audit logging and RBAC
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      // Include user ID and role in session from JWT token
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
