const { AndroidConfig, withAndroidManifest } = require("@expo/config-plugins");

const withAndroidBackupDisabled = (config) =>
  withAndroidManifest(config, (configWithManifest) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      configWithManifest.modResults,
    );
    mainApplication.$["android:allowBackup"] = "false";
    return configWithManifest;
  });

module.exports = withAndroidBackupDisabled;
