import path from 'path'

import {copyPublicDir, inlineManifest, sortChunks} from '../utils'

import webpackBuild from '../webpackBuild'

export default function(args, cb) {
  require('./clean-app')(args)

  copyPublicDir('public', 'dist')

  let buildConfig = {
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

  console.log(`nwb: build-web-app`)
  webpackBuild(args, buildConfig, err => {
    if (err) return cb(err)
    inlineManifest(cb)
  })
}
