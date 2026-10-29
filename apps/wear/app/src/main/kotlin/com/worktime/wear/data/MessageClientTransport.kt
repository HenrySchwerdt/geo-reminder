package com.worktime.wear.data

import android.content.Context
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.tasks.await

/** Sends messages to every connected node (in practice the paired phone) with the Wearable `MessageClient`. */
class MessageClientTransport(context: Context) : PhoneTransport {
    private val nodeClient = Wearable.getNodeClient(context)
    private val messageClient = Wearable.getMessageClient(context)

    override suspend fun send(path: String, payload: ByteArray): Boolean = try {
        val nodes = nodeClient.connectedNodes.await()
        nodes.map { messageClient.sendMessage(it.id, path, payload).await() }.isNotEmpty()
    } catch (e: CancellationException) {
        throw e
    } catch (_: Exception) {
        false
    }
}
