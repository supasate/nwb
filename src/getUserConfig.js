import path from 'path'

import chalk from 'chalk'
import glob from 'glob'
import webpack from 'webpack'

import {PROJECT_TYPES} from './constants'
import debug from './debug'
import {UserError} from './errors'

const DEFAULT_BUILD_CONFIG = {
  externals: {},
  global: '',
  jsNext: false,
  umd: false
}

const DEFAULT_WEBPACK_CONFIG = {
  loaders: {},
  plugins: {}
}

// TODO Remove in nwb 0.9
const BUILD_CONFIG_PROPS = Object.keys(DEFAULT_BUILD_CONFIG)
let warnedAboutBuildConfig = false
let warnedAboutDefineConfig = false
let warnedAboutWebpackConfig = false
let warnedAboutExtraLoaders = false

function applyDefaultConfig(userConfig, topLevelProp, defaults) {
  if (!(topLevelProp in userConfig)) {
    userConfig[topLevelProp] = {...defaults}
  }
  else {
    Object.keys(defaults).forEach(prop => {
      if (!(prop in userConfig[topLevelProp])) {
        userConfig[topLevelProp][prop] = defaults[prop]
      }
    })
  }
}

export default function getUserConfig(args = {}, {required = false} = {}) {
  // Try to load default user config, or use a config file path we were given
  // (undocumented).
  let userConfig = {}
  let userConfigPath = args.absConfig || path.resolve(args.config || 'nwb.config.js')

  // Bail early if a config file is required and doesn't exist
  let configFileExists = glob.sync(userConfigPath).length !== 0
  if (required && !configFileExists) {
    throw new UserError(`nwb: couldn't find a config file at ${userConfigPath}`)
  }

  // If a config file exists, it should be a valid module regardless of whether
  // or not it's required.
  if (configFileExists) {
    try {
      userConfig = require(userConfigPath)
      debug('imported config module from %s', userConfigPath)
    }
    catch (e) {
      throw new UserError(`nwb: couldn't import the config file at ${userConfigPath}`)
    }
  }

  if (typeof userConfig == 'function') {
    userConfig = userConfig({
      command: args._[0],
      webpack
    })
  }

  if ((required || 'type' in userConfig) && PROJECT_TYPES.indexOf(userConfig.type) === -1) {
    throw new UserError(
      `nwb: invalid project type configured in ${userConfigPath}: ${userConfig.type}`,
      `nwb: 'type' config must be one of: ${PROJECT_TYPES.join(', ')}`
    )
  }

  // TODO Remove in nwb 0.9
  let topLevelBuildConfig = BUILD_CONFIG_PROPS.filter(prop => prop in userConfig)
  if (topLevelBuildConfig.length > 0) {
    if (!warnedAboutBuildConfig) {
      console.warn(chalk.magenta([
        'nwb: the top level of your nwb config contains the following npm module build configuration:',
        `nwb: ${topLevelBuildConfig.join(', ')}`,
        'nwb: from nwb 0.9 onward this must be moved into a "build" object'
      ].join('\n')))
      warnedAboutBuildConfig = true
    }
    let buildConfig = {...DEFAULT_BUILD_CONFIG}
    BUILD_CONFIG_PROPS.forEach(prop => {
      if (prop in userConfig) {
        buildConfig[prop] = userConfig[prop]
        delete userConfig[prop]
      }
    })
    userConfig.build = buildConfig
  }
  let toplevelWebpackConfig = ['define', 'loaders'].filter(prop => prop in userConfig)
  if (toplevelWebpackConfig.length > 0) {
    if (!warnedAboutWebpackConfig) {
      console.warn(chalk.magenta([
        'nwb: the top level of your nwb config contains the following webpack configuration:',
        `nwb: ${toplevelWebpackConfig.join(', ')}`,
        'nwb: from nwb 0.9 onward this must this to be moved into a "webpack" object'
      ].join('\n')))
      warnedAboutWebpackConfig = true
    }
    let webpackConfig = {...DEFAULT_WEBPACK_CONFIG}
    // 0.8 config props don't match 0.9, so manually upgrade them one at a time
    if ('define' in userConfig) {
      if (!warnedAboutDefineConfig) {
        console.warn(chalk.magenta(
          'nwb: from nwb 0.9 onward webpack "define" config must be inside a "plugins" object'
        ))
        warnedAboutDefineConfig = true
      }
      webpackConfig.plugins.define = userConfig.define
      delete userConfig.define
    }
    if ('loaders' in userConfig) {
      webpackConfig.loaders = userConfig.loaders
      delete userConfig.loaders
    }
    if (webpackConfig.loaders.extra && !warnedAboutExtraLoaders) {
      console.warn(chalk.magenta(
        'nwb: from nwb 0.9 onward extra webpack loaders must be defined in webpack.extra.module.loaders'
      ))
      warnedAboutExtraLoaders = true
    }
    userConfig.webpack = webpackConfig
  }

  // Set defaults for config objects
  applyDefaultConfig(userConfig, 'build', DEFAULT_BUILD_CONFIG)
  applyDefaultConfig(userConfig, 'webpack', DEFAULT_WEBPACK_CONFIG)

  // If the user provided Babel config, automatically apply it to babel-loader
  // as query config unless there's already some set.
  if (userConfig.babel) {
    if (!userConfig.webpack.loaders.babel) {
      userConfig.webpack.loaders.babel = {query: userConfig.babel}
      debug('added babel-loader with user babel config')
    }
    else if (!userConfig.webpack.loaders.babel.query) {
      userConfig.webpack.loaders.babel.query = userConfig.babel
      debug('added query to babel-loader with user babel config')
    }
  }

  debug('final user config: %o', userConfig)

  return userConfig
}
