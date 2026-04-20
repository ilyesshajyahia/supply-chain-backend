import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';
import 'package:flutter_app/src/app.dart';
import 'package:flutter_app/src/screens/email_verification_screen.dart';
import 'package:flutter_app/src/screens/entry_choice_screen.dart';
import 'package:flutter_app/src/screens/reset_password_screen.dart';
import 'package:flutter_app/src/models/domain_models.dart';
import 'package:flutter_app/src/screens/actor_dashboard_screen.dart';
import 'package:flutter_app/src/widgets/modern_shell.dart';

class StartupGateScreen extends StatefulWidget {
  const StartupGateScreen({super.key, required this.deps});

  final AppDependencies deps;

  @override
  State<StartupGateScreen> createState() => _StartupGateScreenState();
}

class _StartupGateScreenState extends State<StartupGateScreen> {
  bool _loading = true;
  String? _error;
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _sub;
  String? _pendingVerifyToken;
  String? _pendingResetToken;

  @override
  void initState() {
    super.initState();
    _initDeepLinks();
    _checkBackend();
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _initDeepLinks() async {
    try {
      final Uri? initial = await _appLinks.getInitialLink();
      _setPendingFromUri(initial);
    } catch (_) {}

    _sub = _appLinks.uriLinkStream.listen((Uri uri) {
      final String? token = uri.queryParameters['token'];
      if (token == null || token.isEmpty) return;
      if (!mounted) return;
      if (uri.host == 'reset-password') {
        Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) =>
                ResetPasswordScreen(deps: widget.deps, token: token),
          ),
        );
        return;
      }
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) =>
              EmailVerificationScreen(deps: widget.deps, token: token),
        ),
      );
    });
  }

  void _setPendingFromUri(Uri? uri) {
    if (uri == null) return;
    final String? token = uri.queryParameters['token'];
    if (token == null || token.isEmpty) return;
    if (uri.host == 'reset-password') {
      _pendingResetToken = token;
      return;
    }
    _pendingVerifyToken = token;
  }

  Future<void> _checkBackend() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.deps.traceabilityService.checkBackendHealth();
      if (!mounted) return;
      if (_pendingVerifyToken != null && _pendingVerifyToken!.isNotEmpty) {
        final String token = _pendingVerifyToken!;
        _pendingVerifyToken = null;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(
            builder: (_) =>
                EmailVerificationScreen(deps: widget.deps, token: token),
          ),
        );
      } else if (_pendingResetToken != null &&
          _pendingResetToken!.isNotEmpty) {
        final String token = _pendingResetToken!;
        _pendingResetToken = null;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(
            builder: (_) =>
                ResetPasswordScreen(deps: widget.deps, token: token),
          ),
        );
      } else {
        final Map<String, dynamic>? profile = await widget
            .deps
            .traceabilityService
            .restoreSession();
        if (profile == null) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute<void>(
              builder: (_) => EntryChoiceScreen(deps: widget.deps),
            ),
          );
          return;
        }
        final ActorRole role =
            actorRoleFromKey(profile['role'] as String? ?? 'customer');
        final Geofence zone =
            (await widget.deps.traceabilityService.fetchActiveZone(
                  role: role,
                )) ??
            const Geofence(
              center: GeoPoint(33.5731, -7.5898),
              radiusKm: 15,
              label: 'Default Zone',
            );
        final UserAccount account = UserAccount(
          id: profile['id'] as String? ?? '',
          name: profile['name'] as String? ?? 'User',
          orgId: profile['orgId'] as String? ?? 'org_001',
          role: role,
          allowedArea: zone,
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute<void>(
            builder: (_) =>
                ActorDashboardScreen(deps: widget.deps, user: account),
          ),
        );
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error =
            'Could not connect to backend server. Check that backend is running and reachable.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientShell(
        title: 'ChainTrace',
        subtitle: 'Initializing connection...',
        child: Center(
          child: _loading
              ? const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text('Connecting to backend...'),
                  ],
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    const Icon(Icons.cloud_off, size: 44, color: Colors.red),
                    const SizedBox(height: 12),
                    Text(
                      _error ?? 'Connection failed.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 18),
                    FilledButton.icon(
                      onPressed: _checkBackend,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Try Again'),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
