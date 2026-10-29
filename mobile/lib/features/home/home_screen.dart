import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/school_logo.dart';
import '../../widgets/ui.dart';
import '../auth/auth_controller.dart';
import '../notices/notices.dart';
import '../school/school.dart';
import 'guardian_home.dart';
import 'teacher_home.dart';

/// The guardian or teacher home, by the active role. Someone with both switches in the app bar.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final auth = ref.watch(authProvider).value;
    final me = auth?.me;
    if (me == null) return const SizedBox.shrink();
    final role = auth!.activeRole;
    // a failed count just hides the badge
    final unread = ref.watch(unreadNoticesProvider).value ?? 0;

    // round, softly filled action buttons
    final roundStyle = IconButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.surface, side: BorderSide(color: context.palette.hairline));

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 64,
        titleSpacing: 20,
        title: Row(
          children: [
            SchoolLogo(url: me.schoolLogo, size: 34),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                me.schoolName(Localizations.localeOf(context)),
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            style: roundStyle,
            icon: Badge(
              isLabelVisible: unread > 0,
              label: Text(context.number(unread)),
              child: const Icon(Icons.notifications_none_rounded),
            ),
            tooltip: t.notices,
            onPressed: () => context.push('/notices'),
          ),
          const SizedBox(width: 6),
          IconButton(
            style: roundStyle,
            icon: const Icon(Icons.person_outline_rounded),
            tooltip: t.settings,
            onPressed: () => context.push('/settings'),
          ),
          const SizedBox(width: 14),
        ],
        bottom: me.appRoles.length > 1
            ? PreferredSize(
                preferredSize: const Size.fromHeight(56),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: SegmentedButton<String>(
                    segments: [
                      ButtonSegment(value: Roles.guardian, label: Text(t.guardian), icon: const Icon(Icons.family_restroom)),
                      ButtonSegment(value: Roles.teacher, label: Text(t.teacher), icon: const Icon(Icons.co_present_outlined)),
                    ],
                    selected: {role!},
                    onSelectionChanged: (s) => ref.read(authProvider.notifier).switchRole(s.first),
                  ),
                ),
              )
            : null,
      ),
      body: switch (role) {
        Roles.guardian => GuardianHome(me: me),
        Roles.teacher => TeacherHome(me: me),
        _ => _NoAppRole(schoolCode: ref.watch(schoolProvider)?.code ?? ''),
      },
    );
  }
}

/// Staff and the school's super admin: everything they do is on the website.
class _NoAppRole extends StatelessWidget {
  const _NoAppRole({required this.schoolCode});

  final String schoolCode;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const IconBadge(Icons.computer_rounded, size: 64),
            const SizedBox(height: 16),
            Text(t.noRoleTitle, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(t.noRoleBody(ApiConfig.website(schoolCode)), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
