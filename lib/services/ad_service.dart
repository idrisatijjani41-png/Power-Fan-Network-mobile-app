import 'package:cloud_functions/cloud_functions.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

class AdService {
  final FirebaseFunctions _functions = FirebaseFunctions.instance;
  RewardedAd? _rewardedAd;
  bool _isAdLoaded = false;

  bool get isAdLoaded => _isAdLoaded;

  void loadRewardedAd({required Function onLoaded, required Function onError}) {
    RewardedAd.load(
      adUnitId: 'ca-app-pub-3940256099942544/5224354917', // Test AdUnit ID
      request: const AdRequest(),
      rewardedAdLoadCallback: RewardedAdLoadCallback(
        onAdLoaded: (ad) {
          _rewardedAd = ad;
          _isAdLoaded = true;
          onLoaded();
        },
        onAdFailedToLoad: (error) {
          _isAdLoaded = false;
          onError(error.message);
        },
      ),
    );
  }

  void showRewardedAd({required Function onSuccess, required Function onError}) {
    if (_rewardedAd == null || !_isAdLoaded) {
      onError('Ad is not ready yet.');
      return;
    }

    _rewardedAd!.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
        _isAdLoaded = false;
      },
      onAdFailedToShowFullScreenContent: (ad, error) {
        ad.dispose();
        _isAdLoaded = false;
        onError(error.message);
      },
    );

    _rewardedAd!.show(
      onUserEarnedReward: (AdWithoutView ad, RewardItem reward) async {
        try {
          // Send verification to backend Cloud Function with reward verification
          final callable = _functions.httpsCallable('verifyAdWatch');
          await callable.call({'rewardAmount': reward.amount});
          onSuccess();
        } catch (e) {
          onError('Server verification failed: ${e.toString()}');
        }
      },
    );
  }
}
