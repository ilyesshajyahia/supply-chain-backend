import 'package:flutter/material.dart';
import 'package:flutter_app/src/app.dart';
import 'package:flutter_app/src/widgets/modern_shell.dart';

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({
    super.key,
    required this.deps,
    required this.token,
  });

  final AppDependencies deps;
  final String token;

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmController = TextEditingController();
  bool _submitting = false;
  String? _message;
  bool _success = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _message = null;
      _success = false;
    });

    final String result = await widget.deps.traceabilityService.resetPassword(
      token: widget.token,
      newPassword: _passwordController.text,
    );

    if (!mounted) return;
    setState(() {
      _submitting = false;
      _message = result;
      _success = result.toLowerCase().contains('success');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientShell(
        title: 'Set New Password',
        subtitle: 'Choose a strong password for your account.',
        child: ListView(
          children: <Widget>[
            SoftCard(
              child: Form(
                key: _formKey,
                child: Column(
                  children: <Widget>[
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(),
                        labelText: 'New password',
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
                        final RegExp strong =
                            RegExp(r'^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$');
                        if (!strong.hasMatch(value)) {
                          return 'Min 8 chars, 1 uppercase, 1 number, 1 special';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _confirmController,
                      obscureText: _obscureConfirm,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(),
                        labelText: 'Confirm password',
                        prefixIcon: Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          tooltip: _obscureConfirm
                              ? 'Show password'
                              : 'Hide password',
                          icon: Icon(
                            _obscureConfirm
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                          onPressed: () {
                            setState(() {
                              _obscureConfirm = !_obscureConfirm;
                            });
                          },
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Confirm your password';
                        }
                        if (value != _passwordController.text) {
                          return 'Passwords do not match';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _submitting ? null : _submit,
                        icon: const Icon(Icons.check_circle_outline),
                        label: Text(
                          _submitting ? 'Submitting...' : 'Reset Password',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (_message != null) ...<Widget>[
              const SizedBox(height: 20),
              SoftCard(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Icon(
                      _success
                          ? Icons.check_circle_outline
                          : Icons.error_outline,
                      color: _success ? Colors.green : Colors.red,
                    ),
                    const SizedBox(width: 10),
                    Expanded(child: Text(_message!)),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
