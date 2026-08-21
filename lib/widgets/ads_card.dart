import 'package:flutter/material.dart';

class AdsCard extends StatelessWidget {
  final int adsWatchedToday;
  final int maxAds;
  final double currentBoost;
  final VoidCallback onWatchAd;
  final bool isLoading;

  const AdsCard({
    super.key,
    required this.adsWatchedToday,
    this.maxAds = 7,
    required this.currentBoost,
    required this.onWatchAd,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    double progress = adsWatchedToday / maxAds;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text('🚀 ', style: TextStyle(fontSize: 20)),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'BOOST BY WATCHING ADS',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E0A3C)),
                      ),
                      Text(
                        'Each ad adds +0.1 FAN/H',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ],
                  ),
                ],
              ),
              ElevatedButton.icon(
                onPressed: (adsWatchedToday >= maxAds || isLoading) ? null : onWatchAd,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2C1065),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                icon: const Icon(Icons.ondemand_video_rounded, color: Colors.white, size: 16),
                label: Text(
                  isLoading ? 'LOADING...' : 'WATCH AD',
                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Ads watched today: $adsWatchedToday / $maxAds',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF2C1065)),
              ),
              Text(
                '+${currentBoost.toStringAsFixed(1)} FAN/H',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF2C1065)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: const Color(0xFFE9D5FF),
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2C1065)),
            ),
          ),
        ],
      ),
    );
  }
}
