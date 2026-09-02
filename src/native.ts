import JanuaryReactNative from './NativeJanuaryReactNative';

/** Returns the linked native module version, or null on non-native platforms. */
export function getNativeModuleVersion(): string | null {
  return JanuaryReactNative?.getNativeModuleVersion() ?? null;
}
