import express from "express";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import { superAdminOnly } from "../../middlewares/authorize";
import { RoleController } from "./role.controller";
import { RoleValidation } from "./role.validation";

const router = express.Router();

// roles and staff: the school super admin only
router.use(authenticate("SCHOOL"), superAdminOnly);

router.get("/", RoleController.getRoles);
router.post("/", validateRequest({ body: RoleValidation.createRole }), RoleController.createRole);
router.patch("/:roleId", validateRequest({ params: RoleValidation.roleIdParams, body: RoleValidation.updateRole }), RoleController.updateRole);
router.delete("/:roleId", validateRequest({ params: RoleValidation.roleIdParams }), RoleController.deleteRole);

// the people who work at the school, and their roles
router.get("/staff", RoleController.getStaff);
router.post("/staff", validateRequest({ body: RoleValidation.addStaff }), RoleController.addStaff);
router.put(
  "/staff/:membershipId/roles",
  validateRequest({ params: RoleValidation.membershipIdParams, body: RoleValidation.setStaffRoles }),
  RoleController.setStaffRoles,
);

export const roleRoutes = router;
