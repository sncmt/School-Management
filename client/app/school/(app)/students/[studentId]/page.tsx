"use client";

import { use } from "react";
import { RequirePermission } from "@/components/auth/Can";
import { StudentDetailView } from "@/components/school/students/StudentDetailView";

export default function StudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  return (
    <RequirePermission permission="student:view">
      <StudentDetailView studentId={studentId} />
    </RequirePermission>
  );
}
