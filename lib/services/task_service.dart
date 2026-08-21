import 'package:cloud_functions/cloud_functions.dart';
import 'package:url_launcher/url_launcher.dart';

class TaskService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  Future<void> openSocialPlatform(String url) async {
    final Uri uri = Uri.parse(url);
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      throw Exception('Could not launch $url');
    }
  }

  Future<void> verifyAndClaimSocialTask(String taskId) async {
    try {
      final HttpsCallable callable = _functions.httpsCallable('claimSocialReward');
      final response = await callable.call({'taskId': taskId});
      
      if (response.data['status'] != 'SUCCESS') {
        throw Exception(response.data['message'] ?? 'Verification failed.');
      }
    } on FirebaseFunctionsException catch (e) {
      throw Exception(e.message ?? 'Task verification error');
    }
  }
}
