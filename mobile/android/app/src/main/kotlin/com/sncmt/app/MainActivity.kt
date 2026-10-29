package com.sncmt.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        createNotificationChannel()
    }

    // Push notifications arrive on this channel (AndroidManifest: default_notification_channel_id),
    // so the phone's settings show "School updates" instead of "Miscellaneous". Creating it again
    // only updates its name.
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.channel_school_updates),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply { description = getString(R.string.channel_school_updates_description) }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    companion object {
        const val CHANNEL_ID = "school_updates"
    }
}
