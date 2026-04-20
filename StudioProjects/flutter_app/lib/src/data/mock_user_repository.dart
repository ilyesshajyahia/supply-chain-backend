import 'package:flutter_app/src/models/domain_models.dart';

class MockUserRepository {
  const MockUserRepository();

  static const List<UserAccount> _accounts = <UserAccount>[
    UserAccount(
      id: 'mfg_01',
      name: 'Factory Operator',
      orgId: 'org_001',
      role: ActorRole.manufacturer,
      allowedArea: Geofence(
        center: GeoPoint(33.5731, -7.5898),
        radiusKm: 15,
        label: 'Factory Zone',
      ),
    ),
    UserAccount(
      id: 'dist_01',
      name: 'Distributor Receiver',
      orgId: 'org_001',
      role: ActorRole.distributor,
      allowedArea: Geofence(
        center: GeoPoint(34.0209, -6.8416),
        radiusKm: 12,
        label: 'Distributor Hub',
      ),
    ),
    UserAccount(
      id: 'res_01',
      name: 'Reseller Agent',
      orgId: 'org_001',
      role: ActorRole.reseller,
      allowedArea: Geofence(
        center: GeoPoint(35.7595, -5.8340),
        radiusKm: 12,
        label: 'Reseller Zone',
      ),
    ),
  ];

  List<UserAccount> allUsers() => _accounts;
}
