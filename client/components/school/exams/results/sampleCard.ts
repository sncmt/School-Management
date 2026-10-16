import type { CardSettings, ResultCard, ResultCards } from "@/lib/school/results";

/*
 * A made-up student's result, for previewing a card design before any result is published.
 * Uses the school's own name and logo so the preview looks like the real thing.
 */

type School = { nameEn: string; nameBn: string | null; logo: string | null; language: "EN" | "BN" };

const line = (
  subjectId: string,
  nameEn: string,
  nameBn: string,
  full: number,
  marks: number,
  grade: string,
  point: number,
  extra: Partial<ResultCard["subjects"][number]> = {},
): ResultCard["subjects"][number] => ({
  subjectId,
  nameEn,
  nameBn,
  code: String(100 + subjectId.length * 7),
  isOptional: false,
  isAbsent: false,
  excluded: false,
  fullMarks: String(full),
  passMarks: String(Math.round(full * 0.33)),
  marks: String(marks),
  percentage: String((marks / full) * 100),
  passed: true,
  grade,
  point: String(point),
  parts: null,
  papers: null,
  sortOrder: 0,
  highestInSection: Math.min(full, marks + 6),
  highestInClass: Math.min(full, marks + 9),
  ...extra,
});

// a final result's two components, and a subject's share from each (a little either side of its final %)
const COMPONENTS = [
  { id: "half", nameEn: "Half-yearly", nameBn: "অর্ধবার্ষিক", weight: "40" },
  { id: "annual", nameEn: "Annual", nameBn: "বার্ষিক", weight: "60" },
];
const withComponents = (subject: ResultCard["subjects"][number]): ResultCard["subjects"][number] => {
  const pct = Number(subject.percentage);
  return {
    ...subject,
    parts: null,
    papers: null,
    components: COMPONENTS.map((c, i) => ({
      componentId: c.id,
      nameEn: c.nameEn,
      nameBn: c.nameBn,
      weight: Number(c.weight),
      percentage: Math.round(Math.min(100, i === 0 ? pct - 3 : pct + 2) * 100) / 100,
      exams: [],
    })),
  };
};

/* The sample: an exam's card, or with `final` a final result's (with the component columns). */
export const sampleCards = (
  settings: CardSettings,
  school: School | undefined,
  final = false,
): Omit<ResultCards, "cards"> & { cards: ResultCard[] } => {
  const data = sampleExamCards(settings, school);
  if (!final) return data;
  return {
    ...data,
    exam: { id: "sample", nameEn: "Annual Result", nameBn: "বার্ষিক ফলাফল" },
    components: COMPONENTS,
    cards: data.cards.map((c) => ({ ...c, subjects: c.subjects.map(withComponents) })),
  };
};

const sampleExamCards = (settings: CardSettings, school: School | undefined): Omit<ResultCards, "cards"> & { cards: ResultCard[] } => ({
  settings,
  school: school
    ? { nameEn: school.nameEn, nameBn: school.nameBn ?? school.nameEn, logo: school.logo, address: "Dhaka, Bangladesh", phone: null, email: "", website: null, language: school.language }
    : null,
  exam: { id: "sample", nameEn: "Half-yearly Examination", nameBn: "অর্ধবার্ষিক পরীক্ষা" },
  academicYear: { id: "sample", name: String(new Date().getFullYear()) },
  class: { id: "sample", name: "Six" },
  publishedAt: new Date().toISOString(),
  attendancePeriod: null,
  gradingReference: {
    resultSystem: "GRADED",
    classScale: {
      id: "sample",
      name: "GPA 5",
      maxGpa: 5,
      failGrade: "F",
      markBands: [
        { minPercent: 80, grade: "A+", point: 5 },
        { minPercent: 70, grade: "A", point: 4 },
        { minPercent: 60, grade: "A-", point: 3.5 },
        { minPercent: 50, grade: "B", point: 3 },
        { minPercent: 40, grade: "C", point: 2 },
        { minPercent: 33, grade: "D", point: 1 },
        { minPercent: 0, grade: "F", point: 0 },
      ],
      gpaBands: [],
    },
    subjectScales: [],
  },
  cards: [
    {
      enrollmentId: "sample",
      student: {
        id: "sample",
        nameEn: "Ayesha Rahman",
        nameBn: "আয়েশা রহমান",
        admissionNo: "20260012",
        photo: null,
        fatherName: "Abdur Rahman",
        motherName: "Fatema Begum",
      },
      rollNumber: "7",
      section: { id: "sample", name: "A", isDefault: false },
      group: null,
      totalMarks: "512",
      fullMarks: "600",
      percentage: "85.33",
      gpa: "4.75",
      grade: "A+",
      passed: true,
      failedSubjects: 0,
      position: { section: 3, sectionOutOf: 42, class: 5, classOutOf: 84 },
      attendance: { workingDays: 112, present: 104, absent: 6, leave: 2, percentage: 92.86 },
      remark: school?.language === "EN" ? "Hard-working and attentive. Keep it up!" : "পরিশ্রমী ও মনোযোগী। এভাবেই চালিয়ে যাও!",
      subjects: [
        line("bangla", "Bangla", "বাংলা", 200, 168, "A+", 5, {
          papers: [
            { subjectId: "b1", nameEn: "Bangla 1st Paper", nameBn: "বাংলা ১ম পত্র", fullMarks: 100, marks: 86, isAbsent: false },
            { subjectId: "b2", nameEn: "Bangla 2nd Paper", nameBn: "বাংলা ২য় পত্র", fullMarks: 100, marks: 82, isAbsent: false },
          ],
        }),
        line("english", "English", "ইংরেজি", 100, 78, "A", 4),
        line("math", "Mathematics", "গণিত", 100, 92, "A+", 5),
        line("science", "Science", "বিজ্ঞান", 100, 84, "A+", 5, {
          parts: [
            { name: "CQ", fullMarks: 70, passMarks: 23, marks: 58, passed: true },
            { name: "MCQ", fullMarks: 30, passMarks: 10, marks: 26, passed: true },
          ],
        }),
        line("religion", "Islam & Moral Education", "ইসলাম ও নৈতিক শিক্ষা", 100, 90, "A+", 5),
      ],
    },
  ],
});
