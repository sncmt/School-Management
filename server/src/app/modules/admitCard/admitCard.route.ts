import express, { type Request, type Response } from "express";
import httpStatus from "http-status";
import validateRequest from "../../errorHandler/validateRequest";
import authenticate from "../../middlewares/auth";
import authorize from "../../middlewares/authorize";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AdmitCardService } from "./admitCard.service";
import { AdmitCardValidation as V, type CardsQuery } from "./admitCard.validation";

const router = express.Router();

router.use(authenticate("SCHOOL"));

const ok = <T>(res: Response, message: string, data: T) => sendResponse(res, { statusCode: httpStatus.OK, success: true, message, data });
const schoolOf = (req: Request) => req.auth!.schoolId!;

// the rules and signature lines; changing them goes with managing exams
router.get(
  "/settings",
  authorize("exam:view"),
  catchAsync(async (req, res) => ok(res, "Admit card settings retrieved successfully!", await AdmitCardService.getSettings(schoolOf(req)))),
);
router.put(
  "/settings",
  authorize("exam:create"),
  validateRequest({ body: V.saveSettings }),
  catchAsync(async (req, res) => ok(res, "Admit card settings saved", await AdmitCardService.saveSettings(schoolOf(req), req.auth!.userId, req.body))),
);

router.get(
  "/exams/:examId",
  authorize("exam:view"),
  validateRequest({ params: V.examParams, query: V.cardsQuery }),
  catchAsync(async (req, res) =>
    ok(res, "Admit cards retrieved successfully!", await AdmitCardService.getCards(schoolOf(req), req.params.examId as string, req.query as CardsQuery)),
  ),
);

// families see the cards in the app once released
router.post(
  "/exams/:examId/release",
  authorize("exam:create"),
  validateRequest({ params: V.examParams, body: V.release }),
  catchAsync(async (req, res) =>
    ok(res, req.body.released ? "Admit cards released" : "Admit cards hidden", await AdmitCardService.setReleased(schoolOf(req), req.params.examId as string, req.body.released)),
  ),
);

export const admitCardRoutes = router;

// the family login: GET /family/admit-card?studentId=&examId=
export const familyAdmitCardRoute = [
  validateRequest({ query: V.familyQuery }),
  catchAsync(async (req: Request, res: Response) => {
    const { studentId, examId } = req.query as { studentId: string; examId: string };
    ok(res, "Admit card retrieved successfully!", await AdmitCardService.familyCard(req.auth!, studentId, examId));
  }),
];
