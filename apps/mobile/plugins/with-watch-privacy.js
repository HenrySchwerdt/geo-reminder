const { withPodfile } = require('expo/config-plugins');

/** RN aggregates the phone manifest into every application target, including the native watch app. */
module.exports = function withWatchPrivacy(config) {
  return withPodfile(config, (config) => {
    const marker = '# worktime-watch-privacy';
    if (!config.modResults.contents.includes(marker)) {
      config.modResults.contents += `
${marker}
post_integrate do |installer|
  installer.aggregate_targets.map(&:user_project).uniq.each do |project|
    project.targets.select { |target| target.name == 'WorktimeWatch' }.each do |target|
      # Its synchronized source folder already supplies the watch's own manifest.
      target.resources_build_phase.files.to_a.each do |file|
        if file.file_ref&.path&.end_with?('PrivacyInfo.xcprivacy')
          file.remove_from_project
        end
      end
    end
    project.save
  end
end
`;
    }
    return config;
  });
};
