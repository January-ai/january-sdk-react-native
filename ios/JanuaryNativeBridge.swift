import Foundation
import January

@objc(JanuaryNativeBridge)
public final class JanuaryNativeBridge: NSObject, @unchecked Sendable {
    @objc public var tokenRequestHandler: ((NSDictionary) -> Void)?

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

    @objc(foodAnalysisAnalyzePhoto:image:completion:)
    public func foodAnalysisAnalyzePhoto(
        _ clientID: String,
        image: String,
        completion: @escaping (NSString?, NSError?) -> Void
    ) {
        perform(clientID, completion: completion) { client in
            try await client.foodAnalysis.analyzePhoto(.init(image: image))
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
