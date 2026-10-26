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
