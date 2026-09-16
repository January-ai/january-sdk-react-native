import Combine
import Foundation
import January
import Speech

@objc(JanuaryNativeBridge)
public final class JanuaryNativeBridge: NSObject, @unchecked Sendable {
    @objc public var tokenRequestHandler: ((NSDictionary) -> Void)?
    @objc public var voiceUpdateHandler: ((NSDictionary) -> Void)?

    private final class VoiceHolder {
        let session: VoiceCaptureSession
        /// Subscriptions for exactly one capture; replaced on every start() so each update is
        /// stamped with its own capture's id as a constant.
        var cancellables: Set<AnyCancellable> = []
        init(session: VoiceCaptureSession) { self.session = session }
    }

    private var voiceSessions: [String: VoiceHolder] = [:]

    private struct PendingRequest {
        let clientID: String
        let continuation: CheckedContinuation<JanuaryClientToken, Error>
    }

    private let lock = NSLock()
    private var clients: [String: JanuaryClient] = [:]
    private var pendingRequests: [String: PendingRequest] = [:]

    @objc(configureClient:endUserId:timezone:)
    public func configureClient(
        _ clientID: String,
        endUserID: String,
        timezoneIdentifier: String?
    ) -> String? {
        let timezone: TimeZone?
        if let timezoneIdentifier {
            guard let parsed = TimeZone(identifier: timezoneIdentifier) else {
                return "timezone must be a valid IANA identifier."
            }
            timezone = parsed
        } else {
            timezone = nil
        }

        do {
            let client = try JanuaryClient(
                endUserID: endUserID,
                timezone: timezone,
                clientTokenProvider: { [weak self] requestedEndUserID in
                    guard let self else {
                        throw JanuaryTokenProviderError("The React Native bridge was released.")
                    }
                    return try await self.requestToken(
                        clientID: clientID,
                        endUserID: requestedEndUserID
                    )
                }
            )
            withLock { clients[clientID] = client }
            return nil
        } catch {
            return error.localizedDescription
        }
    }

    @objc(configureDevelopmentClient:apiKey:endUserId:timezone:)
    public func configureDevelopmentClient(
        _ clientID: String,
        apiKey: String,
        endUserID: String,
        timezoneIdentifier: String?
    ) -> String? {
#if DEBUG
        let timezone: TimeZone?
        if let timezoneIdentifier {
            guard let parsed = TimeZone(identifier: timezoneIdentifier) else {
                return "timezone must be a valid IANA identifier."
            }
            timezone = parsed
        } else {
            timezone = nil
        }

        do {
            let client = try JanuaryClient(
                developmentAPIKey: apiKey,
                endUserID: endUserID,
                timezone: timezone
            )
            withLock { clients[clientID] = client }
            return nil
        } catch {
            return error.localizedDescription
        }
#else
        return "Development API-key authentication is available in debug builds only."
#endif
    }

    @objc(disposeClient:)
    public func disposeClient(_ clientID: String) {
        let pending = withLock { () -> [PendingRequest] in
            clients.removeValue(forKey: clientID)
            let matches = pendingRequests.values.filter { $0.clientID == clientID }
            pendingRequests = pendingRequests.filter { $0.value.clientID != clientID }
            return matches
        }
        for request in pending {
            request.continuation.resume(
                throwing: JanuaryTokenProviderError("The January client was disposed.")
            )
        }
    }

    @objc(resolveTokenRequest:token:expiresIn:)
    public func resolveTokenRequest(_ requestID: String, token: String, expiresIn: Double) {
        let request = withLock { pendingRequests.removeValue(forKey: requestID) }
        request?.continuation.resume(
            returning: JanuaryClientToken(token: token, expiresIn: expiresIn)
        )
    }

    @objc(rejectTokenRequest:message:retryable:)
    public func rejectTokenRequest(_ requestID: String, message: String, retryable: Bool) {
        let request = withLock { pendingRequests.removeValue(forKey: requestID) }
        request?.continuation.resume(
            throwing: JanuaryTokenProviderError(message, retryable: retryable)
        )
    }

    @objc(foodsSearch:query:category:limit:completion:)
    public func foodsSearch(
        _ clientID: String,
        query: String,
        category rawCategory: String?,
        limit: Int,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        guard let client = withLock({ clients[clientID] }) else {
            completion(nil, bridgeError("The January client is not configured."))
            return
        }

        let category = rawCategory.flatMap(FoodCategory.init(rawValue:))
        Task {
            do {
                let result = try await client.foods.search(
                    SearchFoodsRequest(query: query, category: category, limit: limit)
                )
                let data = try JSONEncoder().encode(result)
                guard let json = String(data: data, encoding: .utf8) else {
                    throw bridgeError("The native response could not be encoded.")
                }
                completion(json as NSString, nil)
            } catch {
                completion(nil, nativeError(error))
            }
        }
    }

    @objc(foodsAutocomplete:query:category:limit:completion:)
    public func foodsAutocomplete(
        _ clientID: String,
        query: String,
        category rawCategory: String?,
        limit: Int,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        let category = rawCategory.flatMap(AutocompleteFoodCategory.init(rawValue:))
        perform(clientID, completion: completion) { client in
            try await client.foods.autocomplete(
                .init(query: query, category: category, limit: limit)
            )
        }
    }

    @objc(foodsGet:foodId:completion:)
    public func foodsGet(
        _ clientID: String,
        foodID: String,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        perform(clientID, completion: completion) { client in
            try await client.foods.get(id: .init(rawValue: foodID))
        }
    }

    @objc(foodsLookupBarcode:upc:completion:)
    public func foodsLookupBarcode(
        _ clientID: String,
        upc: String,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        perform(clientID, completion: completion) { client in
            try await client.foods.lookupBarcode(.init(upc: upc))
        }
    }

    @objc(foodsSuggestAlternatives:foodId:dietRestrictionsJson:dietPreferencesJson:completion:)
    public func foodsSuggestAlternatives(
        _ clientID: String,
        foodID: String,
        dietRestrictionsJSON: String,
        dietPreferencesJSON: String,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        do {
            let decoder = JSONDecoder()
            let restrictions = try decoder.decode(
                [DietRestriction].self,
                from: Data(dietRestrictionsJSON.utf8)
            )
            let preferences = try decoder.decode(
                [DietPreference].self,
                from: Data(dietPreferencesJSON.utf8)
            )
            perform(clientID, completion: completion) { client in
                try await client.foods.suggestAlternatives(
                    .init(
                        foodID: .init(rawValue: foodID),
                        dietRestrictions: restrictions,
                        dietPreferences: preferences
                    )
                )
            }
        } catch {
            completion(nil, nativeError(error))
        }
    }

    @objc(foodAnalysisAnalyzeDescription:query:completion:)
    public func foodAnalysisAnalyzeDescription(
        _ clientID: String,
        query: String,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        perform(clientID, completion: completion) { client in
            try await client.foodAnalysis.analyzeDescription(.init(query: query))
        }
    }

    @objc(restaurantsSearch:query:latitude:longitude:radius:limit:completion:)
    public func restaurantsSearch(
        _ clientID: String,
        query: String,
        latitude: Double,
        longitude: Double,
        radius: Double,
        limit: Int,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        perform(clientID, completion: completion) { client in
            try await client.restaurants.search(
                .init(
                    query: query,
                    latitude: latitude,
                    longitude: longitude,
                    radius: radius,
                    limit: limit
                )
            )
        }
    }

    @objc(restaurantMenuItemsSearch:query:latitude:longitude:radius:limit:completion:)
    public func restaurantMenuItemsSearch(
        _ clientID: String,
        query: String,
        latitude: Double,
        longitude: Double,
        radius: Double,
        limit: Int,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        perform(clientID, completion: completion) { client in
            try await client.restaurants.searchMenuItems(
                .init(
                    query: query,
                    latitude: latitude,
                    longitude: longitude,
                    radius: radius,
                    limit: limit
                )
            )
        }
    }

    @objc(restaurantMenuItems:restaurantId:limit:offset:completion:)
    public func restaurantMenuItems(
        _ clientID: String,
        restaurantID: String,
        limit: Int,
        offset: Int,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        perform(clientID, completion: completion) { client in
            try await client.restaurants.getMenuItems(
                .init(restaurantID: restaurantID, limit: limit, offset: offset)
            )
        }
    }

    @objc(foodAnalysisAnalyzePhoto:image:reasoningEffort:completion:)
    public func foodAnalysisAnalyzePhoto(
        _ clientID: String,
        image: String,
        reasoningEffort: String?,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        let effort = reasoningEffort.flatMap(AnalysisEffort.init(rawValue:))
        perform(clientID, completion: completion) { client in
            try await client.foodAnalysis.analyzePhoto(.init(image: image, reasoningEffort: effort))
        }
    }

    @objc(foodAnalysisCorrect:analysisJson:instruction:completion:)
    public func foodAnalysisCorrect(
        _ clientID: String,
        analysisJSON: String,
        instruction: String,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        do {
            let analysis: FoodScan = try decodeCamelCaseJSON(analysisJSON)
            perform(clientID, completion: completion) { client in
                try await client.foodAnalysis.correct(
                    .init(analysis: analysis, instruction: instruction)
                )
            }
        } catch {
            completion(nil, nativeError(error))
        }
    }

    @objc(foodLogsList:start:end:completion:)
    public func foodLogsList(
        _ clientID: String,
        start: String,
        end: String,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        perform(clientID, completion: completion) { client in
            try await client.foodLogs.list(start: start, end: end)
        }
    }

    @objc(foodLogsGetSummary:start:end:groupBy:weekStart:completion:)
    public func foodLogsGetSummary(
        _ clientID: String,
        start: String,
        end: String,
        groupBy: String,
        weekStart: String,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        perform(clientID, completion: completion) { client in
            try await client.foodLogs.getSummary(
                start: start,
                end: end,
                groupBy: groupBy == "week" ? .week : .day,
                weekStart: weekStart == "sunday" ? .sunday : .monday
            )
        }
    }

    @objc(foodLogsCreate:foodsJson:timestampUtc:name:completion:)
    public func foodLogsCreate(
        _ clientID: String,
        foodsJSON: String,
        timestampUTC: String?,
        name: String?,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        do {
            let foods: [FoodSelection] = try decodeCamelCaseJSON(foodsJSON)
            perform(clientID, completion: completion) { client in
                try await client.foodLogs.create(
                    foods: foods,
                    timestampUTC: timestampUTC,
                    name: name
                )
            }
        } catch {
            completion(nil, nativeError(error))
        }
    }

    @objc(foodLogsUpdate:id:foodsJson:timestampUtc:name:completion:)
    public func foodLogsUpdate(
        _ clientID: String,
        id: String,
        foodsJSON: String?,
        timestampUTC: String?,
        name: String?,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        do {
            let foods: [FoodSelection]? = try foodsJSON.map(decodeCamelCaseJSON)
            perform(clientID, completion: completion) { client in
                try await client.foodLogs.update(
                    id: id,
                    foods: foods,
                    timestampUTC: timestampUTC,
                    name: name
                )
            }
        } catch {
            completion(nil, nativeError(error))
        }
    }

    @objc(foodLogsDelete:id:completion:)
    public func foodLogsDelete(
        _ clientID: String,
        id: String,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        guard let client = withLock({ clients[clientID] }) else {
            completion(nil, bridgeError("The January client is not configured."))
            return
        }
        Task {
            do {
                try await client.foodLogs.delete(id: id)
                completion("{}", nil)
            } catch {
                completion(nil, nativeError(error))
            }
        }
    }

    @objc(glucosePredict:requestJson:completion:)
    public func glucosePredict(
        _ clientID: String,
        requestJSON: String,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        do {
            let payload = try JSONDecoder().decode(
                GlucoseRequestPayload.self,
                from: Data(requestJSON.utf8)
            )
            guard let startTime = Self.iso8601Date(payload.startTime) else {
                throw bridgeError("startTime must be an ISO-8601 date-time.")
            }
            let request = PredictGlucoseRequest(
                userProfile: .init(
                    age: payload.userProfile.age,
                    sex: payload.userProfile.sex,
                    height: .init(
                        value: payload.userProfile.height.value,
                        unit: payload.userProfile.height.unit
                    ),
                    weight: .init(
                        value: payload.userProfile.weight.value,
                        unit: payload.userProfile.weight.unit
                    ),
                    activityLevel: payload.userProfile.activityLevel,
                    healthConditions: payload.userProfile.healthConditions
                ),
                foods: payload.foods,
                startTime: startTime
            )
            perform(clientID, completion: completion) { client in
                try await client.glucose.predict(request)
            }
        } catch {
            completion(nil, nativeError(error))
        }
    }

    private struct GlucoseRequestPayload: Decodable {
        struct Profile: Decodable {
            struct HeightValue: Decodable { let unit: HeightUnit; let value: Double }
            struct WeightValue: Decodable { let unit: WeightUnit; let value: Double }
            let activityLevel: ActivityLevel?
            let age: Double
            let healthConditions: [MedicalCondition]?
            let height: HeightValue
            let sex: Sex
            let weight: WeightValue
        }
        let foods: [FoodSelection]
        let startTime: String
        let userProfile: Profile
    }

    private func perform<Value: Encodable>(
        _ clientID: String,
        completion: @escaping (NSString?, NSError?) -> Void,
        operation: @escaping (JanuaryClient) async throws -> Value
    ) {
        guard let client = withLock({ clients[clientID] }) else {
            completion(nil, bridgeError("The January client is not configured."))
            return
        }
        Task {
            do {
                let value = try await operation(client)
                let data = try JSONEncoder().encode(value)
                guard let json = String(data: data, encoding: .utf8) else {
                    throw bridgeError("The native response could not be encoded.")
                }
                completion(json as NSString, nil)
            } catch {
                completion(nil, nativeError(error))
            }
        }
    }

    private func decodeCamelCaseJSON<Value: Decodable>(_ json: String) throws -> Value {
        let object = try JSONSerialization.jsonObject(with: Data(json.utf8))
        let converted = Self.snakeCaseKeys(object)
        let data = try JSONSerialization.data(withJSONObject: converted)
        return try JSONDecoder().decode(Value.self, from: data)
    }

    private static func snakeCaseKeys(_ value: Any) -> Any {
        if let values = value as? [Any] { return values.map(snakeCaseKeys) }
        guard let dictionary = value as? [String: Any] else { return value }
        return Dictionary(uniqueKeysWithValues: dictionary.map { key, child in
            let convertedKey = key.reduce(into: "") { result, character in
                if character.isUppercase {
                    result.append("_")
                    result.append(character.lowercased())
                } else {
                    result.append(character)
                }
            }
            return (convertedKey, snakeCaseKeys(child))
        })
    }

    private static func iso8601Date(_ value: String) -> Date? {
        let standard = ISO8601DateFormatter()
        if let date = standard.date(from: value) { return date }
        standard.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return standard.date(from: value)
    }

    private func requestToken(clientID: String, endUserID: String) async throws -> JanuaryClientToken {
        let requestID = UUID().uuidString
        return try await withCheckedThrowingContinuation { continuation in
            withLock {
                pendingRequests[requestID] = PendingRequest(
                    clientID: clientID,
                    continuation: continuation
                )
            }
            DispatchQueue.main.async { [weak self] in
                self?.tokenRequestHandler?([
                    "clientId": clientID,
                    "endUserId": endUserID,
                    "requestId": requestID,
                ])
            }
        }
    }

    private func withLock<T>(_ operation: () -> T) -> T {
        lock.lock()
        defer { lock.unlock() }
        return operation()
    }

    // MARK: - Voice capture

    /// Whether this device has a speech recognizer for the current locale. Transient
    /// unavailability (for example no network for a server-backed locale) is reported by
    /// `voiceCaptureStart` as `recognizer_unavailable` rather than hiding the feature.
    @objc public func voiceCaptureIsSupported(_ locale: String?) -> Bool {
        // Check the same locale the session will record with; the device locale otherwise.
        let requested = locale.flatMap { $0.isEmpty ? nil : Locale(identifier: $0) } ?? Locale.current
        return SFSpeechRecognizer(locale: requested) != nil
    }

    @objc(voiceCaptureStart:locale:captureID:completion:)
    public func voiceCaptureStart(
        _ sessionID: String,
        locale: String?,
        captureID: String,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        Task { @MainActor in
            do {
                let holder = self.voiceHolder(sessionID, locale: locale)
                self.observeVoiceUpdates(holder, sessionID: sessionID, captureID: captureID)
                try await holder.session.startRecording()
                completion("{}", nil)
            } catch {
                completion(nil, self.voiceError(error))
            }
        }
    }

    @objc(voiceCaptureStop:completion:)
    public func voiceCaptureStop(
        _ sessionID: String,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        Task { @MainActor in
            guard let holder = self.voiceSessions[sessionID] else {
                completion(nil, self.voiceNSError("invalid_state", "Voice capture is not recording."))
                return
            }
            do {
                let result = try await holder.session.stopAndTranscribe()
                let payload: [String: Any] = [
                    "transcript": result.transcript,
                    "durationMs": Int(result.duration * 1000),
                ]
                let data = try JSONSerialization.data(withJSONObject: payload)
                completion(String(decoding: data, as: UTF8.self) as NSString, nil)
            } catch {
                completion(nil, self.voiceError(error))
            }
        }
    }

    @objc public func voiceCaptureCancel(_ sessionID: String) {
        Task { @MainActor in
            self.voiceSessions[sessionID]?.session.cancel()
        }
    }

    @objc public func voiceCaptureDispose(_ sessionID: String) {
        Task { @MainActor in
            guard let holder = self.voiceSessions.removeValue(forKey: sessionID) else { return }
            holder.session.cancel()
            holder.cancellables.removeAll()
        }
    }

    @MainActor
    private func voiceHolder(_ sessionID: String, locale: String?) -> VoiceHolder {
        if let existing = voiceSessions[sessionID] { return existing }
        let session = VoiceCaptureSession(locale: locale.map(Locale.init(identifier:)))
        let holder = VoiceHolder(session: session)
        voiceSessions[sessionID] = holder
        return holder
    }

    /// Replaces the holder's subscriptions with ones bound to `captureID`, so an update queued
    /// for an earlier capture can never be delivered under a newer id.
    @MainActor
    private func observeVoiceUpdates(_ holder: VoiceHolder, sessionID: String, captureID: String) {
        holder.cancellables.removeAll()
        let session = holder.session
        let emit: () -> Void = { [weak self, weak session] in
            guard let self, let session else { return }
            let state: String
            switch session.state {
            case .idle: state = "idle"
            case .requestingPermissions: state = "requestingPermission"
            case .recording: state = "recording"
            case .transcribing: state = "processing"
            }
            self.voiceUpdateHandler?([
                "sessionId": sessionID,
                "captureId": captureID,
                "state": state,
                "audioLevel": Double(session.audioLevel),
                "durationMs": Int(session.recordingDuration * 1000),
                "partialTranscript": "",
                "transcript": NSNull(),
                "errorCode": NSNull(),
                "errorMessage": NSNull(),
            ] as NSDictionary)
        }
        // @Published publishes from willSet, so hop to the next main-queue turn before
        // reading the session's properties; otherwise the event carries the previous values.
        session.$state.dropFirst().receive(on: DispatchQueue.main).sink { _ in emit() }.store(in: &holder.cancellables)
        session.$audioLevel.dropFirst().receive(on: DispatchQueue.main).sink { _ in emit() }.store(in: &holder.cancellables)
        session.$recordingDuration.dropFirst().receive(on: DispatchQueue.main).sink { _ in emit() }.store(in: &holder.cancellables)
    }

    private func voiceError(_ error: Error) -> NSError {
        guard let voice = error as? VoiceCaptureError else {
            return voiceNSError("unknown", error.localizedDescription)
        }
        let code: String
        switch voice {
        case .missingUsageDescription, .microphonePermissionDenied, .speechRecognitionPermissionDenied:
            code = "permission_denied"
        case .speechRecognizerUnavailable: code = "recognizer_unavailable"
        case .recordingFailed: code = "recording_failed"
        case .transcriptionFailed: code = "transcription_failed"
        case .emptyTranscript: code = "no_match"
        case .invalidState: code = "invalid_state"
        case .cancelled: code = "cancelled"
        }
        return voiceNSError(code, voice.errorDescription ?? "Voice capture failed.")
    }

    private func voiceNSError(_ code: String, _ message: String) -> NSError {
        NSError(
            domain: "ai.january.sdk.voice",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: message, "code": code]
        )
    }

    private func nativeError(_ error: Error) -> NSError {
        if let januaryError = error as? JanuaryError {
            return NSError(
                domain: "ai.january.sdk",
                code: januaryError.httpStatus ?? 0,
                userInfo: [
                    NSLocalizedDescriptionKey: januaryError.message,
                    "code": januaryError.code ?? januaryError.category.rawValue,
                ]
            )
        }
        return error as NSError
    }

    private func bridgeError(_ message: String) -> NSError {
        NSError(
            domain: "ai.january.sdk.react-native",
            code: 0,
            userInfo: [NSLocalizedDescriptionKey: message, "code": "bridge_error"]
        )
    }
}
