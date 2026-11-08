import express, { type Response } from "express";
import httpStatus from "http-status";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { PackageService } from "./package.service";
import { PackageValidation as V } from "./package.validation";

// Public, for the marketing site's packages section: the packages on offer and their prices.
const publicRouter = express.Router();
publicRouter.get("/", catchAsync(async (_req, res) => ok(res, "Packages retrieved successfully!", await PackageService.listPublicPackages())));
export const publicPackageRoutes = publicRouter;

// The platform admin: the subscription packages (student limit and monthly price).
const router = express.Router();
router.use(authenticate("PLATFORM"));

const ok = <T>(res: Response, message: string, data: T, statusCode: number = httpStatus.OK) => sendResponse(res, { statusCode, success: true, message, data });

router.get("/", catchAsync(async (_req, res) => ok(res, "Packages retrieved successfully!", await PackageService.listPackages())));
router.post(
  "/",
  validateRequest({ body: V.createPackage }),
  catchAsync(async (req, res) => ok(res, "Package added", await PackageService.createPackage(req.body), httpStatus.CREATED)),
);
router.patch(
  "/:packageId",
  validateRequest({ params: V.packageIdParams, body: V.updatePackage }),
  catchAsync(async (req, res) => ok(res, "Package saved", await PackageService.updatePackage(String(req.params.packageId), req.body))),
);
router.delete(
  "/:packageId",
  validateRequest({ params: V.packageIdParams }),
  catchAsync(async (req, res) => ok(res, "Package removed", await PackageService.deletePackage(String(req.params.packageId)))),
);

export const platformPackageRoutes = router;
