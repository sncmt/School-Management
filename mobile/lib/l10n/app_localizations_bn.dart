// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Bengali Bangla (`bn`).
class AppLocalizationsBn extends AppLocalizations {
  AppLocalizationsBn([String locale = 'bn']) : super(locale);

  @override
  String get appTitle => 'SNCMT';

  @override
  String get chooseLanguage => 'আপনার ভাষা বেছে নিন';

  @override
  String get appTagline => 'আপনার স্কুল, হাতের মুঠোয়';

  @override
  String get goodMorning => 'শুভ সকাল';

  @override
  String get goodAfternoon => 'শুভ অপরাহ্ন';

  @override
  String get goodEvening => 'শুভ সন্ধ্যা';

  @override
  String get continueLabel => 'এগিয়ে যান';

  @override
  String get cancel => 'বাতিল';

  @override
  String get save => 'সংরক্ষণ করুন';

  @override
  String get retry => 'আবার চেষ্টা করুন';

  @override
  String get required => 'আবশ্যক';

  @override
  String get networkError =>
      'সার্ভারে পৌঁছানো যাচ্ছে না। ইন্টারনেট সংযোগ দেখুন।';

  @override
  String get somethingWentWrong => 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।';

  @override
  String get schoolCodeTitle => 'আপনার স্কুল খুঁজুন';

  @override
  String get schoolCodeHelp => 'আপনার স্কুলের দেওয়া স্কুল কোডটি লিখুন।';

  @override
  String get schoolCodeLabel => 'স্কুল কোড';

  @override
  String get schoolCodeExample => 'abc.sncmt.com হলে কোড হবে abc';

  @override
  String get schoolNotFound =>
      'এই কোডে কোনো সক্রিয় স্কুল নেই। কোডটি দেখে আবার চেষ্টা করুন।';

  @override
  String get isThisYourSchool => 'এটি কি আপনার স্কুল?';

  @override
  String get yesContinue => 'হ্যাঁ, এগিয়ে যান';

  @override
  String get noChangeCode => 'না, কোড বদলান';

  @override
  String get loginTitle => 'লগইন';

  @override
  String get mobileNumber => 'মোবাইল নম্বর';

  @override
  String get password => 'পাসওয়ার্ড';

  @override
  String get loginButton => 'লগইন করুন';

  @override
  String get changeSchool => 'স্কুল পরিবর্তন করুন';

  @override
  String get guardian => 'অভিভাবক';

  @override
  String get teacher => 'শিক্ষক';

  @override
  String welcome(String name) {
    return 'স্বাগতম, $name';
  }

  @override
  String get myChildren => 'আমার সন্তান';

  @override
  String get noChildren => 'এই অ্যাকাউন্টে কোনো শিক্ষার্থী যুক্ত নেই।';

  @override
  String classAndRoll(String className, String roll) {
    return 'শ্রেণি $className · রোল $roll';
  }

  @override
  String get teacherComingSoon => 'শিক্ষকের ফিচারগুলো শীঘ্রই আসছে।';

  @override
  String get noRoleTitle => 'এই অ্যাকাউন্টটি ওয়েবসাইটের জন্য';

  @override
  String noRoleBody(String site) {
    return 'অনুগ্রহ করে ব্রাউজারে $site ব্যবহার করুন।';
  }

  @override
  String get today => 'আজ';

  @override
  String get notMarkedYet => 'এখনো হাজিরা নেওয়া হয়নি';

  @override
  String get present => 'উপস্থিত';

  @override
  String get late => 'দেরিতে';

  @override
  String get absent => 'অনুপস্থিত';

  @override
  String get leave => 'ছেড়ে যান';

  @override
  String get attendance => 'উপস্থিতি';

  @override
  String get thisMonth => 'এই মাস';

  @override
  String daysCount(String count) {
    return '$count দিন';
  }

  @override
  String get seeAll => 'সব দেখুন';

  @override
  String checkedInAt(String time) {
    return '$time-এ প্রবেশ';
  }

  @override
  String attendanceRate(String percent) {
    return 'উপস্থিতি $percent%';
  }

  @override
  String get holiday => 'ছুটির দিন';

  @override
  String get weeklyHoliday => 'সাপ্তাহিক ছুটি';

  @override
  String get noRollCall => 'এই দিন হাজিরা নেওয়া হয়নি';

  @override
  String get feesDue => 'বকেয়া ফি';

  @override
  String get noDues => 'কোনো বকেয়া নেই';

  @override
  String get homeworkDueSoon => 'শীঘ্রই জমা দেওয়ার বাড়ির কাজ';

  @override
  String get noHomework => 'জমা দেওয়ার কোনো বাড়ির কাজ নেই';

  @override
  String dueOn(String date) {
    return 'জমা $date';
  }

  @override
  String get admitCards => 'প্রবেশপত্র';

  @override
  String get upcomingHolidays => 'আসন্ন ছুটি';

  @override
  String get homework => 'বাড়ির কাজ';

  @override
  String get noHomeworkYet => 'এখনো কোনো বাড়ির কাজ নেই';

  @override
  String assignedOn(String date) {
    return 'দেওয়া হয়েছে $date';
  }

  @override
  String fullMarks(String marks) {
    return 'পূর্ণমান $marks';
  }

  @override
  String get teacherCheck => 'শিক্ষকের মূল্যায়ন';

  @override
  String get notCheckedYet => 'এখনো দেখা হয়নি';

  @override
  String get checkDone => 'সম্পন্ন';

  @override
  String get checkLate => 'দেরিতে সম্পন্ন';

  @override
  String get checkNotDone => 'করা হয়নি';

  @override
  String get checkExcused => 'অব্যাহতি';

  @override
  String get attachments => 'সংযুক্তি';

  @override
  String get couldNotOpen => 'ফাইলটি খোলা যায়নি';

  @override
  String get results => 'পরীক্ষার ফলাফল';

  @override
  String get noResults => 'এখনো কোনো ফলাফল প্রকাশিত হয়নি';

  @override
  String publishedOn(String date) {
    return 'প্রকাশিত $date';
  }

  @override
  String gpaValue(String gpa) {
    return 'জিপিএ $gpa';
  }

  @override
  String get passed => 'উত্তীর্ণ';

  @override
  String get failed => 'অনুত্তীর্ণ';

  @override
  String failedSubjects(String count) {
    return '$countটি বিষয়ে অনুত্তীর্ণ';
  }

  @override
  String get totalMarks => 'মোট নম্বর';

  @override
  String get sectionPosition => 'শাখায় অবস্থান';

  @override
  String get classPosition => 'শ্রেণিতে অবস্থান';

  @override
  String positionOf(String position, String total) {
    return '$total জনের মধ্যে $position';
  }

  @override
  String get examAttendance => 'উপস্থিতি';

  @override
  String daysPresent(String present, String days) {
    return '$days দিনের মধ্যে $present দিন';
  }

  @override
  String get subjectResults => 'বিষয়ভিত্তিক ফলাফল';

  @override
  String get optionalSubject => '৪র্থ বিষয়';

  @override
  String get notCounted => 'গণনা হয়নি';

  @override
  String get classRoutine => 'ক্লাস রুটিন';

  @override
  String get noRoutine => 'এ বছরের ক্লাস রুটিন এখনো দেওয়া হয়নি';

  @override
  String get breakTime => 'বিরতি';

  @override
  String get noClass => 'ক্লাস নেই';

  @override
  String get holidaysThisMonth => 'এই মাসের ছুটি';

  @override
  String get admitCard => 'প্রবেশপত্র';

  @override
  String get studentName => 'শিক্ষার্থী';

  @override
  String get className => 'শ্রেণি';

  @override
  String get groupName => 'বিভাগ';

  @override
  String get roll => 'রোল';

  @override
  String get examDates => 'পরীক্ষার তারিখ';

  @override
  String get seat => 'আসন';

  @override
  String roomSeat(String room, String seat) {
    return 'কক্ষ $room · আসন $seat';
  }

  @override
  String get examRules => 'পরীক্ষার নিয়মাবলি';

  @override
  String get payOnline => 'অনলাইনে পরিশোধ করুন';

  @override
  String get payFees => 'ফি পরিশোধ';

  @override
  String get chooseFees => 'এখন কোনগুলো পরিশোধ করবেন বেছে নিন';

  @override
  String get feesLabel => 'ফি';

  @override
  String onlineCharge(String percent) {
    return 'অনলাইন চার্জ ($percent%)';
  }

  @override
  String payAmount(String amount) {
    return '$amount পরিশোধ করুন';
  }

  @override
  String get minimumOnline => 'অনলাইনে কমপক্ষে ৳১০ পরিশোধ করতে হবে';

  @override
  String get nothingToPayOnline => 'এখন অনলাইনে পরিশোধযোগ্য কোনো ফি নেই';

  @override
  String get securedBySslcommerz =>
      'SSLCommerz-এর মাধ্যমে নিরাপদ পরিশোধ: বিকাশ, নগদ, কার্ড ও ব্যাংক';

  @override
  String get leavePayment => 'পরিশোধের পাতা ছেড়ে যাবেন?';

  @override
  String get leavePaymentBody => 'আপনি আগেই পরিশোধ করে থাকলে তা ঠিকই জমা হবে।';

  @override
  String get stay => 'থাকুন';

  @override
  String get checkingPayment => 'আপনার পরিশোধ যাচাই হচ্ছে…';

  @override
  String get paymentSuccess => 'পরিশোধ সফল হয়েছে';

  @override
  String get paymentFailed => 'পরিশোধ ব্যর্থ হয়েছে';

  @override
  String get paymentNotCompleted => 'পরিশোধ সম্পন্ন হয়নি';

  @override
  String get paymentPending => 'পরিশোধটি এখনো যাচাই হচ্ছে';

  @override
  String get paymentPendingBody =>
      'SSLCommerz নিশ্চিত করলেই এটি পরিশোধের ইতিহাসে দেখা যাবে।';

  @override
  String paidButRefund(String amount) {
    return 'এই ফি আগেই পরিশোধ করা হয়েছিল। স্কুল $amount ফেরত দেবে।';
  }

  @override
  String get viewReceipt => 'রসিদ দেখুন';

  @override
  String get checkAgain => 'আবার দেখুন';

  @override
  String get done => 'ঠিক আছে';

  @override
  String get paymentHistory => 'পরিশোধের ইতিহাস';

  @override
  String get noPayments => 'এখনো কোনো পরিশোধ নেই';

  @override
  String get moneyReceipt => 'মানি রসিদ';

  @override
  String receiptNo(String no) {
    return 'রসিদ নং $no';
  }

  @override
  String get receiptNoLabel => 'রসিদ নং';

  @override
  String get paidOn => 'পরিশোধের তারিখ';

  @override
  String get academicYear => 'শিক্ষাবর্ষ';

  @override
  String get paymentMethod => 'পরিশোধের মাধ্যম';

  @override
  String get methodCash => 'নগদ';

  @override
  String get methodMobileBanking => 'মোবাইল ব্যাংকিং';

  @override
  String get methodOnline => 'অনলাইন';

  @override
  String get transactionId => 'লেনদেন নং';

  @override
  String get receivedBy => 'গ্রহণকারী';

  @override
  String get total => 'মোট';

  @override
  String get cancelled => 'বাতিল';

  @override
  String get weeklyRoutine => 'সাপ্তাহিক রুটিন';

  @override
  String get takeAttendance => 'হাজিরা';

  @override
  String get noClassesToday => 'আজ কোনো ক্লাস নেই';

  @override
  String get todaysClasses => 'আজকের ক্লাস';

  @override
  String classesToday(String count) {
    return 'আজ $countটি ক্লাস';
  }

  @override
  String get substituteClass => 'বদলি ক্লাস';

  @override
  String coveredBy(String name) {
    return 'নিচ্ছেন $name';
  }

  @override
  String get notHeld => 'হচ্ছে না';

  @override
  String get attendanceSaved => 'হাজিরা সংরক্ষণ হয়েছে';

  @override
  String get attendanceAlreadyTaken =>
      'আজকের হাজিরা নেওয়া হয়েছে: পরিবর্তন করলে তা হালনাগাদ হবে';

  @override
  String get presentShort => 'উ';

  @override
  String get lateShort => 'দে';

  @override
  String get absentShort => 'অ';

  @override
  String get leaveShort => 'ছু';

  @override
  String get giveHomework => 'বাড়ির কাজ দিন';

  @override
  String get noSubjectsToTeach =>
      'এ বছর বাড়ির কাজ দেওয়ার মতো কোনো বিষয় আপনার নেই';

  @override
  String get subjectLabel => 'বিষয়';

  @override
  String get sectionsLabel => 'শাখা';

  @override
  String get chooseSection => 'অন্তত একটি শাখা বেছে নিন';

  @override
  String get titleLabel => 'শিরোনাম';

  @override
  String get instructionsOptional => 'কী করতে হবে (ঐচ্ছিক)';

  @override
  String get dueDateLabel => 'জমার তারিখ';

  @override
  String get fullMarksOptional => 'পূর্ণমান (ঐচ্ছিক)';

  @override
  String get invalidNumber => '১ থেকে ১০০০ এর মধ্যে একটি সংখ্যা লিখুন';

  @override
  String get photo => 'ছবি';

  @override
  String get addPhoto => 'ছবি যোগ করুন';

  @override
  String get camera => 'ক্যামেরা';

  @override
  String get gallery => 'গ্যালারি';

  @override
  String get homeworkGiven => 'বাড়ির কাজ দেওয়া হয়েছে';

  @override
  String studentsCount(String count) {
    return 'শিক্ষার্থী ($count)';
  }

  @override
  String get markAllDone => 'বাকিরা করেছে';

  @override
  String get marksShort => 'নম্বর';

  @override
  String marksUpTo(String full) {
    return 'নম্বর সর্বোচ্চ $full হতে পারে';
  }

  @override
  String get checksSaved => 'সংরক্ষণ হয়েছে';

  @override
  String get deleteHomework => 'বাড়ির কাজ মুছুন';

  @override
  String get deleteHomeworkConfirm =>
      'এই বাড়ির কাজ ও এর মূল্যায়ন মুছে ফেলবেন?';

  @override
  String get delete => 'মুছুন';

  @override
  String get examMarks => 'পরীক্ষার নম্বর';

  @override
  String get noMarkSheets =>
      'এখন নম্বর দেওয়ার কিছু নেই। স্কুল আপনার শ্রেণির নম্বর দেওয়া চালু করলে এখানে দেখাবে।';

  @override
  String opensOn(String date) {
    return '$date থেকে';
  }

  @override
  String fullAndPass(String full, String pass) {
    return 'পূর্ণমান $full · পাস $pass';
  }

  @override
  String enteredCount(String entered, String total) {
    return '$total জনের মধ্যে $entered জনের নম্বর দেওয়া হয়েছে';
  }

  @override
  String fillAllParts(String name) {
    return '$name: সব অংশের নম্বর দিন, অথবা সবগুলো ফাঁকা রাখুন';
  }

  @override
  String marksOutOfRange(String name, String full) {
    return '$name: নম্বর ০ থেকে $full এর মধ্যে হতে হবে';
  }

  @override
  String get marksSaved => 'নম্বর সংরক্ষণ হয়েছে';

  @override
  String get notices => 'নোটিশ';

  @override
  String get noNotices => 'কোনো নোটিশ নেই';

  @override
  String get categoryGeneral => 'সাধারণ';

  @override
  String get categoryExam => 'পরীক্ষা';

  @override
  String get categoryHoliday => 'ছুটি';

  @override
  String get categoryFees => 'ফি';

  @override
  String get categoryEvent => 'অনুষ্ঠান';

  @override
  String get categoryUrgent => 'জরুরি';

  @override
  String get settings => 'সেটিংস';

  @override
  String get language => 'ভাষা';

  @override
  String get changePassword => 'পাসওয়ার্ড পরিবর্তন';

  @override
  String get currentPassword => 'বর্তমান পাসওয়ার্ড';

  @override
  String get newPassword => 'নতুন পাসওয়ার্ড';

  @override
  String get confirmPassword => 'নতুন পাসওয়ার্ড আবার লিখুন';

  @override
  String get passwordTooShort => 'কমপক্ষে ৮ অক্ষর';

  @override
  String get passwordsDontMatch => 'পাসওয়ার্ড মেলেনি';

  @override
  String get passwordChanged => 'পাসওয়ার্ড পরিবর্তন হয়েছে';

  @override
  String get logout => 'লগআউট';

  @override
  String get logoutConfirm => 'এই ফোন থেকে লগআউট করবেন?';
}
