import 'dart:math' as math;

enum ActorRole { manufacturer, distributor, reseller, customer }

enum ProductStatus { atManufacturer, atDistributor, atReseller, sold }

enum LifecycleAction { created, transferred, sold }

enum ContractSource { registry, lifecycle }

class GeoPoint {
  const GeoPoint(this.lat, this.lng);
  final double lat;
  final double lng;
}

class Geofence {
  const Geofence({
    required this.center,
    required this.radiusKm,
    required this.label,
  });

  final GeoPoint center;
  final double radiusKm;
  final String label;

  bool contains(GeoPoint point) {
    final latDiffKm = (point.lat - center.lat).abs() * 111.0;
    final lngDiffKm =
        (point.lng - center.lng).abs() * 111.0 * math.cos(center.lat * 0.01745);
    final distance = math.sqrt(latDiffKm * latDiffKm + lngDiffKm * lngDiffKm);
    return distance <= radiusKm;
  }
}

class UserAccount {
  const UserAccount({
    required this.id,
    required this.name,
    required this.orgId,
    required this.role,
    required this.allowedArea,
  });

  final String id;
  final String name;
  final String orgId;
  final ActorRole role;
  final Geofence allowedArea;
}

class LifecycleEvent {
  const LifecycleEvent({
    required this.action,
    required this.by,
    required this.location,
    required this.timestamp,
    required this.note,
    required this.txHash,
    required this.blockNumber,
    required this.contract,
    required this.decodedMeaning,
  });

  final LifecycleAction action;
  final ActorRole by;
  final GeoPoint location;
  final DateTime timestamp;
  final String note;
  final String txHash;
  final int blockNumber;
  final ContractSource contract;
  final String decodedMeaning;
}

class ProductRecord {
  ProductRecord({
    required this.id,
    required this.name,
    required this.status,
    required this.currentOwner,
    required this.events,
    this.serialNumber,
    this.brand,
    this.category,
    this.color,
    this.description,
  });

  final String id;
  final String name;
  final String? serialNumber;
  final String? brand;
  final String? category;
  final String? color;
  final String? description;
  ProductStatus status;
  ActorRole currentOwner;
  final List<LifecycleEvent> events;
  int soldScanCount = 0;
}

class PublicScanEvent {
  const PublicScanEvent({
    required this.timestamp,
    required this.location,
    required this.result,
  });

  final DateTime timestamp;
  final GeoPoint location;
  final String result;
}

class InternalChatMessage {
  const InternalChatMessage({
    required this.id,
    required this.qrId,
    required this.byUserId,
    required this.byName,
    required this.byRole,
    required this.text,
    required this.createdAt,
    required this.seenByCount,
    required this.seenByMe,
  });

  final String id;
  final String? qrId;
  final String byUserId;
  final String byName;
  final ActorRole byRole;
  final String text;
  final DateTime createdAt;
  final int seenByCount;
  final bool seenByMe;
}

String roleLabel(ActorRole role) {
  switch (role) {
    case ActorRole.manufacturer:
      return 'Manufacturer';
    case ActorRole.distributor:
      return 'Distributor';
    case ActorRole.reseller:
      return 'Reseller';
    case ActorRole.customer:
      return 'Customer';
  }
}

String roleKey(ActorRole role) {
  switch (role) {
    case ActorRole.manufacturer:
      return 'manufacturer';
    case ActorRole.distributor:
      return 'distributor';
    case ActorRole.reseller:
      return 'reseller';
    case ActorRole.customer:
      return 'customer';
  }
}

ActorRole actorRoleFromKey(String role) {
  switch (role) {
    case 'manufacturer':
      return ActorRole.manufacturer;
    case 'retailer':
    case 'distributor':
      return ActorRole.distributor;
    case 'reseller':
      return ActorRole.reseller;
    default:
      return ActorRole.customer;
  }
}

String statusLabel(ProductStatus status) {
  switch (status) {
    case ProductStatus.atManufacturer:
      return 'At Manufacturer';
    case ProductStatus.atDistributor:
      return 'At Distributor';
    case ProductStatus.atReseller:
      return 'At Reseller';
    case ProductStatus.sold:
      return 'Sold';
  }
}

String contractLabel(ContractSource source) {
  switch (source) {
    case ContractSource.registry:
      return 'Registry';
    case ContractSource.lifecycle:
      return 'Lifecycle';
  }
}
