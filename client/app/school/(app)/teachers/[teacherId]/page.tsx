"use client";

import { use } from "react";
import { RequirePermission } from "@/components/auth/Can";
import { TeacherDetailView } from "@/components/school/teachers/TeacherDetailView";

export default function TeacherPage({ params }: { params: Promise<{ teacherId: string }> }) {
  const { teacherId } = use(params);
  return (
    <RequirePermission permission="teacher:view">
      <TeacherDetailView teacherId={teacherId} />
    </RequirePermission>
  );
}
