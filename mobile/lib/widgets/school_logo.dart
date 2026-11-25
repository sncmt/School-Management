import 'package:flutter/material.dart';

/// The school's logo, or a school icon when it has none (or the link has expired).
class SchoolLogo extends StatelessWidget {
  const SchoolLogo({super.key, required this.url, this.size = 64});

  final String? url;
  final double size;

  @override
  Widget build(BuildContext context) {
    final fallback = Icon(Icons.school_rounded, size: size * 0.75, color: Theme.of(context).colorScheme.primary);
    final link = url;
    return SizedBox.square(
      dimension: size,
      child: link == null
          ? fallback
          : Image.network(link, fit: BoxFit.contain, errorBuilder: (_, _, _) => fallback),
    );
  }
}
