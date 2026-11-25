import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/format.dart';
import '../../core/theme.dart';
import '../../l10n/app_localizations.dart';
import '../messages/messages.dart';
import '../notices/notices.dart';

/// The app's four places, along the bottom: Home, Messages, Notices and Profile. Each tab keeps
/// its own back stack; a child's or a teacher's screens open over the bar.
class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  void _select(int index) {
    // tapping the open tab again goes back to its first screen
    shell.goBranch(index, initialLocation: index == shell.currentIndex);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    // a failed count just hides the badge
    final messages = ref.watch(unreadMessagesProvider).value ?? 0;
    final notices = ref.watch(unreadNoticesProvider).value ?? 0;

    Widget badged(IconData icon, int count) => Badge(
          isLabelVisible: count > 0,
          label: Text(count > 99 ? '99+' : context.number(count)),
          child: Icon(icon),
        );

    return Scaffold(
      body: shell,
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(border: Border(top: BorderSide(color: context.palette.hairline))),
        child: NavigationBar(
          selectedIndex: shell.currentIndex,
          onDestinationSelected: _select,
          destinations: [
            NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home_rounded), label: t.navHome),
            NavigationDestination(
              icon: badged(Icons.chat_bubble_outline_rounded, messages),
              selectedIcon: badged(Icons.chat_bubble_rounded, messages),
              label: t.navMessages,
            ),
            NavigationDestination(
              icon: badged(Icons.campaign_outlined, notices),
              selectedIcon: badged(Icons.campaign_rounded, notices),
              label: t.navNotices,
            ),
            NavigationDestination(
              icon: const Icon(Icons.person_outline_rounded),
              selectedIcon: const Icon(Icons.person_rounded),
              label: t.navProfile,
            ),
          ],
        ),
      ),
    );
  }
}
