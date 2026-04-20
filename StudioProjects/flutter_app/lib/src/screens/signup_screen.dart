import 'package:flutter/material.dart';
import 'package:flutter_app/src/app.dart';
import 'package:flutter_app/src/widgets/design_system_widgets.dart';
import 'package:flutter_app/src/widgets/modern_shell.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key, required this.deps});

  final AppDependencies deps;

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();
  final TextEditingController _orgIdController = TextEditingController();
  String? _selectedRole;
  bool _submitting = false;
  String? _message;
  bool _success = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _orgIdController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedRole == null) {
      setState(() {
        _message = 'Please select a role.';
        _success = false;
      });
      return;
    }
    setState(() {
      _submitting = true;
      _message = null;
      _success = false;
    });

    final String orgId =
        (_selectedRole == 'customer') ? 'public' : _orgIdController.text;
    final String result = await widget.deps.traceabilityService
        .signupWithEmailVerification(
          name: _nameController.text,
          email: _emailController.text,
          role: _selectedRole!,
          orgId: orgId,
          password: _passwordController.text,
        );

    if (!mounted) return;
    setState(() {
      _submitting = false;
      _message = result;
      _success =
          result.toLowerCase().contains('successful') ||
          result.toLowerCase().contains('check your email');
    });
  }

  Future<void> _resend() async {
    if (_emailController.text.trim().isEmpty) {
      setState(() {
        _message = 'Enter your email first to resend verification.';
        _success = false;
      });
      return;
    }

    setState(() {
      _submitting = true;
      _message = null;
      _success = false;
    });

    final String result = await widget.deps.traceabilityService
        .resendVerificationEmail(email: _emailController.text);
    if (!mounted) return;
    setState(() {
      _submitting = false;
      _message = result;
      _success =
          result.toLowerCase().contains('sent') ||
          result.toLowerCase().contains('already verified');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientShell(
        title: 'Create Account',
        subtitle:
            'Sign up with email verification. Your account will activate after confirming your email.',
        child: ListView(
          children: <Widget>[
            const ScreenSection(
              title: 'Signup',
              icon: Icons.person_add_alt_1_outlined,
              child: SizedBox.shrink(),
            ),
            SoftCard(
              child: Form(
                key: _formKey,
                child: Column(
                  children: <Widget>[
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        labelText: 'Full name',
                        prefixIcon: Icon(Icons.badge_outlined),
                      ),
                      validator: (value) =>
                          (value == null || value.trim().isEmpty)
                          ? 'Name is required'
                          : null,
                    ),
                    const SizedBox(height: 14),
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
                      controller: _confirmPasswordController,
                      obscureText: _obscureConfirmPassword,
                      decoration: InputDecoration(
                        border: OutlineInputBorder(),
                        labelText: 'Confirm password',
                        prefixIcon: Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          tooltip: _obscureConfirmPassword
                              ? 'Show password'
                              : 'Hide password',
                          icon: Icon(
                            _obscureConfirmPassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                          onPressed: () {
                            setState(() {
                              _obscureConfirmPassword =
                                  !_obscureConfirmPassword;
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
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      value: _selectedRole,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        labelText: 'Role',
                        prefixIcon: Icon(Icons.verified_user_outlined),
                      ),
                      hint: const Text('Select role'),
                      items: const <DropdownMenuItem<String>>[
                        DropdownMenuItem(
                          value: 'manufacturer',
                          child: Text('Manufacturer'),
                        ),
                        DropdownMenuItem(
                          value: 'distributor',
                          child: Text('Distributor'),
                        ),
                        DropdownMenuItem(
                          value: 'reseller',
                          child: Text('Reseller'),
                        ),
                        DropdownMenuItem(
                          value: 'customer',
                          child: Text('Customer'),
                        ),
                      ],
                      onChanged: (value) {
                        setState(() => _selectedRole = value);
                      },
                      validator: (value) =>
                          value == null ? 'Select a role' : null,
                    ),
                    const SizedBox(height: 14),
                    if (_selectedRole == 'manufacturer' ||
                        _selectedRole == 'distributor' ||
                        _selectedRole == 'reseller')
                      TextFormField(
                        controller: _orgIdController,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          labelText: 'Organization ID',
                          prefixIcon: Icon(Icons.apartment_outlined),
                        ),
                        validator: (value) =>
                            (value == null || value.trim().isEmpty)
                            ? 'Organization ID is required'
                            : null,
                      ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _submitting ? null : _submit,
                        icon: const Icon(Icons.mark_email_read_outlined),
                        label: Text(
                          _submitting
                              ? 'Submitting...'
                              : 'Sign Up & Send Verification',
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _submitting ? null : _resend,
                        icon: const Icon(Icons.refresh),
                        label: const Text('Resend Verification Email'),
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
