#import "JanuaryReactNative.h"
#import "JanuaryReactNative-Swift.h"

@implementation JanuaryReactNative {
  JanuaryNativeBridge *_bridge;
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    _bridge = [JanuaryNativeBridge new];
    __weak JanuaryReactNative *weakSelf = self;
    _bridge.tokenRequestHandler = ^(NSDictionary<NSString *, NSString *> *request) {
      [weakSelf emitOnTokenRequested:request];
    };
  }
  return self;
}

- (NSString *)getNativeModuleVersion
{
  return @"0.1.0";
}

- (NSString * _Nullable)configureClient:(NSString *)clientId
                              endUserId:(NSString *)endUserId
                                timezone:(NSString * _Nullable)timezone
{
  return [_bridge configureClient:clientId endUserId:endUserId timezone:timezone];
}

- (NSString * _Nullable)configureDevelopmentClient:(NSString *)clientId
                                             apiKey:(NSString *)apiKey
                                          endUserId:(NSString *)endUserId
                                           timezone:(NSString * _Nullable)timezone
{
  return [_bridge configureDevelopmentClient:clientId
                                      apiKey:apiKey
                                   endUserId:endUserId
                                    timezone:timezone];
}

- (void)disposeClient:(NSString *)clientId
{
  [_bridge disposeClient:clientId];
}

- (void)resolveTokenRequest:(NSString *)requestId
                      token:(NSString *)token
                  expiresIn:(double)expiresIn
{
  [_bridge resolveTokenRequest:requestId token:token expiresIn:expiresIn];
}

- (void)rejectTokenRequest:(NSString *)requestId
                    message:(NSString *)message
                  retryable:(BOOL)retryable
{
  [_bridge rejectTokenRequest:requestId message:message retryable:retryable];
}

- (void)foodsSearch:(NSString *)clientId
               query:(NSString *)query
            category:(NSString * _Nullable)category
               limit:(double)limit
             resolve:(RCTPromiseResolveBlock)resolve
              reject:(RCTPromiseRejectBlock)reject
{
  [_bridge foodsSearch:clientId
                 query:query
              category:category
                 limit:(NSInteger)limit
            completion:^(NSString *json, NSError *error) {
    if (error) {
      NSString *code = error.userInfo[@"code"] ?: @"january_error";
      reject(code, error.localizedDescription, error);
      return;
    }
    resolve(json);
  }];
}

- (void)foodAnalysisAnalyzePhoto:(NSString *)clientId
                           image:(NSString *)image
                         resolve:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject
{
  [_bridge foodAnalysisAnalyzePhoto:clientId image:image completion:^(NSString *json, NSError *error) {
    if (error) { reject(error.userInfo[@"code"] ?: @"january_error", error.localizedDescription, error); return; }
    resolve(json);
  }];
}

- (void)foodAnalysisCorrect:(NSString *)clientId
                analysisJson:(NSString *)analysisJson
                 instruction:(NSString *)instruction
                     resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject
{
  [_bridge foodAnalysisCorrect:clientId analysisJson:analysisJson instruction:instruction completion:^(NSString *json, NSError *error) {
    if (error) { reject(error.userInfo[@"code"] ?: @"january_error", error.localizedDescription, error); return; }
    resolve(json);
  }];
}

- (void)foodLogsList:(NSString *)clientId
                start:(NSString *)start
                  end:(NSString *)end
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  [_bridge foodLogsList:clientId start:start end:end completion:^(NSString *json, NSError *error) {
    if (error) { reject(error.userInfo[@"code"] ?: @"january_error", error.localizedDescription, error); return; }
    resolve(json);
  }];
}

- (void)foodLogsCreate:(NSString *)clientId
              foodsJson:(NSString *)foodsJson
           timestampUtc:(NSString * _Nullable)timestampUtc
                   name:(NSString * _Nullable)name
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
  [_bridge foodLogsCreate:clientId foodsJson:foodsJson timestampUtc:timestampUtc name:name completion:^(NSString *json, NSError *error) {
    if (error) { reject(error.userInfo[@"code"] ?: @"january_error", error.localizedDescription, error); return; }
    resolve(json);
  }];
}

- (void)foodLogsUpdate:(NSString *)clientId
                     id:(NSString *)logId
              foodsJson:(NSString * _Nullable)foodsJson
           timestampUtc:(NSString * _Nullable)timestampUtc
                   name:(NSString * _Nullable)name
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
  [_bridge foodLogsUpdate:clientId id:logId foodsJson:foodsJson timestampUtc:timestampUtc name:name completion:^(NSString *json, NSError *error) {
    if (error) { reject(error.userInfo[@"code"] ?: @"january_error", error.localizedDescription, error); return; }
    resolve(json);
  }];
}

- (void)foodLogsDelete:(NSString *)clientId
                     id:(NSString *)logId
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
  [_bridge foodLogsDelete:clientId id:logId completion:^(NSString *json, NSError *error) {
    if (error) { reject(error.userInfo[@"code"] ?: @"january_error", error.localizedDescription, error); return; }
    resolve(json);
  }];
}

- (void)glucosePredict:(NSString *)clientId
             requestJson:(NSString *)requestJson
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject
{
  [_bridge glucosePredict:clientId requestJson:requestJson completion:^(NSString *json, NSError *error) {
    if (error) { reject(error.userInfo[@"code"] ?: @"january_error", error.localizedDescription, error); return; }
    resolve(json);
  }];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeJanuaryReactNativeSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"JanuaryReactNative";
}

@end
