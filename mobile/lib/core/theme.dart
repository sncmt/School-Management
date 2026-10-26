import 'package:flutter/material.dart';

/// The school's accent colour (its dashboard colour on the website), as sRGB. Same keys as
/// ACCENT_COLORS in client/lib/theme/accents.ts, converted from its light-mode "brand" shade.
const _accents = <String, Color>{
  'BLUE': Color(0xFF285CC2),
  'INDIGO': Color(0xFF4D45BB),
  'VIOLET': Color(0xFF793FB5),
  'MAROON': Color(0xFF852535),
  'TEAL': Color(0xFF007373),
  'SLATE': Color(0xFF3E4E63),
};

/// No choice (or a key this app doesn't know yet) looks like the platform's own blue.
Color accentColor(String? key) => _accents[key] ?? _accents['BLUE']!;

ThemeData buildTheme(Color seed, Brightness brightness) {
  final scheme = ColorScheme.fromSeed(seedColor: seed, brightness: brightness);
  return ThemeData(
    colorScheme: scheme,
    inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52)),
    ),
  );
}
