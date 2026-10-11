"use client";

import { use } from "react";
import { RequirePermission } from "@/components/auth/Can";
import { StudentLoader } from "@/components/school/students/StudentDetailView";
import { StudentForm } from "@/components/school/students/StudentForm";

export default function EditStudentPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  // the form is created after the student loads, so its fields start filled in
  return (
    <RequirePermission permission="student:update">
      <StudentLoader studentId={studentId}>{(student) => <StudentForm student={student} />}</StudentLoader>
    </RequirePermission>
  );
}
