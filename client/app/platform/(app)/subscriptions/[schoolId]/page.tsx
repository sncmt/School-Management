"use client";

import { use } from "react";
import { SchoolSubscriptionView } from "@/components/platform/subscriptions/SchoolSubscriptionView";

export default function SchoolSubscriptionPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = use(params);
  return <SchoolSubscriptionView schoolId={schoolId} />;
}
