import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../l10n/app_localizations.dart';
import '../../widgets/ui.dart';
import '../auth/auth_controller.dart';
import '../language/locale_controller.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final t = AppLocalizations.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: Text(t.logoutConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(t.cancel)),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(t.logout)),
        ],
      ),
    );
    if (ok == true) await ref.read(authProvider.notifier).logout();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final me = ref.watch(authProvider).value?.me;
    final locale = ref.watch(localeProvider) ?? const Locale('bn');

    final primary = Theme.of(context).colorScheme.primary;
    final error = Theme.of(context).colorScheme.error;

    return Scaffold(
      appBar: AppBar(title: Text(t.settings)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
        children: [
          if (me != null)
            FadeSlideIn(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: primary.withValues(alpha: 0.12),
                        child: Text(
                          me.fullname.isEmpty ? '?' : me.fullname.characters.first,
                          style: TextStyle(color: primary, fontWeight: FontWeight.w700, fontSize: 22),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(me.fullname, style: Theme.of(context).textTheme.titleMedium),
                            if (me.phone != null) Text(me.phone!, style: TextStyle(color: context.palette.muted)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          const SizedBox(height: 8),
          FadeSlideIn(
            index: 1,
            child: Card(
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                    child: Row(
                      children: [
                        const IconBadge(Icons.translate_rounded, size: 38),
                        const SizedBox(width: 14),
                        Expanded(child: Text(t.language, style: Theme.of(context).textTheme.titleSmall)),
                        SegmentedButton<String>(
                          showSelectedIcon: false,
                          style: const ButtonStyle(visualDensity: VisualDensity.compact),
                          segments: const [
                            ButtonSegment(value: 'bn', label: Text('বাংলা')),
                            ButtonSegment(value: 'en', label: Text('English')),
                          ],
                          selected: {locale.languageCode},
                          onSelectionChanged: (s) => ref.read(localeProvider.notifier).set(Locale(s.first)),
                        ),
                      ],
                    ),
                  ),
                  if (me?.canChangeOwnPassword ?? false) ...[
                    const Divider(height: 1, indent: 68),
                    ListTile(
                      contentPadding: const EdgeInsets.fromLTRB(16, 6, 12, 6),
                      leading: const IconBadge(Icons.lock_outline_rounded, size: 38),
                      title: Text(t.changePassword),
                      trailing: Icon(Icons.chevron_right_rounded, color: context.palette.muted),
                      onTap: () => context.push('/settings/password'),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          FadeSlideIn(
            index: 2,
            child: Card(
              child: ListTile(
                contentPadding: const EdgeInsets.fromLTRB(16, 6, 12, 6),
                leading: IconBadge(Icons.logout_rounded, size: 38, color: error),
                title: Text(t.logout, style: TextStyle(color: error)),
                onTap: () => _confirmLogout(context, ref),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
