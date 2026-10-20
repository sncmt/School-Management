import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { SubscriptionService } from "./subscription.service";
import type { SubscriptionListQuery } from "./subscription.validation";

const ok = <T>(res: Response, message: string, data: T, statusCode: number = httpStatus.OK) =>
  sendResponse(res, { statusCode, success: true, message, data });

const listSchools = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Subscriptions retrieved", await SubscriptionService.listSchools(req.query as unknown as SubscriptionListQuery));
});

const getSchool = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Subscription retrieved", await SubscriptionService.getSchoolSubscription(req.params.schoolId as string));
});

const addPayment = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Payment recorded", await SubscriptionService.addPayment(req.params.schoolId as string, req.body, req.auth!.userId), httpStatus.CREATED);
});

const removePayment = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Payment removed", await SubscriptionService.removePayment(req.params.paymentId as string));
});

const setPlan = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Plan changed", await SubscriptionService.setPlan(req.params.schoolId as string, req.body.plan));
});

const mine = catchAsync(async (req: Request, res: Response) => {
  ok(res, "Subscription retrieved", await SubscriptionService.mySubscription(req.auth!.schoolId!));
});

export const SubscriptionController = { listSchools, getSchool, addPayment, removePayment, setPlan, mine };
