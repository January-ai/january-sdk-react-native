// Expo config plugin: enables core library desugaring in the Android app module.
// The January Android SDK uses java.time and supports API 24 through desugaring; its AAR
// metadata makes the app build fail unless the app enables it too, whatever the app's
// minSdkVersion. Add "@januaryai/react-native" to `expo.plugins` (alongside
// expo-build-properties for `minSdkVersion`).
// Resolve Expo's config-plugins from the app that runs prebuild (its working directory),
// so the plugin also works when this package is linked from outside node_modules.
function loadConfigPlugins() {
  for (const spec of ['expo/config-plugins', '@expo/config-plugins']) {
    try {
      return require(
        require.resolve(spec, { paths: [process.cwd(), __dirname] })
      );
    } catch {
      // try the next candidate
    }
  }
  throw new Error(
    '@januaryai/react-native: the Expo config plugin needs `expo` (or `@expo/config-plugins`) installed in the app.'
  );
}
const { withAppBuildGradle } = loadConfigPlugins();

const DESUGAR_LIB = 'com.android.tools:desugar_jdk_libs:2.1.5';

function enableDesugaring(contents) {
  let next = contents;
  if (!/coreLibraryDesugaringEnabled\s+true/.test(next)) {
    if (/compileOptions\s*\{/.test(next)) {
      next = next.replace(
        /compileOptions\s*\{/,
        'compileOptions {\n        coreLibraryDesugaringEnabled true'
      );
    } else {
      next = next.replace(
        /android\s*\{/,
        'android {\n    compileOptions {\n        coreLibraryDesugaringEnabled true\n    }'
      );
    }
  }
  if (!next.includes('coreLibraryDesugaring ')) {
    next = next.replace(
      /dependencies\s*\{/,
      `dependencies {\n    coreLibraryDesugaring "${DESUGAR_LIB}"`
    );
  }
  return next;
}

module.exports = function withJanuaryReactNative(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      throw new Error(
        '@januaryai/react-native: only Groovy android/app/build.gradle is supported.'
      );
    }
    gradleConfig.modResults.contents = enableDesugaring(
      gradleConfig.modResults.contents
    );
    return gradleConfig;
  });
};
