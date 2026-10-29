import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_bn.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('bn'),
    Locale('en'),
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'SNCMT'**
  String get appTitle;

  /// No description provided for @chooseLanguage.
  ///
  /// In en, this message translates to:
  /// **'Choose your language'**
  String get chooseLanguage;

  /// No description provided for @appTagline.
  ///
  /// In en, this message translates to:
  /// **'Your school, in your pocket'**
  String get appTagline;

  /// No description provided for @goodMorning.
  ///
  /// In en, this message translates to:
  /// **'Good morning'**
  String get goodMorning;

  /// No description provided for @goodAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon'**
  String get goodAfternoon;

  /// No description provided for @goodEvening.
  ///
  /// In en, this message translates to:
  /// **'Good evening'**
  String get goodEvening;

  /// No description provided for @continueLabel.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueLabel;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get retry;

  /// No description provided for @required.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get required;

  /// No description provided for @networkError.
  ///
  /// In en, this message translates to:
  /// **'Can\'t reach the server. Check your internet connection.'**
  String get networkError;

  /// No description provided for @somethingWentWrong.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get somethingWentWrong;

  /// No description provided for @schoolCodeTitle.
  ///
  /// In en, this message translates to:
  /// **'Find your school'**
  String get schoolCodeTitle;

  /// No description provided for @schoolCodeHelp.
  ///
  /// In en, this message translates to:
  /// **'Enter the school code your school gave you.'**
  String get schoolCodeHelp;

  /// No description provided for @schoolCodeLabel.
  ///
  /// In en, this message translates to:
  /// **'School code'**
  String get schoolCodeLabel;

  /// No description provided for @schoolCodeExample.
  ///
  /// In en, this message translates to:
  /// **'For abc.sncmt.com the code is abc'**
  String get schoolCodeExample;

  /// No description provided for @schoolNotFound.
  ///
  /// In en, this message translates to:
  /// **'No active school has this code. Check it and try again.'**
  String get schoolNotFound;

  /// No description provided for @isThisYourSchool.
  ///
  /// In en, this message translates to:
  /// **'Is this your school?'**
  String get isThisYourSchool;

  /// No description provided for @yesContinue.
  ///
  /// In en, this message translates to:
  /// **'Yes, continue'**
  String get yesContinue;

  /// No description provided for @noChangeCode.
  ///
  /// In en, this message translates to:
  /// **'No, change the code'**
  String get noChangeCode;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Log in'**
  String get loginTitle;

  /// No description provided for @mobileNumber.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get mobileNumber;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @loginButton.
  ///
  /// In en, this message translates to:
  /// **'Log in'**
  String get loginButton;

  /// No description provided for @changeSchool.
  ///
  /// In en, this message translates to:
  /// **'Change school'**
  String get changeSchool;

  /// No description provided for @guardian.
  ///
  /// In en, this message translates to:
  /// **'Guardian'**
  String get guardian;

  /// No description provided for @teacher.
  ///
  /// In en, this message translates to:
  /// **'Teacher'**
  String get teacher;

  /// No description provided for @welcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome, {name}'**
  String welcome(String name);

  /// No description provided for @myChildren.
  ///
  /// In en, this message translates to:
  /// **'My children'**
  String get myChildren;

  /// No description provided for @noChildren.
  ///
  /// In en, this message translates to:
  /// **'No students are linked to this account.'**
  String get noChildren;

  /// No description provided for @classAndRoll.
  ///
  /// In en, this message translates to:
  /// **'Class {className} · Roll {roll}'**
  String classAndRoll(String className, String roll);

  /// No description provided for @teacherComingSoon.
  ///
  /// In en, this message translates to:
  /// **'Teacher features are coming soon.'**
  String get teacherComingSoon;

  /// No description provided for @noRoleTitle.
  ///
  /// In en, this message translates to:
  /// **'This account is for the website'**
  String get noRoleTitle;

  /// No description provided for @noRoleBody.
  ///
  /// In en, this message translates to:
  /// **'Please use {site} in a browser.'**
  String noRoleBody(String site);

  /// No description provided for @today.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get today;

  /// No description provided for @notMarkedYet.
  ///
  /// In en, this message translates to:
  /// **'Not marked yet'**
  String get notMarkedYet;

  /// No description provided for @present.
  ///
  /// In en, this message translates to:
  /// **'Present'**
  String get present;

  /// No description provided for @late.
  ///
  /// In en, this message translates to:
  /// **'Late'**
  String get late;

  /// No description provided for @absent.
  ///
  /// In en, this message translates to:
  /// **'Absent'**
  String get absent;

  /// No description provided for @leave.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get leave;

  /// No description provided for @attendance.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get attendance;

  /// No description provided for @thisMonth.
  ///
  /// In en, this message translates to:
  /// **'This month'**
  String get thisMonth;

  /// No description provided for @daysCount.
  ///
  /// In en, this message translates to:
  /// **'{count} days'**
  String daysCount(String count);

  /// No description provided for @seeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get seeAll;

  /// No description provided for @checkedInAt.
  ///
  /// In en, this message translates to:
  /// **'Checked in at {time}'**
  String checkedInAt(String time);

  /// No description provided for @attendanceRate.
  ///
  /// In en, this message translates to:
  /// **'{percent}% attendance'**
  String attendanceRate(String percent);

  /// No description provided for @holiday.
  ///
  /// In en, this message translates to:
  /// **'Holiday'**
  String get holiday;

  /// No description provided for @weeklyHoliday.
  ///
  /// In en, this message translates to:
  /// **'Weekly holiday'**
  String get weeklyHoliday;

  /// No description provided for @noRollCall.
  ///
  /// In en, this message translates to:
  /// **'No roll call this day'**
  String get noRollCall;

  /// No description provided for @feesDue.
  ///
  /// In en, this message translates to:
  /// **'Fees due'**
  String get feesDue;

  /// No description provided for @noDues.
  ///
  /// In en, this message translates to:
  /// **'No fees due'**
  String get noDues;

  /// No description provided for @homeworkDueSoon.
  ///
  /// In en, this message translates to:
  /// **'Homework due soon'**
  String get homeworkDueSoon;

  /// No description provided for @noHomework.
  ///
  /// In en, this message translates to:
  /// **'No homework due'**
  String get noHomework;

  /// No description provided for @dueOn.
  ///
  /// In en, this message translates to:
  /// **'Due {date}'**
  String dueOn(String date);

  /// No description provided for @admitCards.
  ///
  /// In en, this message translates to:
  /// **'Admit cards'**
  String get admitCards;

  /// No description provided for @upcomingHolidays.
  ///
  /// In en, this message translates to:
  /// **'Coming holidays'**
  String get upcomingHolidays;

  /// No description provided for @homework.
  ///
  /// In en, this message translates to:
  /// **'Homework'**
  String get homework;

  /// No description provided for @noHomeworkYet.
  ///
  /// In en, this message translates to:
  /// **'No homework yet'**
  String get noHomeworkYet;

  /// No description provided for @assignedOn.
  ///
  /// In en, this message translates to:
  /// **'Given {date}'**
  String assignedOn(String date);

  /// No description provided for @fullMarks.
  ///
  /// In en, this message translates to:
  /// **'Full marks {marks}'**
  String fullMarks(String marks);

  /// No description provided for @teacherCheck.
  ///
  /// In en, this message translates to:
  /// **'Teacher\'s check'**
  String get teacherCheck;

  /// No description provided for @notCheckedYet.
  ///
  /// In en, this message translates to:
  /// **'Not checked yet'**
  String get notCheckedYet;

  /// No description provided for @checkDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get checkDone;

  /// No description provided for @checkLate.
  ///
  /// In en, this message translates to:
  /// **'Done late'**
  String get checkLate;

  /// No description provided for @checkNotDone.
  ///
  /// In en, this message translates to:
  /// **'Not done'**
  String get checkNotDone;

  /// No description provided for @checkExcused.
  ///
  /// In en, this message translates to:
  /// **'Excused'**
  String get checkExcused;

  /// No description provided for @attachments.
  ///
  /// In en, this message translates to:
  /// **'Attachments'**
  String get attachments;

  /// No description provided for @couldNotOpen.
  ///
  /// In en, this message translates to:
  /// **'Couldn\'t open this file'**
  String get couldNotOpen;

  /// No description provided for @results.
  ///
  /// In en, this message translates to:
  /// **'Exam results'**
  String get results;

  /// No description provided for @noResults.
  ///
  /// In en, this message translates to:
  /// **'No results published yet'**
  String get noResults;

  /// No description provided for @publishedOn.
  ///
  /// In en, this message translates to:
  /// **'Published {date}'**
  String publishedOn(String date);

  /// No description provided for @gpaValue.
  ///
  /// In en, this message translates to:
  /// **'GPA {gpa}'**
  String gpaValue(String gpa);

  /// No description provided for @passed.
  ///
  /// In en, this message translates to:
  /// **'Passed'**
  String get passed;

  /// No description provided for @failed.
  ///
  /// In en, this message translates to:
  /// **'Failed'**
  String get failed;

  /// No description provided for @failedSubjects.
  ///
  /// In en, this message translates to:
  /// **'Failed in {count} subject(s)'**
  String failedSubjects(String count);

  /// No description provided for @totalMarks.
  ///
  /// In en, this message translates to:
  /// **'Total marks'**
  String get totalMarks;

  /// No description provided for @sectionPosition.
  ///
  /// In en, this message translates to:
  /// **'Section position'**
  String get sectionPosition;

  /// No description provided for @classPosition.
  ///
  /// In en, this message translates to:
  /// **'Class position'**
  String get classPosition;

  /// No description provided for @positionOf.
  ///
  /// In en, this message translates to:
  /// **'{position} of {total}'**
  String positionOf(String position, String total);

  /// No description provided for @examAttendance.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get examAttendance;

  /// No description provided for @daysPresent.
  ///
  /// In en, this message translates to:
  /// **'{present} of {days} days'**
  String daysPresent(String present, String days);

  /// No description provided for @subjectResults.
  ///
  /// In en, this message translates to:
  /// **'Subjects'**
  String get subjectResults;

  /// No description provided for @optionalSubject.
  ///
  /// In en, this message translates to:
  /// **'4th subject'**
  String get optionalSubject;

  /// No description provided for @notCounted.
  ///
  /// In en, this message translates to:
  /// **'Not counted'**
  String get notCounted;

  /// No description provided for @classRoutine.
  ///
  /// In en, this message translates to:
  /// **'Class routine'**
  String get classRoutine;

  /// No description provided for @noRoutine.
  ///
  /// In en, this message translates to:
  /// **'No class routine for this year yet'**
  String get noRoutine;

  /// No description provided for @breakTime.
  ///
  /// In en, this message translates to:
  /// **'Break'**
  String get breakTime;

  /// No description provided for @noClass.
  ///
  /// In en, this message translates to:
  /// **'No class'**
  String get noClass;

  /// No description provided for @holidaysThisMonth.
  ///
  /// In en, this message translates to:
  /// **'Holidays this month'**
  String get holidaysThisMonth;

  /// No description provided for @admitCard.
  ///
  /// In en, this message translates to:
  /// **'Admit card'**
  String get admitCard;

  /// No description provided for @studentName.
  ///
  /// In en, this message translates to:
  /// **'Student'**
  String get studentName;

  /// No description provided for @className.
  ///
  /// In en, this message translates to:
  /// **'Class'**
  String get className;

  /// No description provided for @groupName.
  ///
  /// In en, this message translates to:
  /// **'Group'**
  String get groupName;

  /// No description provided for @roll.
  ///
  /// In en, this message translates to:
  /// **'Roll'**
  String get roll;

  /// No description provided for @examDates.
  ///
  /// In en, this message translates to:
  /// **'Exam dates'**
  String get examDates;

  /// No description provided for @seat.
  ///
  /// In en, this message translates to:
  /// **'Seat'**
  String get seat;

  /// No description provided for @roomSeat.
  ///
  /// In en, this message translates to:
  /// **'Room {room} · Seat {seat}'**
  String roomSeat(String room, String seat);

  /// No description provided for @examRules.
  ///
  /// In en, this message translates to:
  /// **'Exam rules'**
  String get examRules;

  /// No description provided for @payOnline.
  ///
  /// In en, this message translates to:
  /// **'Pay online'**
  String get payOnline;

  /// No description provided for @payFees.
  ///
  /// In en, this message translates to:
  /// **'Pay fees'**
  String get payFees;

  /// No description provided for @chooseFees.
  ///
  /// In en, this message translates to:
  /// **'Choose what to pay now'**
  String get chooseFees;

  /// No description provided for @feesLabel.
  ///
  /// In en, this message translates to:
  /// **'Fees'**
  String get feesLabel;

  /// No description provided for @onlineCharge.
  ///
  /// In en, this message translates to:
  /// **'Online charge ({percent}%)'**
  String onlineCharge(String percent);

  /// No description provided for @payAmount.
  ///
  /// In en, this message translates to:
  /// **'Pay {amount}'**
  String payAmount(String amount);

  /// No description provided for @minimumOnline.
  ///
  /// In en, this message translates to:
  /// **'Online payments must be ৳10 or more'**
  String get minimumOnline;

  /// No description provided for @nothingToPayOnline.
  ///
  /// In en, this message translates to:
  /// **'No fees can be paid online right now'**
  String get nothingToPayOnline;

  /// No description provided for @securedBySslcommerz.
  ///
  /// In en, this message translates to:
  /// **'Secure payment by SSLCommerz: bKash, Nagad, cards and banks'**
  String get securedBySslcommerz;

  /// No description provided for @leavePayment.
  ///
  /// In en, this message translates to:
  /// **'Leave the payment page?'**
  String get leavePayment;

  /// No description provided for @leavePaymentBody.
  ///
  /// In en, this message translates to:
  /// **'If you have already paid, it is still recorded.'**
  String get leavePaymentBody;

  /// No description provided for @stay.
  ///
  /// In en, this message translates to:
  /// **'Stay'**
  String get stay;

  /// No description provided for @checkingPayment.
  ///
  /// In en, this message translates to:
  /// **'Checking your payment…'**
  String get checkingPayment;

  /// No description provided for @paymentSuccess.
  ///
  /// In en, this message translates to:
  /// **'Payment successful'**
  String get paymentSuccess;

  /// No description provided for @paymentFailed.
  ///
  /// In en, this message translates to:
  /// **'Payment failed'**
  String get paymentFailed;

  /// No description provided for @paymentNotCompleted.
  ///
  /// In en, this message translates to:
  /// **'Payment not completed'**
  String get paymentNotCompleted;

  /// No description provided for @paymentPending.
  ///
  /// In en, this message translates to:
  /// **'Still confirming this payment'**
  String get paymentPending;

  /// No description provided for @paymentPendingBody.
  ///
  /// In en, this message translates to:
  /// **'It appears in the payment history as soon as SSLCommerz confirms it.'**
  String get paymentPendingBody;

  /// No description provided for @paidButRefund.
  ///
  /// In en, this message translates to:
  /// **'These fees had already been paid. The school will refund {amount}.'**
  String paidButRefund(String amount);

  /// No description provided for @viewReceipt.
  ///
  /// In en, this message translates to:
  /// **'View receipt'**
  String get viewReceipt;

  /// No description provided for @checkAgain.
  ///
  /// In en, this message translates to:
  /// **'Check again'**
  String get checkAgain;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @paymentHistory.
  ///
  /// In en, this message translates to:
  /// **'Payment history'**
  String get paymentHistory;

  /// No description provided for @noPayments.
  ///
  /// In en, this message translates to:
  /// **'No payments yet'**
  String get noPayments;

  /// No description provided for @moneyReceipt.
  ///
  /// In en, this message translates to:
  /// **'Money receipt'**
  String get moneyReceipt;

  /// No description provided for @receiptNo.
  ///
  /// In en, this message translates to:
  /// **'Receipt {no}'**
  String receiptNo(String no);

  /// No description provided for @receiptNoLabel.
  ///
  /// In en, this message translates to:
  /// **'Receipt no.'**
  String get receiptNoLabel;

  /// No description provided for @paidOn.
  ///
  /// In en, this message translates to:
  /// **'Paid on'**
  String get paidOn;

  /// No description provided for @academicYear.
  ///
  /// In en, this message translates to:
  /// **'Academic year'**
  String get academicYear;

  /// No description provided for @paymentMethod.
  ///
  /// In en, this message translates to:
  /// **'Paid by'**
  String get paymentMethod;

  /// No description provided for @methodCash.
  ///
  /// In en, this message translates to:
  /// **'Cash'**
  String get methodCash;

  /// No description provided for @methodMobileBanking.
  ///
  /// In en, this message translates to:
  /// **'Mobile banking'**
  String get methodMobileBanking;

  /// No description provided for @methodOnline.
  ///
  /// In en, this message translates to:
  /// **'Online'**
  String get methodOnline;

  /// No description provided for @transactionId.
  ///
  /// In en, this message translates to:
  /// **'Transaction ID'**
  String get transactionId;

  /// No description provided for @receivedBy.
  ///
  /// In en, this message translates to:
  /// **'Received by'**
  String get receivedBy;

  /// No description provided for @total.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get total;

  /// No description provided for @cancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get cancelled;

  /// No description provided for @weeklyRoutine.
  ///
  /// In en, this message translates to:
  /// **'Weekly routine'**
  String get weeklyRoutine;

  /// No description provided for @takeAttendance.
  ///
  /// In en, this message translates to:
  /// **'Attendance'**
  String get takeAttendance;

  /// No description provided for @noClassesToday.
  ///
  /// In en, this message translates to:
  /// **'No classes today'**
  String get noClassesToday;

  /// No description provided for @todaysClasses.
  ///
  /// In en, this message translates to:
  /// **'Today\'s classes'**
  String get todaysClasses;

  /// No description provided for @classesToday.
  ///
  /// In en, this message translates to:
  /// **'{count} classes today'**
  String classesToday(String count);

  /// No description provided for @substituteClass.
  ///
  /// In en, this message translates to:
  /// **'Substitute'**
  String get substituteClass;

  /// No description provided for @coveredBy.
  ///
  /// In en, this message translates to:
  /// **'Taken by {name}'**
  String coveredBy(String name);

  /// No description provided for @notHeld.
  ///
  /// In en, this message translates to:
  /// **'Not held'**
  String get notHeld;

  /// No description provided for @attendanceSaved.
  ///
  /// In en, this message translates to:
  /// **'Attendance saved'**
  String get attendanceSaved;

  /// No description provided for @attendanceAlreadyTaken.
  ///
  /// In en, this message translates to:
  /// **'Already taken today: your changes update it'**
  String get attendanceAlreadyTaken;

  /// No description provided for @presentShort.
  ///
  /// In en, this message translates to:
  /// **'P'**
  String get presentShort;

  /// No description provided for @lateShort.
  ///
  /// In en, this message translates to:
  /// **'L'**
  String get lateShort;

  /// No description provided for @absentShort.
  ///
  /// In en, this message translates to:
  /// **'A'**
  String get absentShort;

  /// No description provided for @leaveShort.
  ///
  /// In en, this message translates to:
  /// **'Lv'**
  String get leaveShort;

  /// No description provided for @giveHomework.
  ///
  /// In en, this message translates to:
  /// **'Give homework'**
  String get giveHomework;

  /// No description provided for @noSubjectsToTeach.
  ///
  /// In en, this message translates to:
  /// **'You have no subjects to give homework for this year'**
  String get noSubjectsToTeach;

  /// No description provided for @subjectLabel.
  ///
  /// In en, this message translates to:
  /// **'Subject'**
  String get subjectLabel;

  /// No description provided for @sectionsLabel.
  ///
  /// In en, this message translates to:
  /// **'Sections'**
  String get sectionsLabel;

  /// No description provided for @chooseSection.
  ///
  /// In en, this message translates to:
  /// **'Choose at least one section'**
  String get chooseSection;

  /// No description provided for @titleLabel.
  ///
  /// In en, this message translates to:
  /// **'Title'**
  String get titleLabel;

  /// No description provided for @instructionsOptional.
  ///
  /// In en, this message translates to:
  /// **'What to do (optional)'**
  String get instructionsOptional;

  /// No description provided for @dueDateLabel.
  ///
  /// In en, this message translates to:
  /// **'Due date'**
  String get dueDateLabel;

  /// No description provided for @fullMarksOptional.
  ///
  /// In en, this message translates to:
  /// **'Full marks (optional)'**
  String get fullMarksOptional;

  /// No description provided for @invalidNumber.
  ///
  /// In en, this message translates to:
  /// **'Enter a number from 1 to 1000'**
  String get invalidNumber;

  /// No description provided for @photo.
  ///
  /// In en, this message translates to:
  /// **'Photo'**
  String get photo;

  /// No description provided for @addPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add photo'**
  String get addPhoto;

  /// No description provided for @camera.
  ///
  /// In en, this message translates to:
  /// **'Camera'**
  String get camera;

  /// No description provided for @gallery.
  ///
  /// In en, this message translates to:
  /// **'Gallery'**
  String get gallery;

  /// No description provided for @homeworkGiven.
  ///
  /// In en, this message translates to:
  /// **'Homework given'**
  String get homeworkGiven;

  /// No description provided for @studentsCount.
  ///
  /// In en, this message translates to:
  /// **'Students ({count})'**
  String studentsCount(String count);

  /// No description provided for @markAllDone.
  ///
  /// In en, this message translates to:
  /// **'Rest done'**
  String get markAllDone;

  /// No description provided for @marksShort.
  ///
  /// In en, this message translates to:
  /// **'Marks'**
  String get marksShort;

  /// No description provided for @marksUpTo.
  ///
  /// In en, this message translates to:
  /// **'Marks can be at most {full}'**
  String marksUpTo(String full);

  /// No description provided for @checksSaved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get checksSaved;

  /// No description provided for @deleteHomework.
  ///
  /// In en, this message translates to:
  /// **'Delete homework'**
  String get deleteHomework;

  /// No description provided for @deleteHomeworkConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete this homework and its ticks?'**
  String get deleteHomeworkConfirm;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @examMarks.
  ///
  /// In en, this message translates to:
  /// **'Exam marks'**
  String get examMarks;

  /// No description provided for @noMarkSheets.
  ///
  /// In en, this message translates to:
  /// **'No marks to enter now. Sheets appear when the school opens marks entry for your classes.'**
  String get noMarkSheets;

  /// No description provided for @opensOn.
  ///
  /// In en, this message translates to:
  /// **'Opens {date}'**
  String opensOn(String date);

  /// No description provided for @fullAndPass.
  ///
  /// In en, this message translates to:
  /// **'Full marks {full} · Pass {pass}'**
  String fullAndPass(String full, String pass);

  /// No description provided for @enteredCount.
  ///
  /// In en, this message translates to:
  /// **'Entered for {entered} of {total}'**
  String enteredCount(String entered, String total);

  /// No description provided for @fillAllParts.
  ///
  /// In en, this message translates to:
  /// **'{name}: enter every part, or leave them all empty'**
  String fillAllParts(String name);

  /// No description provided for @marksOutOfRange.
  ///
  /// In en, this message translates to:
  /// **'{name}: marks must be from 0 to {full}'**
  String marksOutOfRange(String name, String full);

  /// No description provided for @marksSaved.
  ///
  /// In en, this message translates to:
  /// **'Marks saved'**
  String get marksSaved;

  /// No description provided for @notices.
  ///
  /// In en, this message translates to:
  /// **'Notices'**
  String get notices;

  /// No description provided for @noNotices.
  ///
  /// In en, this message translates to:
  /// **'No notices'**
  String get noNotices;

  /// No description provided for @categoryGeneral.
  ///
  /// In en, this message translates to:
  /// **'General'**
  String get categoryGeneral;

  /// No description provided for @categoryExam.
  ///
  /// In en, this message translates to:
  /// **'Exam'**
  String get categoryExam;

  /// No description provided for @categoryHoliday.
  ///
  /// In en, this message translates to:
  /// **'Holiday'**
  String get categoryHoliday;

  /// No description provided for @categoryFees.
  ///
  /// In en, this message translates to:
  /// **'Fees'**
  String get categoryFees;

  /// No description provided for @categoryEvent.
  ///
  /// In en, this message translates to:
  /// **'Event'**
  String get categoryEvent;

  /// No description provided for @categoryUrgent.
  ///
  /// In en, this message translates to:
  /// **'Urgent'**
  String get categoryUrgent;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @changePassword.
  ///
  /// In en, this message translates to:
  /// **'Change password'**
  String get changePassword;

  /// No description provided for @currentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current password'**
  String get currentPassword;

  /// No description provided for @newPassword.
  ///
  /// In en, this message translates to:
  /// **'New password'**
  String get newPassword;

  /// No description provided for @confirmPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm new password'**
  String get confirmPassword;

  /// No description provided for @passwordTooShort.
  ///
  /// In en, this message translates to:
  /// **'At least 8 characters'**
  String get passwordTooShort;

  /// No description provided for @passwordsDontMatch.
  ///
  /// In en, this message translates to:
  /// **'Passwords don\'t match'**
  String get passwordsDontMatch;

  /// No description provided for @passwordChanged.
  ///
  /// In en, this message translates to:
  /// **'Password changed'**
  String get passwordChanged;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get logout;

  /// No description provided for @logoutConfirm.
  ///
  /// In en, this message translates to:
  /// **'Log out of this phone?'**
  String get logoutConfirm;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['bn', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'bn':
      return AppLocalizationsBn();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
