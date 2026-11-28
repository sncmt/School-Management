/*
 * An exam's name for one class. One exam can go by a different name in some classes ("Annual"
 * in classes 6-9, "Test exam" in class 10): ExamClass.nameEn/nameBn. Both null = the exam's
 * own name. The pair is used together, never mixed field by field with the exam's.
 */

type Names = { nameEn: string | null; nameBn: string | null };

/** The select that brings what classExamName reads, along with an exam class. */
export const examClassNameSelect = {
  nameEn: true,
  nameBn: true,
  isFinal: true,
  exam: { select: { id: true, nameEn: true, nameBn: true } },
} as const;

/** The class's own name for the exam, else the exam's. */
export const classExamName = (ec: Names & { exam: Names }): Names =>
  ec.nameEn || ec.nameBn ? { nameEn: ec.nameEn, nameBn: ec.nameBn } : { nameEn: ec.exam.nameEn, nameBn: ec.exam.nameBn };

/** The `exam` of a class's response: its id, its name in that class, and whether it is the final exam. */
export const classExam = (ec: Names & { isFinal: boolean; exam: Names & { id: string } }) => ({
  id: ec.exam.id,
  ...classExamName(ec),
  isFinal: ec.isFinal,
});
