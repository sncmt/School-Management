"use client";

import { ArrowLeft, KeyRound, Search, Wand2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { LoginCredentials } from "@/components/data/LoginCredentials";
import { TablePagination } from "@/components/data/TablePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getFieldErrors } from "@/lib/api/errors";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useSchool } from "@/lib/platform/schools";
import {
  SCHOOL_USER_ROLES,
  usePasswordLog,
  useSchoolUsers,
  useSetUserPassword,
  type SchoolUser,
  type SchoolUserRole,
  type SetPasswordResult,
} from "@/lib/platform/schoolUsers";
import { schoolSiteUrl } from "@/lib/tenant";
import { cn } from "@/lib/utils";

const ALL = "ALL";
const PAGE_SIZES = [20, 50, 100];
const SYSTEM_ROLES = new Set(["SUPER_ADMIN", "TEACHER", "GUARDIAN"]);

/** A school's people for the platform admin: everyone with a login, a new password for any one, and the record of changes. */
export function SchoolUsersPage({ schoolId }: { schoolId: string }) {
  const t = useTranslations("platform.schoolUsers");
  const name = useLocalizedName();
  const school = useSchool(schoolId);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/schools/${schoolId}`}>
          <ArrowLeft /> {t("back")}
        </Link>
      </Button>
      <div>
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-subtitle">{school.data ? t("description", { school: name(school.data) }) : " "}</p>
      </div>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">{t("tabs.users")}</TabsTrigger>
          <TabsTrigger value="log">{t("tabs.log")}</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersList schoolId={schoolId} subdomain={school.data?.subdomain} />
        </TabsContent>
        <TabsContent value="log">
          <ChangeLog schoolId={schoolId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RoleBadges({ roles }: { roles: string[] }) {
  const t = useTranslations("platform.schoolUsers.roles");
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <Badge key={r} variant="outline" className="font-normal">
          {SYSTEM_ROLES.has(r) ? t(r as "TEACHER") : r}
        </Badge>
      ))}
    </div>
  );
}

function UsersList({ schoolId, subdomain }: { schoolId: string; subdomain?: string }) {
  const t = useTranslations("platform.schoolUsers");
  const describeError = useErrorMessage();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim());
  const [role, setRole] = useState<SchoolUserRole | undefined>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0]);
  const list = useSchoolUsers(schoolId, { page, limit, ...(search ? { search } : {}), ...(role ? { role } : {}) });
  const [changing, setChanging] = useState<SchoolUser | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          value={role ?? ALL}
          onValueChange={(v) => {
            setRole(v === ALL ? undefined : (v as SchoolUserRole));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44" label={t("role")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allRoles")}</SelectItem>
            {SCHOOL_USER_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {t(`roles.${r}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative w-full sm:ml-auto sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder={t("search")}
            aria-label={t("search")}
            className="pl-8"
          />
        </div>
      </div>

      <div className={cn("overflow-x-auto rounded-xl border bg-card", list.isFetching && !list.isPending && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">{t("columns.name")}</TableHead>
              <TableHead>{t("columns.login")}</TableHead>
              <TableHead>{t("columns.roles")}</TableHead>
              <TableHead className="w-44 pr-5" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isPending ? (
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-3 pl-5">
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : list.isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">
                  {describeError(list.error)}
                </TableCell>
              </TableRow>
            ) : list.data.items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              list.data.items.map((u) => (
                <TableRow key={u.membershipId} className={cn(u.status !== "ACTIVE" && "text-muted-foreground")}>
                  <TableCell className="py-3 pl-5">
                    <div className="font-medium">{u.user.fullname}</div>
                    {u.status !== "ACTIVE" && <div className="text-xs">{t("inactive")}</div>}
                    {u.otherSchools > 0 && <div className="text-xs text-muted-foreground">{t("otherSchools", { count: u.otherSchools })}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-sm" data-ascii-digits>
                    {u.user.email ?? u.user.phone ?? "—"}
                  </TableCell>
                  <TableCell>
                    <RoleBadges roles={u.roles} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {u.platformAdmin ? (
                      <span className="text-xs text-muted-foreground">{t("platformAccount")}</span>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setChanging(u)}>
                        <KeyRound /> {t("change")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {list.data && list.data.meta.total > 0 && (
        <TablePagination
          page={list.data.meta.page}
          limit={list.data.meta.limit}
          total={list.data.meta.total}
          totalPages={Math.max(1, list.data.meta.totalPages)}
          limits={PAGE_SIZES}
          onPageChange={setPage}
          onLimitChange={(n) => {
            setLimit(n);
            setPage(1);
          }}
          disabled={list.isFetching}
        />
      )}

      <PasswordDialog schoolId={schoolId} subdomain={subdomain} user={changing} onClose={() => setChanging(null)} />
    </div>
  );
}

/* A new password: typed, or made up and shown once. Every session of the account ends. */
function PasswordDialog({ schoolId, subdomain, user, onClose }: { schoolId: string; subdomain?: string; user: SchoolUser | null; onClose: () => void }) {
  const t = useTranslations("platform.schoolUsers.dialog");
  const describeError = useErrorMessage();
  const set = useSetUserPassword(schoolId);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SetPasswordResult | null>(null);
  const [shownFor, setShownFor] = useState<string | null>(null);
  // a fresh form for each person
  if ((user?.user.id ?? null) !== shownFor) {
    setShownFor(user?.user.id ?? null);
    setPassword("");
    setError(null);
    setResult(null);
  }

  const save = (generate: boolean) => {
    if (!user) return;
    if (!generate && password.length < 8) return setError(t("tooShort"));
    setError(null);
    set.mutate(
      { schoolId, userId: user.user.id, ...(generate ? {} : { newPassword: password }) },
      {
        onSuccess: (r) => {
          toast.success(t("done", { name: r.user.fullname }));
          // a made-up password is shown once; a typed one the admin already knows
          if (r.temporaryPassword) setResult(r);
          else onClose();
        },
        onError: (e) => {
          const fields = getFieldErrors(e);
          setError(fields.newPassword ?? describeError(e));
        },
      },
    );
  };

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && !set.isPending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { name: user?.user.fullname ?? "" })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {result?.temporaryPassword && user ? (
          <div className="space-y-3">
            <p className="text-sm">{t("generatedNote")}</p>
            <LoginCredentials
              loginUrl={subdomain ? schoolSiteUrl(subdomain, "/login") : ""}
              idLabel={user.user.email ? t("email") : t("phone")}
              id={(user.user.email ?? user.user.phone ?? "").replace(/^\+?880/, "0")}
              password={result.temporaryPassword}
            />
            {result.otherSchools > 0 && <p className="text-xs text-muted-foreground">{t("otherSchoolsNote", { count: result.otherSchools })}</p>}
            <DialogFooter>
              <Button onClick={onClose}>{t("doneButton")}</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {user && user.otherSchools > 0 && (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-sm">{t("sharedWarning", { count: user.otherSchools })}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="pw-new">{t("newPassword")}</Label>
              <Input id="pw-new" type="text" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} className="font-mono" autoFocus />
              {error ? <p className="text-xs text-destructive">{error}</p> : <p className="text-xs text-muted-foreground">{t("rule")}</p>}
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={() => save(true)} disabled={set.isPending}>
                <Wand2 /> {t("generate")}
              </Button>
              <Button type="button" onClick={() => save(false)} disabled={set.isPending || password.length === 0}>
                <KeyRound /> {set.isPending ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* Every password set for the school's people, newest first. */
function ChangeLog({ schoolId }: { schoolId: string }) {
  const t = useTranslations("platform.schoolUsers.log");
  const format = useFormatter();
  const describeError = useErrorMessage();
  const [page, setPage] = useState(1);
  const log = usePasswordLog(schoolId, page);

  if (log.isPending) return <Skeleton className="h-40 rounded-xl" />;
  if (log.isError) return <p className="text-sm text-muted-foreground">{describeError(log.error)}</p>;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">{t("when")}</TableHead>
              <TableHead>{t("whose")}</TableHead>
              <TableHead>{t("by")}</TableHead>
              <TableHead className="pr-5">{t("how")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {log.data.items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              log.data.items.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="py-3 pl-5 text-sm whitespace-nowrap">
                    {format.dateTime(new Date(l.createdAt), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" })}
                  </TableCell>
                  <TableCell className="font-medium">{l.targetName}</TableCell>
                  <TableCell className="text-sm">
                    {l.changedByName}
                    <div className="text-xs text-muted-foreground">{t(`sources.${l.source}`)}</div>
                  </TableCell>
                  <TableCell className="pr-5 text-sm">{t(l.generated ? "generated" : "typed")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {log.data.meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t("newer")}
          </Button>
          <Button variant="outline" size="sm" disabled={page >= log.data.meta.totalPages} onClick={() => setPage(page + 1)}>
            {t("older")}
          </Button>
        </div>
      )}
    </div>
  );
}
