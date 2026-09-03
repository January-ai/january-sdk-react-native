package com.januaryai.reactnative

import android.content.pm.ApplicationInfo
import ai.january.partner.JanuaryClientToken
import ai.january.partner.JanuaryException
import ai.january.partner.JanuaryPartnerClient
import ai.january.partner.JanuaryPartnerUserClient
import ai.january.partner.JanuaryTokenProvider
import ai.january.partner.JanuaryTokenProviderException
import ai.january.partner.PartnerUserId
import ai.january.partner.foods.FoodCategory
import ai.january.partner.foods.FoodSearchItem
import ai.january.partner.foods.FoodSearchResults
import ai.january.partner.foods.SearchFoodsRequest
import ai.january.partner.foodlogs.FoodLog
import ai.january.partner.foodlogs.ListFoodLogsResponse
import ai.january.partner.foods.DetectedFood
import ai.january.partner.foods.DetectedServing
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
  private val clients = ConcurrentHashMap<String, JanuaryPartnerUserClient>()
  private val pendingTokenRequests = ConcurrentHashMap<String, PendingTokenRequest>()

  override fun getNativeModuleVersion(): String {
    return "0.1.0"
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

  override fun foodAnalysisAnalyzePhoto(clientId: String, image: String, promise: Promise) {
    withClient(clientId, promise) { client ->
      client.foodAnalysis.analyzePhoto(ScanFoodPhotoRequest(image)).toJsonObject()
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

  override fun glucosePredict(clientId: String, requestJson: String, promise: Promise) {
    withClient(clientId, promise) { client ->
      client.glucose.predict(parseGlucoseRequest(JSONObject(requestJson))).toJsonObject()
    }
  }

  override fun invalidate() {
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
        .put("food", JSONObject()
          .putNullable("id", detection.food.id)
          .putNullable("name", detection.food.name)
          .putNullable("brandName", detection.food.brandName)
          .put("nutrients", detection.food.nutrients.toJsonObject())
          .put("servings", JSONArray(detection.food.servings.orEmpty().map { serving ->
            JSONObject()
              .putNullable("id", serving.id)
              .putNullable("quantity", serving.quantity)
              .putNullable("unit", serving.unit)
              .putNullable("selectedQuantity", serving.selectedQuantity)
          })))
    }))

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
        val servings = food.optJSONArray("servings")
        FoodDetection(
          food = DetectedFood(
            id = food.nullableString("id"),
            name = food.nullableString("name"),
            brandName = food.nullableString("brandName"),
            nutrients = parseCompleteNutrition(food.getJSONObject("nutrients")),
            servings = servings?.let { values ->
              (0 until values.length()).map { servingIndex ->
                val serving = values.getJSONObject(servingIndex)
                DetectedServing(
                  id = serving.nullableString("id"),
                  quantity = serving.nullableDouble("quantity"),
                  unit = serving.nullableString("unit"),
                  selectedQuantity = serving.nullableDouble("selectedQuantity"),
                )
              }
            },
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

  companion object {
    const val NAME = NativeJanuaryReactNativeSpec.NAME
  }
}
