import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'features/auth/auth_controller.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/splash_screen.dart';
import 'features/guardian/attendance_screen.dart';
import 'features/guardian/child_screen.dart';
import 'features/guardian/homework.dart';
import 'features/guardian/homework_screens.dart';
import 'features/guardian/pay.dart';
import 'features/guardian/pay_screens.dart';
import 'features/guardian/payment_screens.dart';
import 'features/guardian/result_screens.dart';
import 'features/guardian/routine_screens.dart';
import 'features/notices/notice_screens.dart';
import 'features/notices/notices.dart';
import 'features/teacher/homework_screens.dart';
import 'features/teacher/marks_screens.dart';
import 'features/teacher/teacher_screens.dart';
import 'features/home/home_screen.dart';
import 'features/language/language_screen.dart';
import 'features/language/locale_controller.dart';
import 'features/school/school.dart';
import 'features/school/school_code_screen.dart';
import 'features/settings/change_password_screen.dart';
import 'features/settings/settings_screen.dart';

/// Where the user must be, in order: a language, a school, a checked session, then the app.
/// Screens never navigate to these steps themselves: they change the state and the router
/// follows.
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier(0);
  void bump(_, _) => refresh.value++;
  ref.listen(localeProvider, bump);
  ref.listen(schoolProvider, bump);
  ref.listen(authProvider, bump);
  ref.onDispose(refresh.dispose);

  const entrySteps = {'/language', '/school', '/splash', '/login'};

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final here = state.matchedLocation;
      String? goTo(String path) => here == path ? null : path;

      if (ref.read(localeProvider) == null) return goTo('/language');
      if (ref.read(schoolProvider) == null) return goTo('/school');

      final auth = ref.read(authProvider);
      if (auth.isLoading && !auth.hasValue || auth.hasError) return goTo('/splash');
      if (auth.value?.me == null) return goTo('/login');

      return entrySteps.contains(here) ? '/home' : null;
    },
    routes: [
      GoRoute(path: '/language', builder: (_, _) => const LanguageScreen()),
      GoRoute(path: '/school', builder: (_, _) => const SchoolCodeScreen()),
      GoRoute(path: '/splash', builder: (_, _) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
      GoRoute(path: '/home', builder: (_, _) => const HomeScreen()),
      GoRoute(
        path: '/child/:id',
        builder: (_, state) => ChildScreen(childId: state.pathParameters['id']!),
        routes: [
          GoRoute(
            path: 'attendance',
            builder: (_, state) => AttendanceScreen(childId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'homework',
            builder: (_, state) => HomeworkListScreen(childId: state.pathParameters['id']!),
            routes: [
              // the item comes from the list it was tapped in
              GoRoute(path: ':homeworkId', builder: (_, state) => HomeworkDetailScreen(homework: state.extra as Homework?)),
            ],
          ),
          GoRoute(path: 'routine', builder: (_, state) => RoutineScreen(childId: state.pathParameters['id']!)),
          GoRoute(
            path: 'pay',
            builder: (_, state) => PayFeesScreen(childId: state.pathParameters['id']!),
            routes: [
              // the started payment comes from the fee list
              GoRoute(
                path: 'gateway',
                builder: (_, state) => PaymentGatewayScreen(childId: state.pathParameters['id']!, payment: state.extra! as StartedPayment),
              ),
              GoRoute(
                path: 'result/:tranId',
                builder: (_, state) => PaymentResultScreen(childId: state.pathParameters['id']!, tranId: state.pathParameters['tranId']!),
              ),
            ],
          ),
          GoRoute(
            path: 'payments',
            builder: (_, state) => PaymentHistoryScreen(childId: state.pathParameters['id']!),
            routes: [
              GoRoute(path: ':paymentId', builder: (_, state) => ReceiptScreen(paymentId: state.pathParameters['paymentId']!)),
            ],
          ),
          GoRoute(
            path: 'admit-card/:examId',
            builder: (_, state) =>
                AdmitCardScreen(childId: state.pathParameters['id']!, examId: state.pathParameters['examId']!),
          ),
          GoRoute(
            path: 'results/:examId',
            builder: (_, state) =>
                MarksheetScreen(childId: state.pathParameters['id']!, examId: state.pathParameters['examId']!),
          ),
        ],
      ),
      GoRoute(path: '/teacher/week', builder: (_, _) => const WeekScreen()),
      GoRoute(
        path: '/teacher/marks',
        builder: (_, _) => const MySheetsScreen(),
        routes: [
          GoRoute(
            path: ':examSubjectId/:sectionId',
            builder: (_, state) => MarksEntryScreen(
              examSubjectId: state.pathParameters['examSubjectId']!,
              sectionId: state.pathParameters['sectionId']!,
              title: state.extra as String?,
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/teacher/homework',
        builder: (_, _) => const TeacherHomeworkListScreen(),
        routes: [
          // before :homeworkId, so "new" is not taken for an id
          GoRoute(path: 'new', builder: (_, _) => const GiveHomeworkScreen()),
          GoRoute(path: ':homeworkId', builder: (_, state) => TeacherHomeworkScreen(homeworkId: state.pathParameters['homeworkId']!)),
        ],
      ),
      GoRoute(
        path: '/teacher/attendance',
        builder: (_, _) => const AttendanceSectionsScreen(),
        routes: [
          GoRoute(
            path: ':sectionId',
            builder: (_, state) => RollCallScreen(sectionId: state.pathParameters['sectionId']!, label: state.extra as String?),
          ),
        ],
      ),
      GoRoute(
        path: '/notices',
        builder: (_, _) => const NoticeBoardScreen(),
        routes: [GoRoute(path: ':noticeId', builder: (_, state) => NoticeDetailScreen(notice: state.extra as Notice?))],
      ),
      GoRoute(
        path: '/settings',
        builder: (_, _) => const SettingsScreen(),
        routes: [GoRoute(path: 'password', builder: (_, _) => const ChangePasswordScreen())],
      ),
    ],
  );
});
