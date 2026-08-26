import "next-auth";
import "next-auth/jwt";

type Role = "ADMIN" | "STUDENT";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
