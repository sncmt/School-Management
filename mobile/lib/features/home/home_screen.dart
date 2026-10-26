import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config.dart';
import '../../l10n/app_localizations.dart';
import '../auth/auth_controller.dart';
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

    return Scaffold(
      appBar: AppBar(
        title: Text(me.schoolName(Localizations.localeOf(context)), overflow: TextOverflow.ellipsis),
        actions: [IconButton(icon: const Icon(Icons.settings_outlined), tooltip: t.settings, onPressed: () => context.push('/settings'))],
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
            const Icon(Icons.computer_rounded, size: 56),
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
