package com.januaryai.reactnative

import android.content.pm.ApplicationInfo
import ai.january.partner.JanuaryClientToken
import ai.january.partner.JanuaryException
import ai.january.partner.JanuaryPartnerClient
import ai.january.partner.JanuaryPartnerUserClient
import ai.january.partner.JanuaryTokenProvider
import ai.january.partner.JanuaryTokenProviderException
import ai.january.partner.FoodId
import ai.january.partner.PartnerUserId
import ai.january.partner.foods.AutocompleteFoodCategory
import ai.january.partner.foods.AutocompleteFoodsRequest
import ai.january.partner.foods.AutocompleteFoodsResponse
import ai.january.partner.foods.DietPreference
import ai.january.partner.foods.DietRestriction
import ai.january.partner.foods.FoodCategory
import ai.january.partner.foods.FoodSuggestion
import ai.january.partner.foods.FoodSearchItem
import ai.january.partner.foods.FoodSearchResults
import ai.january.partner.foods.GetFoodRequest
import ai.january.partner.foods.LookupFoodByBarcodeRequest
import ai.january.partner.foods.SearchFoodsRequest
import ai.january.partner.foods.SearchFoodsByNaturalLanguageRequest
import ai.january.partner.foods.SuggestFoodAlternativesRequest
import ai.january.partner.foods.SuggestFoodAlternativesResponse
import ai.january.partner.foodlogs.FoodLog
import ai.january.partner.foodlogs.ListFoodLogsResponse
import ai.january.partner.foods.DetectedFood
import ai.january.partner.foods.AlternativeFood
import ai.january.partner.foods.ServingSummary
import ai.january.partner.foodlogs.FoodLogSummary
import ai.january.partner.foodlogs.FoodLogSummaryGrouping
import ai.january.partner.foodlogs.WeekStart
import ai.january.partner.photos.AnalysisEffort
import ai.january.partner.glucose.ActivityLevel
import ai.january.partner.glucose.GlucosePrediction
import ai.january.partner.glucose.GlucosePredictionProfile
import ai.january.partner.glucose.Height
import ai.january.partner.glucose.HeightUnit
import ai.january.partner.glucose.MedicalCondition
import ai.january.partner.glucose.PredictGlucoseRequest
import ai.january.partner.glucose.Sex
import ai.january.partner.glucose.Weight
import ai.january.partner.glucose.WeightUnit
import ai.january.partner.models.CompleteScanNutritionFacts
import ai.january.partner.models.FoodSelection
import ai.january.partner.models.NutrientAmount
import ai.january.partner.models.NutritionFacts
import ai.january.partner.models.ServingSelection
import ai.january.partner.photos.CorrectPhotoScanRequest
import ai.january.partner.photos.FoodDetection
import ai.january.partner.photos.FoodScan
import ai.january.partner.photos.ScanFoodPhotoRequest
import ai.january.partner.restaurants.GetRestaurantMenuItemsRequest
import ai.january.partner.restaurants.GetRestaurantMenuItemsResponse
import ai.january.partner.restaurants.Restaurant
import ai.january.partner.restaurants.RestaurantMenuEntry
import ai.january.partner.restaurants.RestaurantMenuItem
import ai.january.partner.restaurants.SearchRestaurantMenuItemsResponse
import ai.january.partner.restaurants.SearchRestaurantsRequest
import ai.january.partner.restaurants.SearchRestaurantsResponse
import ai.january.partner.waterlogs.DailyWaterTotal
import ai.january.partner.waterlogs.ListWaterLogsResponse
import ai.january.partner.waterlogs.Volume
import ai.january.partner.waterlogs.VolumeUnit
import ai.january.partner.waterlogs.WaterAmount
import ai.january.partner.waterlogs.WaterLog
import ai.january.partner.weightlogs.DailyWeight
import ai.january.partner.weightlogs.ListWeightLogsResponse
import ai.january.partner.weightlogs.WeightLog
import ai.january.partner.voice.VoiceCaptureErrorCode
import ai.january.partner.voice.VoiceCaptureException
import ai.january.partner.voice.VoiceCaptureResult
import ai.january.partner.voice.VoiceCaptureSession
import ai.january.partner.voice.VoiceCaptureState
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.UiThreadUtil
import java.util.Locale
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.merge
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.withTimeout
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import java.util.UUID
import java.time.OffsetDateTime
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

class JanuaryReactNativeModule(reactContext: ReactApplicationContext) :
  NativeJanuaryReactNativeSpec(reactContext) {

  private data class PendingTokenRequest(
    val clientId: String,
    val deferred: CompletableDeferred<JanuaryClientToken>,
  )

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
  private val mainScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private val clients = ConcurrentHashMap<String, JanuaryPartnerUserClient>()
  private val voiceSessions = HashMap<String, VoiceHolder>()

  private class VoiceHolder(val session: VoiceCaptureSession) {
    /** Collects the recognizer's flows for exactly one capture; replaced on every start(). */
    var collector: Job? = null
    var pendingStop: Job? = null
  }
  private data class VoiceSnapshot(
    val state: VoiceCaptureState,
    val level: Float,
    val partial: String,
    val error: VoiceCaptureException?,
    val result: VoiceCaptureResult?,
  )
  private val pendingTokenRequests = ConcurrentHashMap<String, PendingTokenRequest>()

  override fun getNativeModuleVersion(): String {
    return "0.3.0"
  }

  override fun configureClient(clientId: String, endUserId: String, timezone: String?): String? =
    try {
      val client = JanuaryPartnerClient.withClientTokenProvider(
        JanuaryTokenProvider { requestToken(clientId, endUserId) },
      ).forUser(PartnerUserId(endUserId), timezone)
      clients[clientId] = client
      null
    } catch (error: Exception) {
      error.message ?: "The January client could not be configured."
    }

  @Suppress("DEPRECATION")
  override fun configureDevelopmentClient(
    clientId: String,
    apiKey: String,
    endUserId: String,
    timezone: String?,
  ): String? = try {
    val isDebuggable =
      reactApplicationContext.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
    if (!isDebuggable) {
      "Development API-key authentication is available in debug builds only."
    } else {
      clients[clientId] = JanuaryPartnerClient(apiKey)
        .forUser(PartnerUserId(endUserId), timezone)
      null
    }
  } catch (error: Exception) {
    error.message ?: "The January development client could not be configured."
  }

  override fun disposeClient(clientId: String) {
    clients.remove(clientId)
    pendingTokenRequests.entries.removeAll { (_, request) ->
      if (request.clientId == clientId) {
        request.deferred.cancel(CancellationException("The January client was disposed."))
        true
      } else {
        false
      }
    }
  }

  override fun resolveTokenRequest(requestId: String, token: String, expiresIn: Double) {
    pendingTokenRequests.remove(requestId)?.deferred?.complete(
      JanuaryClientToken(token, expiresIn.toLong()),
    )
  }

  override fun rejectTokenRequest(requestId: String, message: String, retryable: Boolean) {
    pendingTokenRequests.remove(requestId)?.deferred?.completeExceptionally(
      JanuaryTokenProviderException(message, retryable),
    )
  }

  override fun foodsSearch(
    clientId: String,
    query: String,
    category: String?,
    limit: Double,
    promise: Promise,
  ) {
    val client = clients[clientId]
    if (client == null) {
      promise.reject("bridge_error", "The January client is not configured.")
      return
    }

    scope.launch {
      try {
        val parsedCategory = category?.let { FoodCategory.valueOf(it.uppercase()) }
        val result = client.foods.search(
          SearchFoodsRequest(query, parsedCategory, limit.toInt()),
        )
        promise.resolve(result.toJsonObject().toString())
      } catch (error: Exception) {
        val januaryError = error as? JanuaryException
        promise.reject(
          januaryError?.code ?: januaryError?.category?.name?.lowercase() ?: "january_error",
          error.message,
          error,
        )
      }
    }
  }

  override fun foodAnalysisAnalyzePhoto(
    clientId: String,
    image: String,
    reasoningEffort: String?,
    promise: Promise,
  ) {
    withClient(clientId, promise) { client ->
      val effort = when (reasoningEffort) {
        "xhigh" -> AnalysisEffort.XHIGH
        "none" -> AnalysisEffort.NONE
        else -> null
      }
      client.foodAnalysis.analyzePhoto(ScanFoodPhotoRequest(image, reasoningEffort = effort)).toJsonObject()
    }
  }

  override fun foodsAutocomplete(
    clientId: String,
    query: String,
    category: String?,
    limit: Double,
    promise: Promise,
  ) {
    withClient(clientId, promise) { client ->
      val parsedCategory = category?.let { AutocompleteFoodCategory.valueOf(it.uppercase()) }
      client.foods.autocomplete(
        AutocompleteFoodsRequest(query, parsedCategory, limit.toInt()),
      ).toJsonObject()
    }
  }

  override fun foodsGet(clientId: String, foodId: String, promise: Promise) {
    withClient(clientId, promise) { client ->
      client.foods.get(GetFoodRequest(FoodId(foodId))).toJsonObject()
    }
  }

  override fun foodsLookupBarcode(clientId: String, upc: String, promise: Promise) {
    withClient(clientId, promise) { client ->
      client.foods.lookupBarcode(LookupFoodByBarcodeRequest(upc)).toJsonObject()
    }
  }

  override fun foodsSuggestAlternatives(
    clientId: String,
    foodId: String,
    dietRestrictionsJson: String,
    dietPreferencesJson: String,
    promise: Promise,
  ) {
    withClient(clientId, promise) { client ->
      val restrictions = JSONArray(dietRestrictionsJson).strings().map { value ->
        DietRestriction.entries.first { it.value == value }
      }
      val preferences = JSONArray(dietPreferencesJson).strings().map { value ->
        DietPreference.entries.first { it.value == value }
      }
      client.foods.suggestAlternatives(
        SuggestFoodAlternativesRequest(foodId, restrictions, preferences),
      ).toJsonObject()
    }
  }

  override fun foodAnalysisAnalyzeDescription(
    clientId: String,
    query: String,
    promise: Promise,
  ) {
    withClient(clientId, promise) { client ->
      client.foodAnalysis.analyzeDescription(
        SearchFoodsByNaturalLanguageRequest(query),
      ).toJsonObject()
    }
  }

  override fun restaurantsSearch(
    clientId: String,
    query: String,
    latitude: Double,
    longitude: Double,
    radius: Double,
    limit: Double,
    promise: Promise,
  ) {
    withClient(clientId, promise) { client ->
      client.restaurants.search(
        SearchRestaurantsRequest(query, latitude, longitude, radius, limit.toInt()),
      ).toJsonObject()
    }
  }

  override fun restaurantMenuItemsSearch(
    clientId: String,
    query: String,
    latitude: Double,
    longitude: Double,
    radius: Double,
    limit: Double,
    promise: Promise,
  ) {
    withClient(clientId, promise) { client ->
      client.restaurants.searchMenuItems(
        SearchRestaurantsRequest(query, latitude, longitude, radius, limit.toInt()),
      ).toJsonObject()
    }
  }

  override fun restaurantMenuItems(
    clientId: String,
    restaurantId: String,
    limit: Double,
    offset: Double,
    promise: Promise,
  ) {
    withClient(clientId, promise) { client ->
      client.restaurants.getMenuItems(
        GetRestaurantMenuItemsRequest(restaurantId, limit.toInt(), offset.toInt()),
      ).toJsonObject()
    }
  }

  override fun foodAnalysisCorrect(
    clientId: String,
    analysisJson: String,
    instruction: String,
    promise: Promise,
  ) {
    withClient(clientId, promise) { client ->
      client.foodAnalysis.correct(
        CorrectPhotoScanRequest(parseFoodScan(JSONObject(analysisJson)), instruction),
      ).toJsonObject()
    }
  }

  override fun foodLogsList(clientId: String, start: String, end: String, promise: Promise) {
    withClient(clientId, promise) { client ->
      client.foodLogs.list(start, end).toJsonObject()
    }
  }

  override fun foodLogsGetSummary(
    clientId: String,
    start: String,
    end: String,
    groupBy: String,
    weekStart: String,
    promise: Promise,
  ) {
    withClient(clientId, promise) { client ->
      client.foodLogs.getSummary(
        start,
        end,
        if (groupBy == "week") FoodLogSummaryGrouping.WEEK else FoodLogSummaryGrouping.DAY,
        if (weekStart == "sunday") WeekStart.SUNDAY else WeekStart.MONDAY,
      ).toJsonObject()
    }
  }

  override fun foodLogsCreate(
    clientId: String,
    foodsJson: String,
    timestampUtc: String?,
    name: String?,
    promise: Promise,
  ) {
    withClient(clientId, promise) { client ->
      client.foodLogs.create(parseFoodSelections(foodsJson), timestampUtc, name).toJsonObject()
    }
  }

  override fun foodLogsUpdate(
    clientId: String,
    id: String,
    foodsJson: String?,
    timestampUtc: String?,
    name: String?,
    promise: Promise,
  ) {
    withClient(clientId, promise) { client ->
      client.foodLogs.update(
        id,
        foodsJson?.let(::parseFoodSelections),
        timestampUtc,
        name,
      ).toJsonObject()
    }
  }

  override fun foodLogsDelete(clientId: String, id: String, promise: Promise) {
    withClient(clientId, promise) { client ->
      client.foodLogs.delete(id)
      JSONObject()
    }
  }

  override fun waterLogsCreate(
    clientId: String,
    value: Double,
    unit: String,
    consumedAt: String?,
    promise: Promise,
  ) {
    val volumeUnit = VolumeUnit.fromValue(unit)
    if (volumeUnit == null) {
      promise.reject("bridge_error", "unit must be fl_oz, ml, or cup.")
      return
    }
    withClient(clientId, promise) { client ->
      client.waterLogs.create(WaterAmount(value, volumeUnit), consumedAt).toJsonObject()
    }
  }

  override fun waterLogsList(clientId: String, start: String, end: String, unit: String, promise: Promise) {
    val volumeUnit = VolumeUnit.fromValue(unit)
    if (volumeUnit == null) {
      promise.reject("bridge_error", "unit must be fl_oz, ml, or cup.")
      return
    }
    withClient(clientId, promise) { client ->
      client.waterLogs.list(start, end, volumeUnit).toJsonObject()
    }
  }

  override fun waterLogsDelete(clientId: String, id: String, promise: Promise) {
    withClient(clientId, promise) { client ->
      client.waterLogs.delete(id)
      JSONObject()
    }
  }

  override fun weightLogsCreate(
    clientId: String,
    value: Double,
    unit: String,
    measuredAt: String?,
    promise: Promise,
  ) {
    val weightUnit = WeightUnit.entries.firstOrNull { it.value == unit }
    if (weightUnit == null) {
      promise.reject("bridge_error", "unit must be lb or kg.")
      return
    }
    withClient(clientId, promise) { client ->
      client.weightLogs.create(Weight(value, weightUnit), measuredAt).toJsonObject()
    }
  }

  override fun weightLogsList(clientId: String, start: String, end: String, promise: Promise) {
    withClient(clientId, promise) { client ->
      client.weightLogs.list(start, end).toJsonObject()
    }
  }

  override fun glucosePredict(clientId: String, requestJson: String, promise: Promise) {
    withClient(clientId, promise) { client ->
      client.glucose.predict(parseGlucoseRequest(JSONObject(requestJson))).toJsonObject()
    }
  }

  // ——— Voice capture ————————————————————————————————————————————————————————

  // Android's recognizer availability is device-wide; the locale is chosen per session.
  override fun voiceCaptureIsSupported(locale: String?): Boolean =
    SpeechRecognizer.isRecognitionAvailable(reactApplicationContext)

  override fun voiceCaptureStart(sessionId: String, locale: String?, captureId: String, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val existing = voiceSessions[sessionId]
      val holder = existing ?: createVoiceSession(sessionId, locale)
      try {
        holder.session.clearResult()
        holder.session.clearError()
        // A fresh collector per capture: every update it emits is stamped with this
        // capture's id as a constant, so nothing collected for an earlier capture can be
        // delivered under a newer id.
        holder.collector?.cancel()
        holder.collector = collectVoiceUpdates(sessionId, captureId, holder.session)
        holder.session.startListening()
        promise.resolve("{}")
      } catch (error: Exception) {
        holder.collector?.cancel()
        holder.collector = null
        if (existing == null) {
          // Capture never started: do not keep the session alive for it.
          voiceSessions.remove(sessionId)
          holder.session.close()
        }
        rejectVoice(promise, error)
      }
    }
  }

  override fun voiceCaptureStop(sessionId: String, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val holder = voiceSessions[sessionId]
      if (holder == null) {
        promise.reject("invalid_state", "Voice capture is not recording.")
        return@runOnUiThread
      }
      val session = holder.session
      try {
        if (session.state.value == VoiceCaptureState.LISTENING) session.stopListening()
      } catch (error: Exception) {
        rejectVoice(promise, error)
        return@runOnUiThread
      }
      holder.pendingStop?.cancel()
      holder.pendingStop = mainScope.launch {
        try {
          val outcome = withTimeout(20_000) {
            merge(
              session.latestResult.filterNotNull().map { result -> Result.success(result) },
              session.error.filterNotNull().map { error -> Result.failure(error) },
            ).first()
          }
          outcome.fold(
            onSuccess = { result ->
              session.clearResult()
              promise.resolve(
                JSONObject()
                  .put("transcript", result.transcript)
                  .put("durationMillis", result.durationMillis)
                  .put("durationMs", result.durationMillis)
                  .toString(),
              )
            },
            onFailure = { error ->
              session.clearError()
              rejectVoice(promise, error)
            },
          )
        } catch (error: Exception) {
          if (error !is CancellationException || error is TimeoutCancellationException) session.cancel()
          rejectVoice(promise, error)
        } finally {
          if (holder.pendingStop?.isActive != true) holder.pendingStop = null
        }
      }
    }
  }

  override fun voiceCaptureCancel(sessionId: String) {
    UiThreadUtil.runOnUiThread {
      voiceSessions[sessionId]?.let { holder ->
        holder.pendingStop?.cancel()
        holder.pendingStop = null
        holder.session.cancel()
      }
    }
  }

  override fun voiceCaptureDispose(sessionId: String) {
    UiThreadUtil.runOnUiThread {
      voiceSessions.remove(sessionId)?.let { holder ->
        holder.pendingStop?.cancel()
        holder.collector?.cancel()
        holder.session.cancel()
        holder.session.close()
      }
    }
  }

  private fun createVoiceSession(sessionId: String, locale: String?): VoiceHolder {
    val session = VoiceCaptureSession(
      reactApplicationContext,
      locale?.takeIf { it.isNotBlank() }?.let(Locale::forLanguageTag) ?: Locale.getDefault(),
    )
    return VoiceHolder(session).also { voiceSessions[sessionId] = it }
  }

  private fun collectVoiceUpdates(sessionId: String, captureId: String, session: VoiceCaptureSession): Job {
    val collector = mainScope.launch {
      combine(session.state, session.audioLevel, session.partialTranscript, session.error, session.latestResult) { state, level, partial, error, result ->
        VoiceSnapshot(state, level, partial, error, result)
      }.collect { snapshot ->
        // StateFlows replay their current values, so the collector starts with an IDLE snapshot
        // before startListening() has run. A plain idle carries nothing JavaScript needs (it
        // publishes idle itself when stop() or cancel() settles) and would reset an active start.
        if (snapshot.state == VoiceCaptureState.IDLE && snapshot.error == null && snapshot.result == null) return@collect
        emitVoiceUpdate(
          sessionId,
          captureId,
          snapshot.state,
          snapshot.level,
          snapshot.partial,
          snapshot.result?.durationMillis ?: session.elapsedDurationMillis,
          snapshot.error,
          // The recognizer can finalize on its own (silence, "stop" not yet called); forward
          // that transcript so JavaScript does not wait for a stop() that never resolves it.
          snapshot.result?.takeIf { snapshot.state == VoiceCaptureState.IDLE }?.transcript,
        )
      }
    }
    val ticker = mainScope.launch {
      while (true) {
        delay(250)
        if (session.state.value == VoiceCaptureState.LISTENING) {
          emitVoiceUpdate(
            sessionId,
            captureId,
            session.state.value,
            session.audioLevel.value,
            session.partialTranscript.value,
            session.elapsedDurationMillis,
          )
        }
      }
    }
    collector.invokeOnCompletion { ticker.cancel() }
    return collector
  }

  private fun emitVoiceUpdate(
    sessionId: String,
    captureId: String,
    state: VoiceCaptureState,
    level: Float,
    partial: String,
    durationMillis: Long,
    error: VoiceCaptureException? = null,
    transcript: String? = null,
  ) {
    val event = Arguments.createMap().apply {
      if (transcript != null) putString("transcript", transcript) else putNull("transcript")
      if (error != null) {
        putString("errorCode", voiceCode(error))
        putString("errorMessage", error.message ?: "Voice capture failed.")
      } else {
        putNull("errorCode")
        putNull("errorMessage")
      }
      putString("sessionId", sessionId)
      putString("captureId", captureId)
      putString(
        "state",
        when (state) {
          VoiceCaptureState.IDLE -> "idle"
          VoiceCaptureState.LISTENING -> "recording"
          VoiceCaptureState.PROCESSING -> "processing"
        },
      )
      putDouble("audioLevel", level.toDouble())
      putDouble("durationMs", durationMillis.toDouble())
      putString("partialTranscript", partial)
    }
    reactApplicationContext.runOnJSQueueThread { emitOnVoiceCaptureUpdate(event) }
  }

  private fun rejectVoice(promise: Promise, error: Throwable) {
    promise.reject(voiceCode(error), error.message ?: "Voice capture failed.", error)
  }

  private fun voiceCode(error: Throwable): String {
    if (error is TimeoutCancellationException) return "transcription_failed"
    if (error is CancellationException) return "cancelled"
    return when ((error as? VoiceCaptureException)?.code) {
      VoiceCaptureErrorCode.PERMISSION_DENIED -> "permission_denied"
      VoiceCaptureErrorCode.RECOGNIZER_UNAVAILABLE, VoiceCaptureErrorCode.RECOGNIZER_BUSY -> "recognizer_unavailable"
      VoiceCaptureErrorCode.AUDIO -> "recording_failed"
      VoiceCaptureErrorCode.NETWORK -> "transcription_failed"
      VoiceCaptureErrorCode.NO_MATCH -> "no_match"
      VoiceCaptureErrorCode.INVALID_STATE -> "invalid_state"
      VoiceCaptureErrorCode.UNKNOWN -> "unknown"
      null -> "unknown"
    }
  }

  override fun invalidate() {
    UiThreadUtil.runOnUiThread {
      voiceSessions.values.forEach { holder ->
        holder.collector?.cancel()
        holder.session.cancel()
        holder.session.close()
      }
      voiceSessions.clear()
    }
    mainScope.cancel()
    clients.clear()
    pendingTokenRequests.values.forEach { it.deferred.cancel() }
    pendingTokenRequests.clear()
    scope.cancel()
    super.invalidate()
  }

  private suspend fun requestToken(clientId: String, endUserId: String): JanuaryClientToken {
    val requestId = UUID.randomUUID().toString()
    val deferred = CompletableDeferred<JanuaryClientToken>()
    pendingTokenRequests[requestId] = PendingTokenRequest(clientId, deferred)

    val event = Arguments.createMap().apply {
      putString("clientId", clientId)
      putString("endUserId", endUserId)
      putString("requestId", requestId)
    }
    reactApplicationContext.runOnJSQueueThread { emitOnTokenRequested(event) }
    return deferred.await()
  }

  private fun withClient(
    clientId: String,
    promise: Promise,
    operation: suspend (JanuaryPartnerUserClient) -> JSONObject,
  ) {
    val client = clients[clientId]
    if (client == null) {
      promise.reject("bridge_error", "The January client is not configured.")
      return
    }
    scope.launch {
      try {
        promise.resolve(operation(client).toString())
      } catch (error: Exception) {
        val januaryError = error as? JanuaryException
        promise.reject(
          januaryError?.code ?: januaryError?.category?.name?.lowercase() ?: "january_error",
          error.message,
          error,
        )
      }
    }
  }

  private fun FoodSearchResults.toJsonObject(): JSONObject = JSONObject()
    .put("totalCount", totalCount)
    .put("items", JSONArray(items.map { it.toJsonObject() }))

  private fun AutocompleteFoodsResponse.toJsonObject(): JSONObject = JSONObject()
    .put("items", JSONArray(items.map { it.toJsonObject() }))

  private fun FoodSuggestion.toJsonObject(): JSONObject = JSONObject()
    .put("id", id.value)
    .putNullable("name", name)
    .putNullable("brandName", brandName)
    .putNullable("imageURL", imageUrl)
    .putNullable("nutrients", nutrients?.toJsonObject())

  private fun SuggestFoodAlternativesResponse.toJsonObject(): JSONObject = JSONObject()
    .put("alternatives", JSONArray(alternatives.map { it.toJsonObject() }))

  private fun AlternativeFood.toJsonObject(): JSONObject = JSONObject()
    .putNullable("id", id)
    .putNullable("name", name)
    .putNullable("brandName", brandName)
    .put("nutrients", nutrients.toJsonObject())
    .put("servings", JSONArray(servings.map { it.toJsonObject() }))

  private fun ServingSummary.toJsonObject(): JSONObject = JSONObject()
    .putNullable("id", id)
    .putNullable("quantity", quantity)
    .putNullable("unit", unit)

  private fun DetectedFood.toJsonObject(): JSONObject = JSONObject()
    .putNullable("id", id)
    .putNullable("name", name)
    .putNullable("brandName", brandName)
    .put("nutrients", nutrients.toJsonObject())
    .put("serving", serving.toJsonObject())
    .putNullable("quantity", quantity)

  private fun FoodSearchItem.toJsonObject(): JSONObject = JSONObject()
    .put("id", id.value)
    .put("type", type.name.lowercase())
    .putNullable("name", name)
    .putNullable("brandName", brandName)
    .putNullable("nutrients", nutrients?.toJsonObject())
    .putNullable("calories", calories)
    .putNullable("protein", protein)
    .putNullable("carbohydrates", carbohydrates)
    .putNullable("netCarbohydrates", netCarbohydrates)
    .putNullable("totalFat", totalFat)
    .putNullable("saturatedFat", saturatedFat)
    .putNullable("fiber", fiber)
    .putNullable("totalSugars", totalSugars)
    .putNullable("addedSugars", addedSugars)
    .putNullable("sodium", sodium)
    .putNullable("potassium", potassium)
    .putNullable("cholesterol", cholesterol)
    .putNullable("glycemicIndex", glycemicIndex)
    .putNullable("glycemicLoad", glycemicLoad)
    .putNullable("photoURL", photoUrl)
    .putNullable("barcode", barcode)
    .put("servings", JSONArray(servings.map { serving ->
      JSONObject()
        .putNullable("id", serving.id?.value)
        .putNullable("quantity", serving.quantity)
        .putNullable("unit", serving.unit)
        .put("scalingFactor", serving.scalingFactor)
        .putNullable("weightGrams", serving.weightGrams)
        .putNullable("isPrimary", serving.isPrimary)
    }))

  private fun SearchRestaurantsResponse.toJsonObject(): JSONObject = JSONObject()
    .put("totalCount", totalCount)
    .put("items", JSONArray(items.map { it.toJsonObject() }))

  private fun Restaurant.toJsonObject(): JSONObject = JSONObject()
    .put("type", type.name.lowercase())
    .put("id", id)
    .putNullable("name", name)
    .putNullable("isChain", isChain)
    .putNullable("distance", distance)
    .putNullable("city", city)
    .putNullable("address1", address1)
    .putNullable("address2", address2)

  private fun SearchRestaurantMenuItemsResponse.toJsonObject(): JSONObject = JSONObject()
    .put("totalCount", totalCount)
    .put("items", JSONArray(items.map { it.toJsonObject() }))

  private fun RestaurantMenuItem.toJsonObject(): JSONObject = JSONObject()
    .put("type", type)
    .put("id", id)
    .putNullable("name", name)
    .putNullable("restaurantName", restaurantName)
    .putNullable("isChain", isChain)
    .putNullable("calories", calories)
    .putNullable("protein", protein)
    .putNullable("carbohydrates", carbohydrates)
    .putNullable("netCarbohydrates", netCarbohydrates)
    .putNullable("totalFat", totalFat)
    .putNullable("fiber", fiber)
    .putNullable("totalSugars", totalSugars)
    .putNullable("addedSugars", addedSugars)
    .putNullable("glycemicIndex", glycemicIndex)
    .putNullable("glycemicLoad", glycemicLoad)
    .putNullable("photoURL", photoUrl)
    .putNullable("distance", distance)
    .put("servings", servings.toJsonArray())

  private fun GetRestaurantMenuItemsResponse.toJsonObject(): JSONObject = JSONObject()
    .put("items", JSONArray(items.map { it.toJsonObject() }))

  private fun RestaurantMenuEntry.toJsonObject(): JSONObject = JSONObject()
    .putNullable("id", id)
    .putNullable("name", name)
    .putNullable("calories", calories)
    .putNullable("protein", protein)
    .putNullable("carbohydrates", carbohydrates)
    .putNullable("netCarbohydrates", netCarbohydrates)
    .putNullable("totalFat", totalFat)
    .putNullable("fiber", fiber)
    .putNullable("totalSugars", totalSugars)
    .putNullable("addedSugars", addedSugars)
    .putNullable("glycemicIndex", glycemicIndex)
    .putNullable("glycemicLoad", glycemicLoad)
    .put("servings", servings.toJsonArray())

  private fun List<ai.january.partner.foods.ServingOption>.toJsonArray(): JSONArray =
    JSONArray(map { serving ->
      JSONObject()
        .putNullable("id", serving.id?.value)
        .putNullable("quantity", serving.quantity)
        .putNullable("unit", serving.unit)
        .put("scalingFactor", serving.scalingFactor)
        .putNullable("weightGrams", serving.weightGrams)
        .putNullable("isPrimary", serving.isPrimary)
    })

  private fun NutritionFacts.toJsonObject(): JSONObject = JSONObject()
    .putNullable("calories", calories?.toJsonObject())
    .putNullable("protein", protein?.toJsonObject())
    .putNullable("carbohydrates", carbohydrates?.toJsonObject())
    .putNullable("netCarbohydrates", netCarbohydrates?.toJsonObject())
    .putNullable("totalFat", totalFat?.toJsonObject())
    .putNullable("transFat", transFat?.toJsonObject())
    .putNullable("saturatedFat", saturatedFat?.toJsonObject())
    .putNullable("fiber", fiber?.toJsonObject())
    .putNullable("totalSugars", totalSugars?.toJsonObject())
    .putNullable("addedSugars", addedSugars?.toJsonObject())
    .putNullable("cholesterol", cholesterol?.toJsonObject())
    .putNullable("calcium", calcium?.toJsonObject())
    .putNullable("iron", iron?.toJsonObject())
    .putNullable("potassium", potassium?.toJsonObject())
    .putNullable("sodium", sodium?.toJsonObject())
    .putNullable("vitaminD", vitaminD?.toJsonObject())

  private fun NutrientAmount.toJsonObject(): JSONObject = JSONObject()
    .put("value", value)
    .put("unit", unit)

  private fun CompleteScanNutritionFacts.toJsonObject(): JSONObject = JSONObject()
    .putNullable("calories", calories?.toJsonObject())
    .putNullable("protein", protein?.toJsonObject())
    .putNullable("carbohydrates", carbohydrates?.toJsonObject())
    .putNullable("netCarbohydrates", netCarbohydrates?.toJsonObject())
    .putNullable("totalFat", totalFat?.toJsonObject())
    .putNullable("saturatedFat", saturatedFat?.toJsonObject())
    .putNullable("fiber", fiber?.toJsonObject())
    .putNullable("totalSugars", totalSugars?.toJsonObject())
    .putNullable("addedSugars", addedSugars?.toJsonObject())
    .putNullable("sodium", sodium?.toJsonObject())

  private fun FoodScan.toJsonObject(): JSONObject = JSONObject()
    .putNullable("mealName", mealName)
    .put("totalNutrients", totalNutrients.toJsonObject())
    .put("detections", JSONArray(detections.map { detection ->
      JSONObject()
        .putNullable("confidenceScore", detection.confidenceScore)
        .put("food", detection.food.toJsonObject())
    }))

  private fun FoodLogSummary.toJsonObject(): JSONObject = JSONObject()
    .put("groupBy", groupBy.name.lowercase())
    .apply { weekStart?.let { put("weekStart", it.name.lowercase()) } }
    .put("timezone", timezone)
    .put("startDate", startDate)
    .put("endDate", endDate)
    .put("buckets", JSONArray(buckets.map { bucket ->
      JSONObject()
        .put("startDate", bucket.startDate)
        .put("endDate", bucket.endDate)
        .put("logsCount", bucket.logsCount)
        .put("daysWithLogs", bucket.daysWithLogs)
        .put("nutrients", bucket.nutrients.toJsonObject())
    }))
    .put("totals", JSONObject()
      .put("logsCount", totals.logsCount)
      .put("daysWithLogs", totals.daysWithLogs)
      .put("nutrients", totals.nutrients.toJsonObject()))
    .put("averagePerLoggedDay", JSONObject().put("nutrients", averagePerLoggedDay.nutrients.toJsonObject()))

  private fun WaterAmount.toJsonObject(): JSONObject = JSONObject()
    .put("value", value)
    .put("unit", unit.value)

  private fun Volume.toJsonObject(): JSONObject = JSONObject()
    .put("value", value)
    .put("unit", unit.value)

  private fun WaterLog.toJsonObject(): JSONObject = JSONObject()
    .put("id", id)
    .put("amount", amount.toJsonObject())
    .put("consumedAt", consumedAt)

  private fun DailyWaterTotal.toJsonObject(): JSONObject = JSONObject()
    .put("date", date)
    .put("total", total.toJsonObject())

  private fun ListWaterLogsResponse.toJsonObject(): JSONObject = JSONObject()
    .put("items", JSONArray(items.map { it.toJsonObject() }))

  private fun Weight.toJsonObject(): JSONObject = JSONObject()
    .put("value", value)
    .put("unit", unit.value)

  private fun WeightLog.toJsonObject(): JSONObject = JSONObject()
    .put("weight", weight.toJsonObject())
    .put("measuredAt", measuredAt)

  private fun DailyWeight.toJsonObject(): JSONObject = JSONObject()
    .put("date", date)
    .put("weight", weight.toJsonObject())

  private fun ListWeightLogsResponse.toJsonObject(): JSONObject = JSONObject()
    .put("items", JSONArray(items.map { it.toJsonObject() }))

  private fun ListFoodLogsResponse.toJsonObject(): JSONObject = JSONObject()
    .put("totalCount", totalCount)
    .put("items", JSONArray(items.map { it.toJsonObject() }))

  private fun FoodLog.toJsonObject(): JSONObject = JSONObject()
    .putNullable("id", id)
    .putNullable("name", name)
    .put("timestampUTC", timestampUtc)
    .put("foods", JSONArray(foods.map { food ->
      JSONObject()
        .putNullable("id", food.id)
        .putNullable("name", food.name)
        .putNullable("brandName", food.brandName)
        .putNullable("imageURL", food.imageUrl)
        .putNullable("glycemicIndex", food.glycemicIndex)
        .putNullable("glycemicLoad", food.glycemicLoad)
        .put("nutrients", food.nutrients.toJsonObject())
        .put("consumedServing", JSONObject()
          .putNullable("id", food.consumedServing.id)
          .putNullable("quantity", food.consumedServing.quantity))
        .put("servingDetails", JSONObject()
          .putNullable("id", food.servingDetails.id)
          .putNullable("quantity", food.servingDetails.quantity)
          .putNullable("unit", food.servingDetails.unit)
          .putNullable("weightGrams", food.servingDetails.weightGrams))
    }))

  private fun GlucosePrediction.toJsonObject(): JSONObject = JSONObject()
    .putNullable("impact", impact?.value)
    .put("chart", JSONObject().putNullable("min", chart.min).putNullable("max", chart.max))
    .put("prediction", JSONArray(prediction.map { point ->
      JSONObject().put("minutes", point.minutes).put("value", point.value)
    }))

  private fun parseFoodSelections(json: String): List<FoodSelection> {
    val values = JSONArray(json)
    return (0 until values.length()).map { index ->
      val value = values.getJSONObject(index)
      val serving = value.getJSONObject("serving")
      FoodSelection(
        value.getString("id"),
        ServingSelection(serving.getString("id"), serving.getDouble("quantity")),
      )
    }
  }

  private fun parseGlucoseRequest(value: JSONObject): PredictGlucoseRequest {
    val profile = value.getJSONObject("userProfile")
    val height = profile.getJSONObject("height")
    val weight = profile.getJSONObject("weight")
    val conditions = profile.optJSONArray("healthConditions")?.let { values ->
      (0 until values.length()).map { index ->
        MedicalCondition.valueOf(values.getString(index).uppercase())
      }
    }
    return PredictGlucoseRequest(
      userProfile = GlucosePredictionProfile(
        age = profile.getDouble("age"),
        sex = Sex.valueOf(profile.getString("sex").uppercase()),
        height = Height(
          height.getDouble("value"),
          if (height.getString("unit") == "cm") HeightUnit.CENTIMETERS else HeightUnit.INCHES,
        ),
        weight = Weight(
          weight.getDouble("value"),
          if (weight.getString("unit") == "kg") WeightUnit.KILOGRAMS else WeightUnit.POUNDS,
        ),
        activityLevel = profile.nullableString("activityLevel")?.let {
          ActivityLevel.valueOf(it.uppercase())
        },
        healthConditions = conditions,
      ),
      foods = parseFoodSelections(value.getJSONArray("foods").toString()),
      startTime = OffsetDateTime.parse(value.getString("startTime")),
    )
  }

  private fun parseFoodScan(value: JSONObject): FoodScan {
    val detections = value.getJSONArray("detections")
    return FoodScan(
      mealName = value.nullableString("mealName"),
      totalNutrients = parseCompleteNutrition(value.getJSONObject("totalNutrients")),
      detections = (0 until detections.length()).map { index ->
        val detection = detections.getJSONObject(index)
        val food = detection.getJSONObject("food")
        val serving = food.optJSONObject("serving")
        FoodDetection(
          food = DetectedFood(
            id = food.nullableString("id"),
            name = food.nullableString("name"),
            brandName = food.nullableString("brandName"),
            nutrients = parseCompleteNutrition(food.getJSONObject("nutrients")),
            serving = ServingSummary(
              id = serving?.nullableString("id"),
              quantity = serving?.nullableDouble("quantity"),
              unit = serving?.nullableString("unit"),
            ),
            quantity = food.nullableDouble("quantity"),
          ),
          confidenceScore = detection.nullableString("confidenceScore"),
        )
      },
    )
  }

  private fun parseCompleteNutrition(value: JSONObject): CompleteScanNutritionFacts =
    CompleteScanNutritionFacts(
      calories = value.nutrient("calories"),
      protein = value.nutrient("protein"),
      carbohydrates = value.nutrient("carbohydrates"),
      netCarbohydrates = value.nutrient("netCarbohydrates"),
      totalFat = value.nutrient("totalFat"),
      saturatedFat = value.nutrient("saturatedFat"),
      fiber = value.nutrient("fiber"),
      totalSugars = value.nutrient("totalSugars"),
      addedSugars = value.nutrient("addedSugars"),
      sodium = value.nutrient("sodium"),
    )

  private fun JSONObject.nutrient(key: String): NutrientAmount? =
    optJSONObject(key)?.let { NutrientAmount(it.getDouble("value"), it.getString("unit")) }

  private fun JSONObject.nullableString(key: String): String? =
    if (isNull(key)) null else optString(key).takeIf(String::isNotBlank)

  private fun JSONObject.nullableDouble(key: String): Double? =
    if (isNull(key) || !has(key)) null else getDouble(key)

  private fun JSONObject.putNullable(key: String, value: Any?): JSONObject =
    put(key, value ?: JSONObject.NULL)

  private fun JSONArray.strings(): List<String> =
    (0 until length()).map(::getString)

  companion object {
    const val NAME = NativeJanuaryReactNativeSpec.NAME
  }
}
