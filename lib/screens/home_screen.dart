import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';
import '../models/mining_model.dart';
import '../services/mining_service.dart';
import '../services/ad_service.dart';
import '../services/task_service.dart';
import '../widgets/header_widget.dart';
import '../widgets/balance_card.dart';
import '../widgets/mining_card.dart';
import '../widgets/ads_card.dart';
import '../widgets/daily_task_card.dart';
import '../widgets/kyc_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final MiningService _miningService = MiningService();
  final AdService _adService = AdService();
  final TaskService _taskService = TaskService();

  bool _isAdLoading = false;

  @override
  void initState() {
    super.initState();
    _loadAd();
  }

  void _loadAd() {
    _adService.loadRewardedAd(
      onLoaded: () => setState(() {}),
      onError: (msg) {},
    );
  }

  void _handleWatchAd() {
    setState(() => _isAdLoading = true);
    _adService.showRewardedAd(
      onSuccess: () {
        setState(() => _isAdLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ad reward verified on server!')),
        );
        _loadAd();
      },
      onError: (errorMsg) {
        setState(() => _isAdLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorMsg)),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return const Scaffold(
        body: Center(child: Text('Login Required')),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      body: SafeArea(
        child: StreamBuilder<DocumentSnapshot>(
          stream: FirebaseFirestore.instance.collection('users').doc(user.uid).snapshots(),
          builder: (context, userSnapshot) {
            if (!userSnapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }

            final userData = UserModel.fromFirestore(userSnapshot.data!);

            return StreamBuilder<MiningSessionModel?>(
              stream: _miningService.streamActiveSession(user.uid),
              builder: (context, miningSnapshot) {
                final miningSession = miningSnapshot.data;
                final bool isMiningActive = miningSession?.isActive ?? false;
                final double currentRate = miningSession?.totalRate ?? 0.4;

                String formattedTime = '00:00:00';
                if (isMiningActive && miningSession != null) {
                  final duration = miningSession.remainingTime;
                  formattedTime =
                      '${duration.inHours.toString().padLeft(2, '0')}:${(duration.inMinutes % 60).toString().padLeft(2, '0')}:${(duration.inSeconds % 60).toString().padLeft(2, '0')}';
                }

                return SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  child: Column(
                    children: [
                      HeaderWidget(
                        onNotificationTap: () {},
                      ),
                      BalanceCard(
                        fanBalance: userData.fanBalance,
                        usdEquivalent: userData.fanBalance * 0.0, // Configurable rate
                      ),
                      MiningCard(
                        isMiningActive: isMiningActive,
                        currentRate: currentRate,
                        sessionTimeRemaining: formattedTime,
                        onStartMining: () async {
                          try {
                            await _miningService.startMiningSession();
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(e.toString())),
                              );
                            }
                          }
                        },
                      ),
                      AdsCard(
                        adsWatchedToday: 0, // Server stream value
                        currentBoost: 0.0,
                        isLoading: _isAdLoading,
                        onWatchAd: _handleWatchAd,
                      ),
                      DailyTaskCard(
                        onSocialTap: () {},
                        onFollowAndEarn: () async {
                          try {
                            await _taskService.openSocialPlatform('https://x.com');
                            await _taskService.verifyAndClaimSocialTask('daily_social_task');
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(e.toString())),
                              );
                            }
                          }
                        },
                      ),
                      KycCard(
                        currentKycLevel: userData.kycLevel,
                        onCompleteKyc: () {},
                      ),
                      const SizedBox(height: 20),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
