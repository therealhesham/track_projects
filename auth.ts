import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
    };
  }
}

/**
 * A real bcrypt hash, computed once at startup, compared against when no
 * account matches. It must be genuinely well-formed: a malformed string makes
 * bcrypt.compare bail out immediately, which reopens the very timing gap this
 * exists to close.
 */
const DUMMY_HASH = bcrypt.hashSync("timing-parity-placeholder", 10);

/** Server-side only; never reaches the client. */
function debugAuth(reason: string, email: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[auth] sign-in rejected — ${reason} (email: ${email})`);
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // JWT rather than database sessions: the session carries only id/name/role,
  // so there is no need for the adapter's extra tables.
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
              passwordHash: true,
            },
          });
        } catch (error) {
          // Auth.js swallows anything thrown here and reports a generic
          // CredentialsSignin, which hides real faults — a missing column, an
          // unreachable database. Surface it in the server log.
          debugAuth(
            `database error: ${error instanceof Error ? error.message.split("\n")[0] : error}`,
            email,
          );
          return null;
        }

        // Always run a comparison, even with no account, so a wrong email and a
        // wrong password take the same time and cannot be told apart.
        const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

        if (!user) return debugAuth("no account with that email", email), null;
        if (!user.passwordHash)
          return debugAuth("account has no password set — run the seed", email), null;
        if (!user.isActive) return debugAuth("account is inactive", email), null;
        if (!ok) return debugAuth("wrong password", email), null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role: UserRole }).role;
      }
      // Re-read the role on refresh so a demotion takes effect without waiting
      // for the token to expire.
      if (trigger === "update" && token.uid) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.uid as string },
          select: { role: true, isActive: true },
        });
        if (fresh?.isActive) token.role = fresh.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as UserRole;
      return session;
    },
  },
});
