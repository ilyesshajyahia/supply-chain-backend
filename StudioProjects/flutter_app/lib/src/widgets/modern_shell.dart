import 'package:flutter/material.dart';
import 'package:flutter_app/src/theme/app_theme.dart';
import 'package:flutter_app/src/app.dart';
import 'package:flutter_app/src/widgets/design_system_widgets.dart';

class GradientShell extends StatelessWidget {
  const GradientShell({
    super.key,
    required this.child,
    this.title,
    this.subtitle,
    this.headerActions,
  });

  final Widget child;
  final String? title;
  final String? subtitle;
  final List<Widget>? headerActions;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final bool isDark = theme.brightness == Brightness.dark;
    final Widget heading = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (title != null)
          Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  title!,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
              ),
              if (headerActions != null && headerActions!.isNotEmpty)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: headerActions!,
                  ),
                ),
              _ThemeToggle(),
            ],
          ),
        if (subtitle != null) const SizedBox(height: 10),
        if (subtitle != null)
          Text(
            subtitle!,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.6),
                ),
          ),
      ],
    );

    return Container(
      decoration: BoxDecoration(
        color: theme.scaffoldBackgroundColor,
        gradient: isDark
            ? const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: <Color>[
                  Color(0xFF0A0F17),
                  Color(0xFF0B1624),
                ],
              )
            : const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: <Color>[
                  Color(0xFFF7F9FC),
                  Color(0xFFF2F4F7),
                ],
              ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              heading,
              const SizedBox(height: 32),
              Expanded(child: child),
            ],
          ),
        ),
      ),
    );
  }
}

class _ThemeToggle extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: themeModeNotifier,
      builder: (context, mode, _) {
        final bool isDarkNow =
            Theme.of(context).brightness == Brightness.dark;
        return IconButton(
          tooltip:
              isDarkNow ? 'Switch to light theme' : 'Switch to dark theme',
          icon: Icon(isDarkNow ? Icons.light_mode : Icons.dark_mode),
          onPressed: () {
            themeModeNotifier.value =
                isDarkNow ? ThemeMode.light : ThemeMode.dark;
          },
        );
      },
    );
  }
}

class ActionCard extends StatefulWidget {
  const ActionCard({
    super.key,
    required this.title,
    required this.description,
    required this.icon,
    required this.onTap,
  });

  final String title;
  final String description;
  final IconData icon;
  final VoidCallback onTap;

  @override
  State<ActionCard> createState() => _ActionCardState();
}

class _ActionCardState extends State<ActionCard> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        transform: Matrix4.translationValues(0, _hovered ? -2 : 0, 0),
        child: ElevatedSurfaceCard(
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: widget.onTap,
            child: Row(
              children: <Widget>[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Theme.of(context)
                        .colorScheme
                        .primary
                        .withOpacity(0.12),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    widget.icon,
                    size: 28,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(width: 18),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        widget.title,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text(widget.description),
                    ],
                  ),
                ),
                Icon(
                  Icons.arrow_forward_rounded,
                  size: 22,
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withOpacity(0.6),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class SoftCard extends StatelessWidget {
  const SoftCard({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ElevatedSurfaceCard(child: child);
  }
}

class ScreenSection extends StatelessWidget {
  const ScreenSection({super.key, required this.child, this.title, this.icon});

  final Widget child;
  final String? title;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (title != null) ...<Widget>[
          SectionTitle(title: title!, icon: icon),
          const SizedBox(height: 14),
        ],
        child,
      ],
    );
  }
}
