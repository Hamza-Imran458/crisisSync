const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.watchFolders = [__dirname];
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [require('path').join(__dirname, 'node_modules')],
};

module.exports = config;
