import 'package:flutter/material.dart';
import 'package:flutter_app/src/app.dart';
import 'package:flutter_app/src/models/domain_models.dart';
import 'package:flutter_app/src/screens/actor_dashboard_screen.dart';
import 'package:flutter_app/src/screens/forgot_password_screen.dart';
import 'package:flutter_app/src/screens/signup_screen.dart';
import 'package:flutter_app/src/widgets/modern_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.deps});

  final AppDependencies deps;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _submitting = false;
  String? _error;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _error = null;
    });

    final Map<String, dynamic> result = await widget.deps.traceabilityService
        .login(
          email: _emailController.text,
          password: _passwordController.text,
        );

    if (!mounted) return;
    if (result['ok'] != true) {
      setState(() {
        _submitting = false;
        _error = result['message'] as String? ?? 'Login failed';
      });
      return;
    }

    final Map<String, dynamic> user =
        (result['user'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final ActorRole role = actorRoleFromKey(
      user['role'] as String? ?? 'customer',
    );
    final Geofence zone =
        (await widget.deps.traceabilityService.fetchActiveZone(role: role)) ??
        const Geofence(
          center: GeoPoint(33.5731, -7.5898),
          radiusKm: 15,
          label: 'Default Zone',
        );
    final UserAccount account = UserAccount(
      id: user['id'] as String? ?? '',
      name: user['name'] as String? ?? 'User',
      orgId: user['orgId'] as String? ?? 'org_001',
      role: role,
      allowedArea: zone,
    );

    if (!mounted) return;
    setState(() => _submitting = false);
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ActorDashboardScreen(deps: widget.deps, user: account),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientShell(
        title: 'Actor Login',
        subtitle: 'Login with your verified email account.',
        child: ListView(
          children: <Widget>[
            const ScreenSection(
              title: 'Account Access',
              icon: Icons.lock_open_rounded,
              child: SizedBox.shrink(),
            ),
            SoftCard(
              child: Form(
                key: _formKey,
                child: Column(
                  children: <Widget>[
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.email_outlined),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Email is required';
                        }
                        if (!value.contains('@')) return 'Enter a valid email';
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(),
                        labelText: 'Password',
                        prefixIcon: Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          tooltip: _obscurePassword
                              ? 'Show password'
                              : 'Hide password',
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                          onPressed: () {
                            setState(() {
                              _obscurePassword = !_obscurePassword;
                            });
                          },
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Password is required';
                        }
                        return null;
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            const ScreenSection(
              title: 'Role Permissions',
              icon: Icons.admin_panel_settings_outlined,
              child: SoftCard(
                child: Text(
                  'Manufacturer: create first on-chain record.\n'
                  'Distributor: receive from manufacturer.\n'
                  'Reseller: receive from distributor and finalize sale.',
                ),
              ),
            ),
            const SizedBox(height: 32),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => SignupScreen(deps: widget.deps),
                    ),
                  );
                },
                icon: const Icon(Icons.person_add_alt_1_outlined),
                label: const Text('Create account (email verification)'),
              ),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) =>
                          ForgotPasswordScreen(deps: widget.deps),
                    ),
                  );
                },
                icon: const Icon(Icons.lock_reset_outlined),
                label: const Text('Forgot password?'),
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _submitting ? null : _login,
                child: Text(_submitting ? 'Logging in...' : 'Login'),
              ),
            ),
            if (_error != null) ...<Widget>[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
