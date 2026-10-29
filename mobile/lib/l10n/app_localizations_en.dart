// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'SNCMT';

  @override
  String get chooseLanguage => 'Choose your language';

  @override
  String get appTagline => 'Your school, in your pocket';

  @override
  String get goodMorning => 'Good morning';

  @override
  String get goodAfternoon => 'Good afternoon';

  @override
  String get goodEvening => 'Good evening';

  @override
  String get continueLabel => 'Continue';

  @override
  String get cancel => 'Cancel';

  @override
  String get save => 'Save';

  @override
  String get retry => 'Try again';

  @override
  String get required => 'Required';

  @override
  String get networkError =>
      'Can\'t reach the server. Check your internet connection.';

  @override
  String get somethingWentWrong => 'Something went wrong. Please try again.';

  @override
  String get schoolCodeTitle => 'Find your school';

  @override
  String get schoolCodeHelp => 'Enter the school code your school gave you.';

  @override
  String get schoolCodeLabel => 'School code';

  @override
  String get schoolCodeExample => 'For abc.sncmt.com the code is abc';

  @override
  String get schoolNotFound =>
      'No active school has this code. Check it and try again.';

  @override
  String get isThisYourSchool => 'Is this your school?';

  @override
  String get yesContinue => 'Yes, continue';

  @override
  String get noChangeCode => 'No, change the code';

  @override
  String get loginTitle => 'Log in';

  @override
  String get mobileNumber => 'Mobile number';

  @override
  String get password => 'Password';

  @override
  String get loginButton => 'Log in';

  @override
  String get changeSchool => 'Change school';

  @override
  String get guardian => 'Guardian';

  @override
  String get teacher => 'Teacher';

  @override
  String welcome(String name) {
    return 'Welcome, $name';
  }

  @override
  String get myChildren => 'My children';

  @override
  String get noChildren => 'No students are linked to this account.';

  @override
  String classAndRoll(String className, String roll) {
    return 'Class $className · Roll $roll';
  }

  @override
  String get teacherComingSoon => 'Teacher features are coming soon.';

  @override
  String get noRoleTitle => 'This account is for the website';

  @override
  String noRoleBody(String site) {
    return 'Please use $site in a browser.';
  }

  @override
  String get today => 'Today';

  @override
  String get notMarkedYet => 'Not marked yet';

  @override
  String get present => 'Present';

  @override
  String get late => 'Late';

  @override
  String get absent => 'Absent';

  @override
  String get leave => 'Leave';

  @override
  String get attendance => 'Attendance';

  @override
  String get thisMonth => 'This month';

  @override
  String daysCount(String count) {
    return '$count days';
  }

  @override
  String get seeAll => 'See all';

  @override
  String checkedInAt(String time) {
    return 'Checked in at $time';
  }

  @override
  String attendanceRate(String percent) {
    return '$percent% attendance';
  }

  @override
  String get holiday => 'Holiday';

  @override
  String get weeklyHoliday => 'Weekly holiday';

  @override
  String get noRollCall => 'No roll call this day';

  @override
  String get feesDue => 'Fees due';

  @override
  String get noDues => 'No fees due';

  @override
  String get homeworkDueSoon => 'Homework due soon';

  @override
  String get noHomework => 'No homework due';

  @override
  String dueOn(String date) {
    return 'Due $date';
  }

  @override
  String get admitCards => 'Admit cards';

  @override
  String get upcomingHolidays => 'Coming holidays';

  @override
  String get homework => 'Homework';

  @override
  String get noHomeworkYet => 'No homework yet';

  @override
  String assignedOn(String date) {
    return 'Given $date';
  }

  @override
  String fullMarks(String marks) {
    return 'Full marks $marks';
  }

  @override
  String get teacherCheck => 'Teacher\'s check';

  @override
  String get notCheckedYet => 'Not checked yet';

  @override
  String get checkDone => 'Done';

  @override
  String get checkLate => 'Done late';

  @override
  String get checkNotDone => 'Not done';

  @override
  String get checkExcused => 'Excused';

  @override
  String get attachments => 'Attachments';

  @override
  String get couldNotOpen => 'Couldn\'t open this file';

  @override
  String get results => 'Exam results';

  @override
  String get noResults => 'No results published yet';

  @override
  String publishedOn(String date) {
    return 'Published $date';
  }

  @override
  String gpaValue(String gpa) {
    return 'GPA $gpa';
  }

  @override
  String get passed => 'Passed';

  @override
  String get failed => 'Failed';

  @override
  String failedSubjects(String count) {
    return 'Failed in $count subject(s)';
  }

  @override
  String get totalMarks => 'Total marks';

  @override
  String get sectionPosition => 'Section position';

  @override
  String get classPosition => 'Class position';

  @override
  String positionOf(String position, String total) {
    return '$position of $total';
  }

  @override
  String get examAttendance => 'Attendance';

  @override
  String daysPresent(String present, String days) {
    return '$present of $days days';
  }

  @override
  String get subjectResults => 'Subjects';

  @override
  String get optionalSubject => '4th subject';

  @override
  String get notCounted => 'Not counted';

  @override
  String get classRoutine => 'Class routine';

  @override
  String get noRoutine => 'No class routine for this year yet';

  @override
  String get breakTime => 'Break';

  @override
  String get noClass => 'No class';

  @override
  String get holidaysThisMonth => 'Holidays this month';

  @override
  String get admitCard => 'Admit card';

  @override
  String get studentName => 'Student';

  @override
  String get className => 'Class';

  @override
  String get groupName => 'Group';

  @override
  String get roll => 'Roll';

  @override
  String get examDates => 'Exam dates';

  @override
  String get seat => 'Seat';

  @override
  String roomSeat(String room, String seat) {
    return 'Room $room · Seat $seat';
  }

  @override
  String get examRules => 'Exam rules';

  @override
  String get payOnline => 'Pay online';

  @override
  String get payFees => 'Pay fees';

  @override
  String get chooseFees => 'Choose what to pay now';

  @override
  String get feesLabel => 'Fees';

  @override
  String onlineCharge(String percent) {
    return 'Online charge ($percent%)';
  }

  @override
  String payAmount(String amount) {
    return 'Pay $amount';
  }

  @override
  String get minimumOnline => 'Online payments must be ৳10 or more';

  @override
  String get nothingToPayOnline => 'No fees can be paid online right now';

  @override
  String get securedBySslcommerz =>
      'Secure payment by SSLCommerz: bKash, Nagad, cards and banks';

  @override
  String get leavePayment => 'Leave the payment page?';

  @override
  String get leavePaymentBody =>
      'If you have already paid, it is still recorded.';

  @override
  String get stay => 'Stay';

  @override
  String get checkingPayment => 'Checking your payment…';

  @override
  String get paymentSuccess => 'Payment successful';

  @override
  String get paymentFailed => 'Payment failed';

  @override
  String get paymentNotCompleted => 'Payment not completed';

  @override
  String get paymentPending => 'Still confirming this payment';

  @override
  String get paymentPendingBody =>
      'It appears in the payment history as soon as SSLCommerz confirms it.';

  @override
  String paidButRefund(String amount) {
    return 'These fees had already been paid. The school will refund $amount.';
  }

  @override
  String get viewReceipt => 'View receipt';

  @override
  String get checkAgain => 'Check again';

  @override
  String get done => 'Done';

  @override
  String get paymentHistory => 'Payment history';

  @override
  String get noPayments => 'No payments yet';

  @override
  String get moneyReceipt => 'Money receipt';

  @override
  String receiptNo(String no) {
    return 'Receipt $no';
  }

  @override
  String get receiptNoLabel => 'Receipt no.';

  @override
  String get paidOn => 'Paid on';

  @override
  String get academicYear => 'Academic year';

  @override
  String get paymentMethod => 'Paid by';

  @override
  String get methodCash => 'Cash';

  @override
  String get methodMobileBanking => 'Mobile banking';

  @override
  String get methodOnline => 'Online';

  @override
  String get transactionId => 'Transaction ID';

  @override
  String get receivedBy => 'Received by';

  @override
  String get total => 'Total';

  @override
  String get cancelled => 'Cancelled';

  @override
  String get weeklyRoutine => 'Weekly routine';

  @override
  String get takeAttendance => 'Attendance';

  @override
  String get noClassesToday => 'No classes today';

  @override
  String get todaysClasses => 'Today\'s classes';

  @override
  String classesToday(String count) {
    return '$count classes today';
  }

  @override
  String get substituteClass => 'Substitute';

  @override
  String coveredBy(String name) {
    return 'Taken by $name';
  }

  @override
  String get notHeld => 'Not held';

  @override
  String get attendanceSaved => 'Attendance saved';

  @override
  String get attendanceAlreadyTaken =>
      'Already taken today: your changes update it';

  @override
  String get presentShort => 'P';

  @override
  String get lateShort => 'L';

  @override
  String get absentShort => 'A';

  @override
  String get leaveShort => 'Lv';

  @override
  String get giveHomework => 'Give homework';

  @override
  String get noSubjectsToTeach =>
      'You have no subjects to give homework for this year';

  @override
  String get subjectLabel => 'Subject';

  @override
  String get sectionsLabel => 'Sections';

  @override
  String get chooseSection => 'Choose at least one section';

  @override
  String get titleLabel => 'Title';

  @override
  String get instructionsOptional => 'What to do (optional)';

  @override
  String get dueDateLabel => 'Due date';

  @override
  String get fullMarksOptional => 'Full marks (optional)';

  @override
  String get invalidNumber => 'Enter a number from 1 to 1000';

  @override
  String get photo => 'Photo';

  @override
  String get addPhoto => 'Add photo';

  @override
  String get camera => 'Camera';

  @override
  String get gallery => 'Gallery';

  @override
  String get homeworkGiven => 'Homework given';

  @override
  String studentsCount(String count) {
    return 'Students ($count)';
  }

  @override
  String get markAllDone => 'Rest done';

  @override
  String get marksShort => 'Marks';

  @override
  String marksUpTo(String full) {
    return 'Marks can be at most $full';
  }

  @override
  String get checksSaved => 'Saved';

  @override
  String get deleteHomework => 'Delete homework';

  @override
  String get deleteHomeworkConfirm => 'Delete this homework and its ticks?';

  @override
  String get delete => 'Delete';

  @override
  String get examMarks => 'Exam marks';

  @override
  String get noMarkSheets =>
      'No marks to enter now. Sheets appear when the school opens marks entry for your classes.';

  @override
  String opensOn(String date) {
    return 'Opens $date';
  }

  @override
  String fullAndPass(String full, String pass) {
    return 'Full marks $full · Pass $pass';
  }

  @override
  String enteredCount(String entered, String total) {
    return 'Entered for $entered of $total';
  }

  @override
  String fillAllParts(String name) {
    return '$name: enter every part, or leave them all empty';
  }

  @override
  String marksOutOfRange(String name, String full) {
    return '$name: marks must be from 0 to $full';
  }

  @override
  String get marksSaved => 'Marks saved';

  @override
  String get notices => 'Notices';

  @override
  String get noNotices => 'No notices';

  @override
  String get categoryGeneral => 'General';

  @override
  String get categoryExam => 'Exam';

  @override
  String get categoryHoliday => 'Holiday';

  @override
  String get categoryFees => 'Fees';

  @override
  String get categoryEvent => 'Event';

  @override
  String get categoryUrgent => 'Urgent';

  @override
  String get settings => 'Settings';

  @override
  String get language => 'Language';

  @override
  String get changePassword => 'Change password';

  @override
  String get currentPassword => 'Current password';

  @override
  String get newPassword => 'New password';

  @override
  String get confirmPassword => 'Confirm new password';

  @override
  String get passwordTooShort => 'At least 8 characters';

  @override
  String get passwordsDontMatch => 'Passwords don\'t match';

  @override
  String get passwordChanged => 'Password changed';

  @override
  String get logout => 'Log out';

  @override
  String get logoutConfirm => 'Log out of this phone?';
}
