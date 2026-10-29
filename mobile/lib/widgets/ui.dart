import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../l10n/app_localizations.dart';

/*
 * The app's building blocks, on top of the theme: so every screen speaks the same language.
 */

/// A section's title, with an optional action at its end ("See all").
class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {super.key, this.action, this.padding = const EdgeInsets.fromLTRB(4, 20, 4, 10)});

  final String title;
  final Widget? action;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Row(
        children: [
          Expanded(child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
          ?action,
        ],
      ),
    );
  }
}

/// A small tinted label: a status, a category. The colour carries the meaning.
class Pill extends StatelessWidget {
  const Pill(this.label, {super.key, required this.color, this.icon});

  final String label;
  final Color color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(99)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 14, color: color), const SizedBox(width: 4)],
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12.5, height: 1.2)),
        ],
      ),
    );
  }
}

/// An icon in a soft tinted square: the start of a list row or a shortcut.
class IconBadge extends StatelessWidget {
  const IconBadge(this.icon, {super.key, this.color, this.size = 44});

  final IconData icon;
  final Color? color;
  final double size;

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.primary;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: c.withValues(alpha: 0.10), borderRadius: BorderRadius.circular(size * 0.32)),
      child: Icon(icon, color: c, size: size * 0.5),
    );
  }
}

/// A shortcut tile: an icon and a label, in a card. For grids of what a screen offers.
class ShortcutTile extends StatelessWidget {
  const ShortcutTile({super.key, required this.icon, required this.label, required this.onTap, this.color});

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              IconBadge(icon, color: color, size: 40),
              const SizedBox(width: 10),
              Expanded(
                child: Text(label, maxLines: 2, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleSmall),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Shortcut tiles side by side: two on a phone, more on a wider screen.
class ShortcutGrid extends StatelessWidget {
  const ShortcutGrid({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, box) => GridView.count(
        crossAxisCount: (box.maxWidth / 160).floor().clamp(2, 4),
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        mainAxisExtent: 68,
        children: children,
      ),
    );
  }
}

/// The SNCMT mark: the white cap on the brand colour, as on the app icon.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 72, this.onDark = false});

  final double size;

  /// On a coloured background: a translucent white square instead of the brand colour.
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: onDark ? Colors.white.withValues(alpha: 0.16) : Theme.of(context).colorScheme.primary,
        borderRadius: BorderRadius.circular(size * 0.3),
      ),
      child: Icon(Icons.school_rounded, color: Colors.white, size: size * 0.56),
    );
  }
}

/// "Good morning" and so on, by the phone's clock.
String greeting(AppLocalizations t) {
  final hour = DateTime.now().hour;
  if (hour < 12) return t.goodMorning;
  if (hour < 17) return t.goodAfternoon;
  return t.goodEvening;
}

/// Fades and rises into place, after `index` steps: list items arrive one after another.
class FadeSlideIn extends StatelessWidget {
  const FadeSlideIn({super.key, required this.child, this.index = 0});

  final Widget child;
  final int index;

  @override
  Widget build(BuildContext context) {
    // a short cascade: later items barely wait, so long lists never feel slow
    final delay = (index.clamp(0, 8)) * 0.06;
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: Duration(milliseconds: 420 + (delay * 1000).round()),
      curve: Interval(delay / (0.42 + delay), 1, curve: Curves.easeOutCubic),
      child: child,
      builder: (context, t, child) => Opacity(
        opacity: t,
        child: Transform.translate(offset: Offset(0, (1 - t) * 14), child: child),
      ),
    );
  }
}

/// A plain, calm empty or info state: an icon and a sentence.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.message});

  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      child: Column(
        children: [
          IconBadge(icon, color: context.palette.muted, size: 56),
          const SizedBox(height: 14),
          Text(message, textAlign: TextAlign.center, style: TextStyle(color: context.palette.muted)),
        ],
      ),
    );
  }
}
