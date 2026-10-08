import type { SessionType } from "@/lib/tenant";

export type { SessionType };

// Shapes returned by the server's auth module.

export type AuthUser = {
  id: string;
  fullname: string;
  email: string | null;
  phone: string | null;
  mustChangePassword: boolean;
};

export type SchoolSummary = {
  id: string;
  nameEn: string;
  nameBn: string | null;
  subdomain: string;
};

export type RoleSummary = { id: string; name: string };

export type PlatformMe = {
  sessionType: "PLATFORM";
  user: AuthUser;
};

export type SchoolMe = {
  sessionType: "SCHOOL";
  user: AuthUser;
  school: SchoolSummary & { language: "EN" | "BN"; logo: string | null; favicon: string | null };
  roles: RoleSummary[];
  isSuperAdmin: boolean;
  // already limited to the school's enabled modules; a super admin gets all of them
  permissions: string[];
  modules: string[];
};

export type Me = PlatformMe | SchoolMe;

export type PlatformLoginResult = { user: AuthUser };
export type SchoolLoginResult = { user: AuthUser; school: SchoolSummary; roles: RoleSummary[] };
