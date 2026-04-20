import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color brand = Color(0xFF001533);
  static const Color secondary = Color(0xFF0060A8);
  static const Color accent = Color(0xFF1E88E5);
  static const Color background = Color(0xFFF7F9FC);
  static const Color surfaceLow = Color(0xFFF2F4F7);
  static const Color surfaceHigh = Color(0xFFE6E8EB);
  static const Color surfaceHighest = Color(0xFFE0E3E6);
  static const Color success = Color(0xFF1B8F5A);
  static const Color sold = Color(0xFFD97706);
  static const Color danger = Color(0xFFC62828);
  static const Color ink = Color(0xFF191C1E);
  static const Color inkSecondary = Color(0xFF4A5B6A);

  static const Color darkBackground = Color(0xFF0A0F17);
  static const Color darkSurface = Color(0xFF111827);
  static const Color darkSurfaceLow = Color(0xFF0A121E);
  static const Color darkSurfaceHigh = Color(0xFF151E2C);
  static const Color darkSurfaceHighest = Color(0xFF1C2636);
  static const Color darkInk = Color(0xFFF7F9FC);
  static const Color darkInkSecondary = Color(0xFF9CA3AF);

  static const List<BoxShadow> softShadow = <BoxShadow>[
    BoxShadow(
      color: Color(0x14001533),
      blurRadius: 32,
      offset: Offset(0, 16),
    ),
  ];

  static const List<BoxShadow> softShadowDark = <BoxShadow>[
    BoxShadow(
      color: Color(0x33001533),
      blurRadius: 40,
      offset: Offset(0, 20),
    ),
  ];

  static ThemeData light() {
    const ColorScheme scheme = ColorScheme.light(
      primary: brand,
      secondary: secondary,
      tertiary: accent,
      error: danger,
      surface: Colors.white,
      background: background,
      onBackground: ink,
      onSurface: ink,
    );

    final TextTheme baseTextTheme = GoogleFonts.interTextTheme(
      ThemeData.light().textTheme,
    ).apply(
      bodyColor: ink,
      displayColor: ink,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      splashFactory: InkRipple.splashFactory,
      textTheme: baseTextTheme.copyWith(
        headlineSmall: const TextStyle(
          fontSize: 30,
          fontWeight: FontWeight.w700,
          color: ink,
          height: 1.2,
        ),
        titleMedium: const TextStyle(
          fontSize: 19,
          fontWeight: FontWeight.w600,
          color: ink,
          height: 1.3,
        ),
        bodyLarge: const TextStyle(
          fontSize: 16,
          height: 1.5,
          color: ink,
        ),
        bodyMedium: const TextStyle(
          fontSize: 16,
          height: 1.45,
          color: inkSecondary,
        ),
        bodySmall: const TextStyle(
          fontSize: 13,
          height: 1.4,
          color: inkSecondary,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: ink,
        elevation: 0,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: ink,
          letterSpacing: 0.2,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0.4,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        color: Colors.white,
        shadowColor: const Color(0x14000000),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: ButtonStyle(
          animationDuration: const Duration(milliseconds: 200),
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.pressed)) {
              return const Color(0xFF152B66);
            }
            if (states.contains(WidgetState.hovered)) {
              return const Color(0xFF183276);
            }
            return brand;
          }),
          foregroundColor: WidgetStateProperty.all(Colors.white),
          elevation: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.pressed)) return 1;
            if (states.contains(WidgetState.hovered)) return 5;
            return 2.5;
          }),
          shadowColor: WidgetStateProperty.all(const Color(0x22000000)),
          padding: WidgetStateProperty.all(
            const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
          ),
          textStyle: WidgetStateProperty.all(
            GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 16),
          ),
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
      ),
      textSelectionTheme: const TextSelectionThemeData(
        cursorColor: brand,
        selectionColor: Color(0x33001533),
        selectionHandleColor: brand,
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: brand,
          side: const BorderSide(color: Color(0xFFCBD5E1)),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            fontSize: 15,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceLow,
        hintStyle: const TextStyle(color: inkSecondary),
        labelStyle: const TextStyle(color: inkSecondary),
        floatingLabelStyle: const TextStyle(color: brand),
        prefixIconColor: inkSecondary,
        suffixIconColor: inkSecondary,
        iconColor: inkSecondary,
        helperStyle: const TextStyle(color: inkSecondary),
        prefixStyle: const TextStyle(color: ink),
        suffixStyle: const TextStyle(color: ink),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 16,
        ),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: brand, width: 1.6),
        ),
      ),
    );
  }

  static ThemeData dark() {
    const ColorScheme scheme = ColorScheme.dark(
      primary: accent,
      secondary: accent,
      tertiary: secondary,
      error: danger,
      surface: darkSurface,
      background: darkBackground,
      onBackground: darkInk,
      onSurface: darkInk,
    );

    final TextTheme baseTextTheme = GoogleFonts.interTextTheme(
      ThemeData.dark().textTheme,
    ).apply(
      bodyColor: darkInk,
      displayColor: darkInk,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: darkBackground,
      splashFactory: InkRipple.splashFactory,
      textTheme: baseTextTheme.copyWith(
        headlineSmall: const TextStyle(
          fontSize: 30,
          fontWeight: FontWeight.w700,
          color: darkInk,
          height: 1.2,
        ),
        titleMedium: const TextStyle(
          fontSize: 19,
          fontWeight: FontWeight.w600,
          color: darkInk,
          height: 1.3,
        ),
        bodyLarge: const TextStyle(
          fontSize: 16,
          height: 1.5,
          color: darkInk,
        ),
        bodyMedium: const TextStyle(
          fontSize: 16,
          height: 1.45,
          color: darkInkSecondary,
        ),
        bodySmall: const TextStyle(
          fontSize: 13,
          height: 1.4,
          color: darkInkSecondary,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: darkInk,
        elevation: 0,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: darkInk,
          letterSpacing: 0.2,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        color: darkSurface,
        shadowColor: const Color(0x33001533),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: ButtonStyle(
          animationDuration: const Duration(milliseconds: 200),
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.pressed)) {
              return const Color(0xFF0B1624);
            }
            if (states.contains(WidgetState.hovered)) {
              return const Color(0xFF0F1C2E);
            }
            return const Color(0xFF0F2A4F);
          }),
          foregroundColor: WidgetStateProperty.all(Colors.white),
          elevation: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.pressed)) return 0;
            if (states.contains(WidgetState.hovered)) return 4;
            return 2;
          }),
          shadowColor: WidgetStateProperty.all(const Color(0x33001533)),
          padding: WidgetStateProperty.all(
            const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
          ),
          textStyle: WidgetStateProperty.all(
            GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 16),
          ),
          shape: WidgetStateProperty.all(
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: accent,
          side: const BorderSide(color: Color(0xFF1F2937)),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            fontSize: 15,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: darkSurfaceHigh,
        hintStyle: const TextStyle(color: darkInkSecondary),
        labelStyle: const TextStyle(color: darkInkSecondary),
        floatingLabelStyle: const TextStyle(color: accent),
        prefixIconColor: darkInkSecondary,
        suffixIconColor: darkInkSecondary,
        iconColor: darkInkSecondary,
        helperStyle: const TextStyle(color: darkInkSecondary),
        prefixStyle: const TextStyle(color: darkInk),
        suffixStyle: const TextStyle(color: darkInk),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 16,
        ),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF1F2937)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: accent, width: 1.6),
        ),
      ),
      textSelectionTheme: const TextSelectionThemeData(
        cursorColor: accent,
        selectionColor: Color(0x334DA3FF),
        selectionHandleColor: accent,
      ),
    );
  }
}
