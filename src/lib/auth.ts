import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" }, // Database sessions for persistence + auditability
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    session({ session, user }) {
      // Include user ID in session for audit logging
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
})
