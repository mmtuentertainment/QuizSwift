import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // JWT sessions for Edge middleware compatibility
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      // Include user ID in JWT token for audit logging
      if (user) {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      // Include user ID in session from JWT token
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
