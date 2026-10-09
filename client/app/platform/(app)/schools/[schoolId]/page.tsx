"use client";

import { use } from "react";
import { SchoolDetailView } from "@/components/platform/schools/SchoolDetailView";
import { SchoolLoader } from "@/components/platform/schools/SchoolLoader";

export default function SchoolPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = use(params);
  return <SchoolLoader schoolId={schoolId}>{(school) => <SchoolDetailView school={school} />}</SchoolLoader>;
}
