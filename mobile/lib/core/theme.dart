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

/*
 * The design: calm and clear. A soft grey canvas with white cards outlined by a hairline
 * (no heavy shadows), generous space and 20 px corners; the school's colour used sparingly
 * (actions, icons, highlights); Hind Siliguri for both Bangla and English.
 */

/// Corner radii, so every screen rounds alike.
class Radii {
  static const card = 20.0;
  static const control = 14.0;
  static const tile = 16.0;
}

/// Neutral colours the colour scheme has no exact role for.
class Palette extends ThemeExtension<Palette> {
  const Palette({required this.canvas, required this.hairline, required this.muted, required this.field});

  /// The page behind the cards.
  final Color canvas;

  /// Card and divider outlines.
  final Color hairline;

  /// Secondary text: dates, hints, captions.
  final Color muted;

  /// Text field fill.
  final Color field;

  static const light = Palette(
    canvas: Color(0xFFF5F6F8),
    hairline: Color(0xFFE7E9EE),
    muted: Color(0xFF6B7280),
    field: Color(0xFFF1F3F6),
  );

  static const dark = Palette(
    canvas: Color(0xFF0D1117),
    hairline: Color(0xFF232A35),
    muted: Color(0xFF9AA4B2),
    field: Color(0xFF1A202A),
  );

  @override
  Palette copyWith({Color? canvas, Color? hairline, Color? muted, Color? field}) => Palette(
        canvas: canvas ?? this.canvas,
        hairline: hairline ?? this.hairline,
        muted: muted ?? this.muted,
        field: field ?? this.field,
      );

  @override
  Palette lerp(Palette? other, double t) => other == null
      ? this
      : Palette(
          canvas: Color.lerp(canvas, other.canvas, t)!,
          hairline: Color.lerp(hairline, other.hairline, t)!,
          muted: Color.lerp(muted, other.muted, t)!,
          field: Color.lerp(field, other.field, t)!,
        );
}

extension PaletteOf on BuildContext {
  Palette get palette => Theme.of(this).extension<Palette>()!;
}

ThemeData buildTheme(Color seed, Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final palette = dark ? Palette.dark : Palette.light;
  final ink = dark ? const Color(0xFFE8EBF0) : const Color(0xFF111827);
  final card = dark ? const Color(0xFF151B24) : Colors.white;

  // fidelity: the school's colour stays itself instead of drifting to a pastel
  final scheme = ColorScheme.fromSeed(
    seedColor: seed,
    brightness: brightness,
    dynamicSchemeVariant: DynamicSchemeVariant.fidelity,
  ).copyWith(
    surface: card,
    onSurface: ink,
    onSurfaceVariant: palette.muted,
    outline: palette.hairline,
    outlineVariant: palette.hairline,
    surfaceContainerLowest: card,
    surfaceContainerLow: card,
    surfaceContainer: palette.field,
    surfaceContainerHigh: palette.field,
    surfaceContainerHighest: palette.hairline,
  );

  final base = ThemeData(colorScheme: scheme, useMaterial3: true, fontFamily: 'HindSiliguri');
  final text = base.textTheme.apply(bodyColor: ink, displayColor: ink).copyWith(
        headlineMedium: base.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700, letterSpacing: -0.4, color: ink),
        headlineSmall: base.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700, letterSpacing: -0.3, color: ink),
        titleLarge: base.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700, letterSpacing: -0.2, color: ink),
        titleMedium: base.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600, color: ink),
        titleSmall: base.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600, color: ink),
        bodyLarge: base.textTheme.bodyLarge?.copyWith(height: 1.5, color: ink),
        bodyMedium: base.textTheme.bodyMedium?.copyWith(height: 1.45, color: ink),
        bodySmall: base.textTheme.bodySmall?.copyWith(color: palette.muted),
        labelLarge: base.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600, letterSpacing: 0.1),
      );

  final controlShape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.control));
  const controlSize = Size.fromHeight(54);

  return base.copyWith(
    textTheme: text,
    scaffoldBackgroundColor: palette.canvas,
    extensions: [palette],
    splashFactory: InkSparkle.splashFactory,
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {TargetPlatform.android: FadeForwardsPageTransitionsBuilder()},
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: palette.canvas,
      foregroundColor: ink,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: text.titleLarge,
    ),
    cardTheme: CardThemeData(
      color: card,
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Radii.card),
        side: BorderSide(color: palette.hairline),
      ),
      clipBehavior: Clip.antiAlias,
    ),
    dividerTheme: DividerThemeData(color: palette.hairline, thickness: 1, space: 24),
    listTileTheme: ListTileThemeData(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.card)),
      titleTextStyle: text.titleSmall?.copyWith(fontSize: 15),
      subtitleTextStyle: text.bodyMedium?.copyWith(color: palette.muted, fontSize: 13.5),
      iconColor: palette.muted,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: palette.field,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(Radii.control), borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(Radii.control), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Radii.control),
        borderSide: BorderSide(color: scheme.primary, width: 1.6),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Radii.control),
        borderSide: BorderSide(color: scheme.error, width: 1.2),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Radii.control),
        borderSide: BorderSide(color: scheme.error, width: 1.6),
      ),
      labelStyle: TextStyle(color: palette.muted),
      hintStyle: TextStyle(color: palette.muted.withValues(alpha: 0.7)),
      prefixIconColor: palette.muted,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(minimumSize: controlSize, shape: controlShape, textStyle: text.labelLarge?.copyWith(fontSize: 16)),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: controlSize,
        shape: controlShape,
        side: BorderSide(color: palette.hairline),
        backgroundColor: card,
        textStyle: text.labelLarge?.copyWith(fontSize: 16),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(shape: controlShape, textStyle: text.labelLarge),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      elevation: 2,
      highlightElevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.tile)),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: palette.field,
      side: BorderSide.none,
      shape: const StadiumBorder(),
      labelStyle: text.labelMedium?.copyWith(color: ink),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: SegmentedButton.styleFrom(
        side: BorderSide(color: palette.hairline),
        selectedBackgroundColor: scheme.primary.withValues(alpha: 0.12),
        selectedForegroundColor: scheme.primary,
        shape: controlShape,
      ),
    ),
    tabBarTheme: TabBarThemeData(
      labelStyle: text.labelLarge,
      unselectedLabelStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w500),
      unselectedLabelColor: palette.muted,
      dividerColor: palette.hairline,
      indicatorSize: TabBarIndicatorSize.label,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.control)),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: card,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Radii.card)),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: card,
      showDragHandle: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(Radii.card + 8))),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: scheme.primary, linearTrackColor: palette.hairline),
  );
}
