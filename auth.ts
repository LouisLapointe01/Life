// auth.ts — Configuration NextAuth v5 (racine du projet)
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { UserRole } from "@prisma/client";
import "@/lib/types";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role as UserRole) ?? "USER";

        // Promouvoir automatiquement l'email admin
        if (user.email === process.env.ADMIN_EMAIL) {
          await prisma.user.update({
            where: { email: user.email! },
            data: { role: "ADMIN" },
          });
          token.role = "ADMIN";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
