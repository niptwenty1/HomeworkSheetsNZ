import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}

const providers = [] as NextAuthOptions["providers"];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "development-secret",
  session: {
    strategy: "jwt",
  },
  providers,
  callbacks: {
    async signIn({ user }) {
      return Boolean(user.email && isAdminEmail(user.email));
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as typeof session.user & { id?: string | null; role?: string }).id = token.sub ?? null;
        (session.user as typeof session.user & { id?: string | null; role?: string }).role = "admin";
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
