import 'package:flutter/material.dart';

import '../core/format.dart';
import '../features/guardian/family.dart';

/// The child's photo, or their first letter.
class ChildAvatar extends StatelessWidget {
  const ChildAvatar({super.key, required this.child, this.radius = 24});

  final Child child;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final name = context.pick(child.nameEn, child.nameBn);
    final photo = child.photo;
    return CircleAvatar(
      radius: radius,
      foregroundImage: photo == null ? null : NetworkImage(photo),
      child: Text(name.isEmpty ? '?' : name.characters.first),
    );
  }
}
