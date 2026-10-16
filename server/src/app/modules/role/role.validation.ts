import { z } from "zod";
import { idSchema } from "../../shared/financeSchemas";
import { bdPhoneSchema } from "../../utils/identity";

const permissionCodes = z
  .array(z.string().trim().min(1).max(60))
  .max(300)
  .refine((codes) => new Set(codes).size === codes.length, "A permission is listed twice");

const roleFields = {
  name: z.string({ error: "Role name is required!" }).trim().min(2, "Role name is required!").max(50),
  description: z.string().trim().max(200).optional(),
  permissions: permissionCodes,
};

const createRole = z.strictObject(roleFields);

// the Teacher role: permissions only
const updateRole = z
  .strictObject({
    name: roleFields.name.optional(),
    description: z.string().trim().max(200).nullable().optional(),
    permissions: permissionCodes.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

const roleIdParams = z.object({ roleId: idSchema("Role id") });
const membershipIdParams = z.object({ membershipId: idSchema("Member id") });

const roleIds = z
  .array(idSchema("Role"))
  .max(20)
  .refine((ids) => new Set(ids).size === ids.length, "A role is listed twice");

// a staff member who isn't a teacher: an accountant, the office clerk…
const addStaff = z.strictObject({
  fullname: z.string({ error: "Name is required!" }).trim().min(2, "Name is required!").max(150),
  phone: bdPhoneSchema,
  roleIds: roleIds.min(1, "Give at least one role"),
});

// the member's school roles (the system ones - super admin, teacher, guardian - are kept as they are)
const setStaffRoles = z.strictObject({ roleIds });

export const RoleValidation = { createRole, updateRole, roleIdParams, membershipIdParams, addStaff, setStaffRoles };

export type CreateRolePayload = z.infer<typeof createRole>;
export type UpdateRolePayload = z.infer<typeof updateRole>;
export type AddStaffPayload = z.infer<typeof addStaff>;
