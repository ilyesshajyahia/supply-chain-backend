import 'package:flutter/material.dart';
import 'package:flutter_app/src/app.dart';
import 'package:flutter_app/src/widgets/modern_shell.dart';
import 'package:flutter_app/src/widgets/design_system_widgets.dart';
import 'package:flutter_app/src/theme/app_theme.dart';

class OrgAdminScreen extends StatefulWidget {
  const OrgAdminScreen({super.key, required this.deps});

  final AppDependencies deps;

  @override
  State<OrgAdminScreen> createState() => _OrgAdminScreenState();
}

class _OrgAdminScreenState extends State<OrgAdminScreen> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _users = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final List<Map<String, dynamic>> users = await widget
          .deps
          .traceabilityService
          .listOrgUsers();
      if (!mounted) return;
      setState(() {
        _users = users;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Could not load users.';
      });
    }
  }

  Future<void> _toggleActive(String userId, bool active) async {
    final bool ok = await widget.deps.traceabilityService.setUserActive(
      userId: userId,
      isActive: active,
    );
    if (!ok && mounted) {
      setState(() => _error = 'Failed to update user');
    }
    await _loadUsers();
  }

  List<Map<String, dynamic>> get _pendingUsers => _users
      .where((u) => (u['isActive'] as bool?) != true)
      .toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientShell(
        title: 'Org Admin',
        subtitle: 'Approve or deactivate accounts in your organization.',
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                children: <Widget>[
                  if (_error != null) ...<Widget>[
                    AlertBanner(message: _error!),
                    const SizedBox(height: 16),
                  ],
                  const ScreenSection(
                    title: 'Pending Accounts',
                    icon: Icons.pending_actions,
                    child: SizedBox.shrink(),
                  ),
                  if (_pendingUsers.isEmpty)
                    SoftCard(
                      child: const Text('No pending accounts.'),
                    )
                  else
                    ..._pendingUsers.map((u) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: SoftCard(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Text(
                                  u['name'] as String? ?? 'User',
                                  style:
                                      Theme.of(context).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 4),
                                Text(u['email'] as String? ?? ''),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 8,
                                  children: <Widget>[
                                    _chip('Role: ${u['role']}'),
                                    _chip('Verified: ${u['emailVerified'] == true ? 'yes' : 'no'}'),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: <Widget>[
                                    FilledButton.icon(
                                      onPressed: () => _toggleActive(
                                        _userId(u),
                                        true,
                                      ),
                                      icon: const Icon(Icons.check_circle),
                                      label: const Text('Approve'),
                                    ),
                                    const SizedBox(width: 10),
                                    OutlinedButton.icon(
                                      onPressed: () => _toggleActive(
                                        _userId(u),
                                        false,
                                      ),
                                      icon: const Icon(Icons.block),
                                      label: const Text('Reject'),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        )),
                  const SizedBox(height: 24),
                  const ScreenSection(
                    title: 'All Accounts',
                    icon: Icons.people_alt_outlined,
                    child: SizedBox.shrink(),
                  ),
                  ..._users.map((u) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: SoftCard(
                          child: ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(u['name'] as String? ?? 'User'),
                            subtitle: Text(
                              '${u['email'] ?? ''} • ${u['role'] ?? ''}',
                            ),
                            trailing: StatusBadge(
                              label: (u['isActive'] == true)
                                  ? 'Active'
                                  : 'Pending',
                              color: (u['isActive'] == true)
                                  ? AppTheme.success
                                  : AppTheme.danger,
                              icon: (u['isActive'] == true)
                                  ? Icons.verified_outlined
                                  : Icons.pending,
                            ),
                          ),
                        ),
                      )),
                ],
              ),
      ),
    );
  }

  Widget _chip(String label) {
    final Color color = Theme.of(context).colorScheme.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        color: color.withOpacity(0.12),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  String _userId(Map<String, dynamic> user) {
    return (user['id'] as String?) ?? (user['_id'] as String?) ?? '';
  }
}
