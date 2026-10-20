"use client";

import { KeyRound, Lock, MoreHorizontal, Pencil, Plus, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { SetPasswordDialog } from "@/components/auth/SetPasswordDialog";
import { LoginCredentials } from "@/components/data/LoginCredentials";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSchoolMe } from "@/lib/auth/hooks";
import { toAsciiDigits } from "@/lib/i18n/digits";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAddStaff, useDeleteRole, useRoles, useSetStaffRoles, useStaff, type Role, type StaffMember } from "@/lib/school/roles";
import { localPhone } from "@/lib/school/students";
import { cn } from "@/lib/utils";
import { ListState } from "../finance/shared";
import { RoleEditorDialog } from "./RoleEditorDialog";

/** The school's roles and the people who work there (super admin only). */
export function RolesPage() {
  const t = useTranslations("school.roles");
  const me = useSchoolMe();
  if (me && !me.isSuperAdmin) {
    return <p className="py-12 text-center text-sm text-muted-foreground">{t("superAdminOnly")}</p>;
  }
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">{t("tabs.staff")}</TabsTrigger>
          <TabsTrigger value="roles">{t("tabs.roles")}</TabsTrigger>
        </TabsList>
        <TabsContent value="staff">
          <StaffTab />
        </TabsContent>
        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* A role's name: the built-in ones in the current language. */
const useRoleName = () => {
  const t = useTranslations("school.roles.kinds");
  return (role: { name: string; kind: Role["kind"] }) => (role.kind === "CUSTOM" ? role.name : t(role.kind));
};

// --------------------------------------------------------------------- roles

function RolesTab() {
  const t = useTranslations("school.roles");
  const format = useFormatter();
  const describeError = useErrorMessage();
  const roleName = useRoleName();
  const roles = useRoles();
  const remove = useDeleteRole();
  const [editing, setEditing] = useState<Role | null | undefined>();
  const [deleting, setDeleting] = useState<Role | null>(null);
  const total = roles.data?.permissions.length ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">{t("rolesDescription")}</p>
        <Button onClick={() => setEditing(null)} disabled={!roles.data}>
          <Plus /> {t("addRole")}
        </Button>
      </div>
      <ListState isPending={roles.isPending} error={roles.error} onRetry={() => roles.refetch()} empty={null}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roles.data?.roles.map((role) => {
            const fixed = role.kind === "SUPER_ADMIN" || role.kind === "GUARDIAN";
            return (
              <Card key={role.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {role.kind === "CUSTOM" ? <UserCog className="size-4" /> : <ShieldCheck className="size-4" />}
                        {roleName(role)}
                      </CardTitle>
                      <CardDescription>{role.kind === "CUSTOM" ? role.description || t("customRole") : t(`kindHints.${role.kind}`)}</CardDescription>
                    </div>
                    {!fixed && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(role)}>
                            <Pencil /> {t(role.kind === "TEACHER" ? "editPermissions" : "edit")}
                          </DropdownMenuItem>
                          {role.kind === "CUSTOM" && (
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(role)}>
                              <Trash2 /> {t("delete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {role.kind === "SUPER_ADMIN"
                      ? t("everything")
                      : role.kind === "GUARDIAN"
                        ? t("familyOnly")
                        : t("permissionCount", { count: role.permissions.length, total })}
                  </span>
                  <span className="flex items-center gap-1">
                    {fixed && <Lock className="size-3.5" />}
                    {t("memberCount", { count: role.members, n: format.number(role.members) })}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ListState>

      {roles.data && <RoleEditorDialog role={editing} permissions={roles.data.permissions} onClose={() => setEditing(undefined)} />}
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && !remove.isPending && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle", { name: deleting?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{t("cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                deleting &&
                remove.mutate(deleting.id, {
                  onSuccess: () => {
                    toast.success(t("deleted", { name: deleting.name }));
                    setDeleting(null);
                  },
                  onError: (e) => toast.error(describeError(e)),
                })
              }
            >
              <Trash2 /> {t("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --------------------------------------------------------------------- staff

function StaffTab() {
  const t = useTranslations("school.roles.staff");
  const name = useLocalizedName();
  const roleName = useRoleName();
  const me = useSchoolMe();
  const staff = useStaff();
  const roles = useRoles();
  const custom = (roles.data?.roles ?? []).filter((r) => r.kind === "CUSTOM");
  const [adding, setAdding] = useState(false);
  const [changing, setChanging] = useState<StaffMember | null>(null);
  const [password, setPassword] = useState<StaffMember | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        <Button onClick={() => setAdding(true)} disabled={custom.length === 0}>
          <Plus /> {t("add")}
        </Button>
      </div>
      {roles.data && custom.length === 0 && <p className="text-sm text-amber-700 dark:text-amber-400">{t("roleFirst")}</p>}

      <ListState isPending={staff.isPending} error={staff.error} onRetry={() => staff.refetch()} empty={staff.data?.length === 0 ? t("empty") : null}>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.login")}</TableHead>
                <TableHead>{t("columns.roles")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.data?.map((m) => {
                const isSuperAdmin = m.roles.some((r) => r.kind === "SUPER_ADMIN");
                return (
                  <TableRow key={m.membershipId} className={cn(m.status !== "ACTIVE" && "text-muted-foreground")}>
                    <TableCell>
                      <div className="font-medium">{m.teacher ? name(m.teacher) : m.user.fullname}</div>
                      {m.status !== "ACTIVE" && <div className="text-xs">{t(`status.${m.status}`)}</div>}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">{m.user.phone ? localPhone(m.user.phone) : m.user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {m.roles.map((r) => (
                          <Badge key={r.id} variant={r.kind === "CUSTOM" ? "default" : "secondary"}>
                            {roleName(r)}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {!isSuperAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onSelect={() => setChanging(m)} disabled={custom.length === 0}>
                              <UserCog /> {t("changeRoles")}
                            </DropdownMenuItem>
                            {me?.isSuperAdmin && (
                              <DropdownMenuItem onSelect={() => setPassword(m)}>
                                <KeyRound /> {t("changePassword")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ListState>

      <AddStaffDialog open={adding} roles={custom} onClose={() => setAdding(false)} />
      <StaffRolesDialog member={changing} roles={custom} onClose={() => setChanging(null)} />
      <SetPasswordDialog
        account={
          password
            ? { userId: password.user.id, name: password.teacher ? name(password.teacher) : password.user.fullname, login: password.user.phone ? localPhone(password.user.phone) : (password.user.email ?? "") }
            : null
        }
        onClose={() => setPassword(null)}
      />
    </div>
  );
}

/* Roles as checkboxes (the school-made ones). */
function RolePicker({ roles, chosen, onChange }: { roles: Role[]; chosen: Set<string>; onChange: (next: Set<string>) => void }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {roles.map((r) => (
        <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm hover:bg-muted/50">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={chosen.has(r.id)}
            onChange={(e) => {
              const next = new Set(chosen);
              if (e.target.checked) next.add(r.id);
              else next.delete(r.id);
              onChange(next);
            }}
          />
          {r.name}
        </label>
      ))}
    </div>
  );
}

function AddStaffDialog({ open, roles, onClose }: { open: boolean; roles: Role[]; onClose: () => void }) {
  const t = useTranslations("school.roles.staff.addDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const add = useAddStaff();
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ name: string; phone: string; password: string } | null>(null);

  const reset = () => {
    setFullname("");
    setPhone("");
    setChosen(new Set());
    setError(null);
  };
  const submit = () => {
    if (fullname.trim().length < 2) return setError(t("nameRequired"));
    if (chosen.size === 0) return setError(t("roleRequired"));
    setError(null);
    add.mutate(
      { fullname: fullname.trim(), phone: toAsciiDigits(phone.trim()), roleIds: [...chosen] },
      {
        onSuccess: (r) => {
          reset();
          onClose();
          if (r.account.password) setCredentials({ name: r.member.user.fullname, phone: localPhone(r.account.loginPhone), password: r.account.password });
          else toast.success(t("linked", { name: r.member.user.fullname }));
        },
        onError: (e) => setError(describeError(e)),
      },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !add.isPending && (reset(), onClose())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
          <FormError message={error} />
          <div className="space-y-1.5">
            <Label htmlFor="staff-name" required>
              {t("name")}
            </Label>
            <Input id="staff-name" value={fullname} maxLength={150} onChange={(e) => setFullname(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-phone" required>
              {t("phone")}
            </Label>
            <Input id="staff-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
            <p className="text-xs text-muted-foreground">{t("phoneHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label required>{t("roles")}</Label>
            <RolePicker roles={roles} chosen={chosen} onChange={setChosen} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => (reset(), onClose())} disabled={add.isPending}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={submit} disabled={add.isPending}>
              {add.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* a new account's password exists only in that response: closes from its own button */}
      <AlertDialog open={!!credentials}>
        <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
          {credentials && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("credentialsTitle", { name: credentials.name })}</AlertDialogTitle>
                <AlertDialogDescription>{t("credentialsDescription")}</AlertDialogDescription>
              </AlertDialogHeader>
              <LoginCredentials
                loginUrl={`${window.location.origin}/login`}
                idLabel={tCommon("mobileNumber")}
                id={credentials.phone}
                password={credentials.password}
              />
              <AlertDialogFooter>
                <Button onClick={() => setCredentials(null)}>{tCommon("close")}</Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StaffRolesDialog({ member, roles, onClose }: { member: StaffMember | null; roles: Role[]; onClose: () => void }) {
  const t = useTranslations("school.roles.staff.rolesDialog");
  return (
    <Dialog open={!!member} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { name: member?.user.fullname ?? "" })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {member && <StaffRolesForm key={member.membershipId} member={member} roles={roles} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function StaffRolesForm({ member, roles, onDone }: { member: StaffMember; roles: Role[]; onDone: () => void }) {
  const t = useTranslations("school.roles.staff.rolesDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const save = useSetStaffRoles();
  const [chosen, setChosen] = useState(() => new Set(member.roles.filter((r) => r.kind === "CUSTOM").map((r) => r.id)));
  const [error, setError] = useState<string | null>(null);
  const keepsSystemRole = member.roles.some((r) => r.kind !== "CUSTOM");

  const submit = () =>
    save.mutate(
      { membershipId: member.membershipId, roleIds: [...chosen] },
      {
        onSuccess: () => {
          toast.success(t(chosen.size === 0 && !keepsSystemRole ? "removed" : "saved", { name: member.user.fullname }));
          onDone();
        },
        onError: (e) => setError(describeError(e)),
      },
    );

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <RolePicker roles={roles} chosen={chosen} onChange={setChosen} />
      {chosen.size === 0 && !keepsSystemRole && <p className="text-sm text-amber-700 dark:text-amber-400">{t("noRoleWarning")}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={save.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={submit} disabled={save.isPending}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}
