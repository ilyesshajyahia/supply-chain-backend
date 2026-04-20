import 'package:flutter/material.dart';
import 'package:flutter_app/src/app.dart';
import 'package:flutter_app/src/widgets/design_system_widgets.dart';
import 'package:flutter_app/src/widgets/modern_shell.dart';
import 'package:flutter_app/src/theme/app_theme.dart';

class SystemHealthScreen extends StatefulWidget {
  const SystemHealthScreen({super.key, required this.deps});

  final AppDependencies deps;

  @override
  State<SystemHealthScreen> createState() => _SystemHealthScreenState();
}

class _SystemHealthScreenState extends State<SystemHealthScreen> {
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _data;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final Map<String, dynamic>? data =
        await widget.deps.traceabilityService.getSystemHealth();
    if (!mounted) return;
    if (data == null) {
      setState(() {
        _loading = false;
        _error = 'Could not load system health from backend.';
      });
      return;
    }
    setState(() {
      _loading = false;
      _data = data;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientShell(
        title: 'System Health',
        subtitle: 'Live status for backend, database, and email delivery.',
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                children: <Widget>[
                  if (_error != null) ...<Widget>[
                    AlertBanner(message: _error!),
                    const SizedBox(height: 16),
                  ],
                  if (_data != null) ...<Widget>[
                    _section('Backend', Icons.cloud_done_outlined, <Widget>[
                      _kv('Environment', _data!['nodeEnv']?.toString() ?? ''),
                      _kv(
                        'Uptime (s)',
                        _data!['uptimeSeconds']?.toString() ?? '',
                      ),
                      _kv(
                        'Timestamp',
                        _data!['timestamp']?.toString() ?? '',
                      ),
                    ]),
                    const SizedBox(height: 16),
                    _section('Database', Icons.storage_outlined, <Widget>[
                      _kv(
                        'Connected',
                        _boolLabel(_data!['database']?['connected'] == true),
                      ),
                      _kv(
                        'Ready state',
                        _data!['database']?['readyState']?.toString() ?? '',
                      ),
                    ]),
                    const SizedBox(height: 16),
                    _section('Blockchain', Icons.link_outlined, <Widget>[
                      _kv(
                        'Chain ID',
                        _data!['chain']?['chainId']?.toString() ?? '',
                      ),
                      _kv(
                        'RPC Host',
                        _data!['chain']?['rpcHost']?.toString() ?? '',
                      ),
                      _kv(
                        'Registry',
                        _shorten(_data!['chain']?['registryAddress']),
                      ),
                      _kv(
                        'Lifecycle',
                        _shorten(_data!['chain']?['lifecycleAddress']),
                      ),
                    ]),
                    const SizedBox(height: 16),
                    _section('Email', Icons.mail_outline, <Widget>[
                      _kv(
                        'Provider',
                        _data!['email']?['provider']?.toString() ?? '',
                      ),
                      _kv(
                        'Configured',
                        _boolLabel(
                          _data!['email']?['configured'] == true,
                        ),
                      ),
                      _kv(
                        'From',
                        _data!['email']?['from']?.toString() ?? '',
                      ),
                    ]),
                  ],
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: _load,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Refresh Status'),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _section(String title, IconData icon, List<Widget> children) {
    return SoftCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(icon, color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 10),
              Text(title, style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }

  Widget _kv(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Text(
              label,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: AppTheme.inkSecondary),
            ),
          ),
          const SizedBox(width: 12),
          Text(value),
        ],
      ),
    );
  }

  String _shorten(dynamic value) {
    final String text = value?.toString() ?? '';
    if (text.length <= 12) return text;
    return '${text.substring(0, 6)}...${text.substring(text.length - 4)}';
  }

  String _boolLabel(bool v) => v ? 'Yes' : 'No';
}
