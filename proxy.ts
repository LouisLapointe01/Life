// proxy.ts — Protection des routes (Next.js 16, remplace middleware.ts)
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: proxy } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};
