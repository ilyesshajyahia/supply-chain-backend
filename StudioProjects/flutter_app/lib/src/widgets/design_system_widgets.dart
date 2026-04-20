import 'package:flutter/material.dart';
import 'package:flutter_app/src/theme/app_theme.dart';

class ElevatedSurfaceCard extends StatelessWidget {
  const ElevatedSurfaceCard({
    super.key,
    required this.child,
    this.padding = 24,
  });

  final Widget child;
  final double padding;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final Color cardColor = theme.cardTheme.color ?? theme.colorScheme.surface;
    final Color borderColor =
        theme.brightness == Brightness.dark
            ? Colors.white.withOpacity(0.06)
            : const Color(0x1A001533);
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor),
        boxShadow:
            theme.brightness == Brightness.dark
                ? AppTheme.softShadowDark
                : AppTheme.softShadow,
      ),
      child: Padding(padding: EdgeInsets.all(padding), child: child),
    );
  }
}

class SectionTitle extends StatelessWidget {
  const SectionTitle({super.key, required this.title, this.icon});

  final String title;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: <Widget>[
        if (icon != null) ...<Widget>[
          Icon(icon, size: 22, color: Theme.of(context).colorScheme.primary),
          const SizedBox(width: 10),
        ],
        Text(title, style: Theme.of(context).textTheme.titleMedium),
      ],
    );
  }
}

class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    required this.color,
    this.icon,
  });

  final String label;
  final Color color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: color.withOpacity(0.14),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (icon != null) ...<Widget>[
            Icon(icon, size: 15, color: color),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w700,
              fontSize: 13.5,
            ),
          ),
        ],
      ),
    );
  }
}

class AlertBanner extends StatelessWidget {
  const AlertBanner({
    super.key,
    required this.message,
    this.icon,
    this.color,
  });

  final String message;
  final IconData? icon;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final Color resolvedColor =
        color ?? Theme.of(context).colorScheme.error;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: resolvedColor.withOpacity(0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: resolvedColor.withOpacity(0.3)),
      ),
      child: Row(
        children: <Widget>[
          Icon(icon ?? Icons.error_outline, color: resolvedColor),
          const SizedBox(width: 10),
          Expanded(child: Text(message)),
        ],
      ),
    );
  }
}
