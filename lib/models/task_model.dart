import 'package:cloud_firestore/cloud_firestore.dart';

enum TaskPlatform { x, telegram, instagram, youtube }

class SocialTaskModel {
  final String taskId;
  final String title;
  final double rewardAmount;
  final TaskPlatform platform;
  final String targetUrl;
  final String requiredAction;

  SocialTaskModel({
    required this.taskId,
    required this.title,
    required this.rewardAmount,
    required this.platform,
    required this.targetUrl,
    required this.requiredAction,
  });

  factory SocialTaskModel.fromMap(String id, Map<String, dynamic> data) {
    return SocialTaskModel(
      taskId: id,
      title: data['title'] ?? 'Follow us',
      rewardAmount: (data['rewardAmount'] as num?)?.toDouble() ?? 50.0,
      platform: TaskPlatform.values.firstWhere(
        (e) => e.name == data['platform'],
        orElse: () => TaskPlatform.x,
      ),
      targetUrl: data['targetUrl'] ?? '',
      requiredAction: data['requiredAction'] ?? 'follow',
    );
  }
}

class UserTaskStateModel {
  final String taskId;
  final String status; // pending, requiresVerification, verified, claimed, rejected
  final DateTime? verifiedAt;
  final DateTime? claimedAt;

  UserTaskStateModel({
    required this.taskId,
    required this.status,
    this.verifiedAt,
    this.claimedAt,
  });

  factory UserTaskStateModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return UserTaskStateModel(
      taskId: doc.id,
      status: data['status'] ?? 'pending',
      verifiedAt: data['verifiedAt'] != null
          ? (data['verifiedAt'] as Timestamp).toDate()
          : null,
      claimedAt: data['claimedAt'] != null
          ? (data['claimedAt'] as Timestamp).toDate()
          : null,
    );
  }
}
