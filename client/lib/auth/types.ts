import type { SessionType } from "@/lib/tenant";

export type { SessionType };

// Shapes returned by the server's auth module.

export type AuthUser = {
  id: string;
  fullname: string;
  email: string | null;
  phone: string | null;
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
  // the school's current academic year (null until one is set)
  academicYear: { id: string; name: string } | null;
  // changes their own password with the current one (guardians only; teachers and staff ask the super admin)
  canChangeOwnPassword: boolean;
};

export type Me = PlatformMe | SchoolMe;

export type PlatformLoginResult = { user: AuthUser };
export type SchoolLoginResult = { user: AuthUser; school: SchoolSummary; roles: RoleSummary[] };
