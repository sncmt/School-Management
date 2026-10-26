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
