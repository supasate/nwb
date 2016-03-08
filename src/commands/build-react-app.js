import path from 'path'

import {copyPublicDir, inlineManifest, sortChunks} from '../utils'
import webpackBuild from '../webpackBuild'

// Use a config function, as this won't be called until after NODE_ENV has been
// set by webpackBuild() and we don't want these optimisations in development
// builds.
let buildConfig = () => {
  let config = {
    devtool: 'source-map',
    entry: {
      app: path.resolve('src/index.js')
    },
    output: {
      filename: '[name].[chunkhash:8].js',
      chunkFilename: '[name].[chunkhash:8].js',
      path: path.resolve('dist'),
      publicPath: '/'
    },
    plugins: {
      html: {
        chunksSortMode: sortChunks,
        excludeChunks: ['manifest'],
        template: path.resolve('src/index.html')
      },
      vendorChunkName: 'vendor'
    }
  }

  if (process.env.NODE_ENV === 'production') {
    config.loaders = {
      babel: {
        query: {
          optional: [
            'optimisation.react.inlineElements',
            'optimisation.react.constantElements'
          ]
        }
      }
    }
  }

  return config
}

export default function(args, cb) {
  require('./clean-app')(args)

  copyPublicDir('public', 'dist')

  console.log(`nwb: build-react-app`)
  webpackBuild(args, buildConfig, err => {
    if (err) return cb(err)
    inlineManifest(cb)
  })
}
