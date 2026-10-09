"use client";

import { use } from "react";
import { SchoolForm } from "@/components/platform/schools/SchoolForm";
import { SchoolLoader } from "@/components/platform/schools/SchoolLoader";

export default function EditSchoolPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = use(params);
  // the form is created after the school loads, so its fields start filled in
  return <SchoolLoader schoolId={schoolId}>{(school) => <SchoolForm mode="edit" school={school} />}</SchoolLoader>;
}
