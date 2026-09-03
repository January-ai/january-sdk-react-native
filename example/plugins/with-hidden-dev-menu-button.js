const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const DEV_MENU_SETTINGS = {
  DEV_CLIENT_TRY_TO_LAUNCH_LAST_BUNDLE: false,
  EXDevMenuIsOnboardingFinished: true,
  EXDevMenuShowsAtLaunch: false,
  EXDevMenuShowFloatingActionButton: false,
};

module.exports = function withHiddenDevMenuButton(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      androidConfig.modResults
    );

    for (const [name, value] of Object.entries(DEV_MENU_SETTINGS)) {
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        application,
        name,
        value
      );
    }

    return androidConfig;
  });
};
