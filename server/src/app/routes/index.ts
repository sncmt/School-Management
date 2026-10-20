import express from 'express';
import { schoolRoutes } from '../modules/school/school.route';
import { authRoutes } from '../modules/auth/auth.route';
import { studentRoutes } from '../modules/student/student.route';
import { academicYearRoute } from '../modules/academicYear/academicYear.route';
import { classRoutes } from '../modules/class/class.route';
import { sectionRoutes } from '../modules/section/section.route';
import { scheduleRoutes } from '../modules/schedule/schedule.route';
import { platformSubjectRoutes, subjectRoutes } from '../modules/subject/subject.route';
import { classSubjectRoutes } from '../modules/classSubject/classSubject.route';
import { groupRoutes } from '../modules/group/group.route';
import { teacherRoutes } from '../modules/teacher/teacher.route';
import { subjectTeacherRoutes } from '../modules/subjectTeacher/subjectTeacher.route';
import { calendarRoutes, nationalHolidayRoutes } from '../modules/calendar/calendar.route';
import { attendanceRoutes } from '../modules/attendance/attendance.route';
import { gradingRoutes } from '../modules/grading/grading.route';
import { examRoutes, optionalSubjectRoutes } from '../modules/exam/exam.route';
import { examMarksRoutes } from '../modules/exam/examMarks.route';
import { examResultRoutes } from '../modules/exam/examResult.route';
import { finalResultRoutes } from '../modules/exam/finalResult.route';
import { routineRoutes } from '../modules/routine/routine.route';
import { dashboardRoutes } from '../modules/dashboard/dashboard.route';
import { roleRoutes } from '../modules/role/role.route';
import { promotionRoutes } from '../modules/promotion/promotion.route';
import { financeRoutes } from '../modules/finance/finance.route';
import { fundRoutes } from '../modules/fund/fund.route';
import { feeTypeRoutes } from '../modules/feeType/feeType.route';
import { feeStructureRoutes } from '../modules/feeStructure/feeStructure.route';
import { studentFeeRoutes } from '../modules/studentFee/studentFee.route';
import { paymentRoutes } from '../modules/payment/payment.route';
import { expenseRoutes } from '../modules/expense/expense.route';
import { noticeRoutes } from '../modules/notice/notice.route';
import { familyRoutes } from '../modules/family/family.route';
import { homeworkRoutes } from '../modules/homework/homework.route';
import { roomRoutes } from '../modules/room/room.route';
import { seatPlanRoutes } from '../modules/seatPlan/seatPlan.route';
import { admitCardRoutes } from '../modules/admitCard/admitCard.route';
import { idCardRoutes } from '../modules/idCard/idCard.route';
import { notificationRoutes } from '../modules/notification/notification.route';
import { smsRoutes } from '../modules/sms/sms.route';
import { platformSubscriptionRoutes, schoolSubscriptionRoutes } from '../modules/subscription/subscription.route';


const router = express.Router();

const moduleRoutes = [
    
    {
        path: '/school',
        route: schoolRoutes
    },
    {
        path: '/auth',
        route: authRoutes
    },
    {
        path: '/student',
        route: studentRoutes
    },
    {
        path: '/academic-year',
        route: academicYearRoute
    },
    {
        path: '/class',
        route: classRoutes
    },
    {
        path: '/section',
        route: sectionRoutes
    },
    {
        path: '/schedule',
        route: scheduleRoutes
    },
    {
        path: '/subject',
        route: subjectRoutes
    },
    {
        // the shared NCTB subject list, platform admin only
        path: '/platform/subject',
        route: platformSubjectRoutes
    },
    {
        path: '/class-subject',
        route: classSubjectRoutes
    },
    {
        path: '/group',
        route: groupRoutes
    },
    {
        path: '/teacher',
        route: teacherRoutes
    },
    {
        path: '/subject-teacher',
        route: subjectTeacherRoutes
    },
    {
        path: '/calendar',
        route: calendarRoutes
    },
    {
        // national holidays for every school, platform admin only
        path: '/platform/national-holiday',
        route: nationalHolidayRoutes
    },
    {
        path: '/attendance',
        route: attendanceRoutes
    },
    {
        path: '/grading',
        route: gradingRoutes
    },
    {
        path: '/exam',
        route: examRoutes
    },
    {
        // students' optional (4th) subject
        path: '/optional-subject',
        route: optionalSubjectRoutes
    },
    {
        path: '/exam-marks',
        route: examMarksRoutes
    },
    {
        path: '/exam-results',
        route: examResultRoutes
    },
    {
        // results made from several exams (term / annual), each school's own formula
        path: '/final-results',
        route: finalResultRoutes
    },
    {
        // class routine: period templates, weekly routine, substitutes
        path: '/routine',
        route: routineRoutes
    },
    {
        // the school dashboard: a summary of what the person may see
        path: '/dashboard',
        route: dashboardRoutes
    },
    {
        // the school's roles and staff (super admin only)
        path: '/role',
        route: roleRoutes
    },
    {
        // end of year: students move up a class, repeat, graduate or leave
        path: '/promotion',
        route: promotionRoutes
    },
    {
        // the school's finance rules
        path: '/finance',
        route: financeRoutes
    },
    {
        // funds: balances, deposits, transfers, the ledger
        path: '/fund',
        route: fundRoutes
    },
    {
        path: '/fee-type',
        route: feeTypeRoutes
    },
    {
        // what each class pays in a year
        path: '/fee-structure',
        route: feeStructureRoutes
    },
    {
        // each student's fees, custom fees and discounts
        path: '/student-fee',
        route: studentFeeRoutes
    },
    {
        // fee collection, receipts, cancelling
        path: '/payment',
        route: paymentRoutes
    },
    {
        path: '/expense',
        route: expenseRoutes
    },
    {
        // school notices: the board, writing and publishing, the public notice page
        path: '/notice',
        route: noticeRoutes
    },
    {
        // the family login's home: its children, their attendance and fees owed
        path: '/family',
        route: familyRoutes
    },
    {
        // each member's in-app messages (admitted, fee paid, absent today...)
        path: '/notification',
        route: notificationRoutes
    },
    {
        // SMS to guardians: settings, templates per activity, the log, sending by hand
        path: '/sms',
        route: smsRoutes
    },
    {
        // schools' subscription payments, recorded by hand by the platform admin
        path: '/platform/subscription',
        route: platformSubscriptionRoutes
    },
    {
        // a school's own subscription, for its super admin to read
        path: '/subscription',
        route: schoolSubscriptionRoutes
    },
    {
        // homework: given by subject teachers, ticked in class, seen by families
        path: '/homework',
        route: homeworkRoutes
    },
    {
        // the school's rooms (for exam seat plans)
        path: '/room',
        route: roomRoutes
    },
    {
        // each exam's seat plan
        path: '/seat-plan',
        route: seatPlanRoutes
    },
    {
        // exam admit cards: settings, printing, releasing to families
        path: '/admit-card',
        route: admitCardRoutes
    },
    {
        // student ID cards: the school's design and printing
        path: '/id-card',
        route: idCardRoutes
    }
];

moduleRoutes.forEach(route => router.use(route.path, route.route))

export default router;