const { getDefaultConfig } = require('expo/metro-config');
const metroResolver = require('metro-resolver');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules')
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@babel/runtime')) {
    const relativePart = moduleName.replace('@babel/runtime/', '');
    let targetFile = path.resolve(__dirname, 'node_modules/@babel/runtime', relativePart);
    if (!targetFile.endsWith('.js')) {
      targetFile += '.js';
    }
    return {
      filePath: targetFile,
      type: 'sourceFile'
    };
  }

  try {
    return metroResolver.resolve(context, moduleName, platform);
  } catch (error) {
    try {
      const resolvedPath = require.resolve(moduleName, {
        paths: [path.dirname(context.originModulePath), path.resolve(__dirname, 'node_modules')]
      });
      return {
        filePath: resolvedPath,
        type: 'sourceFile'
      };
    } catch {
      throw error;
    }
  }
};

module.exports = config;
