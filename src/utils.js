import fs from 'fs-extra'
import glob from 'glob'

const GITKEEP_RE = /\.gitkeep$/

export function copyPublicDir(from, to) {
  fs.ensureDirSync(to)
  if (glob.sync(`${from}/`).length !== 0) {
    fs.copySync(from, to, {
      filter(file) { return !GITKEEP_RE.test(file) }
    })
  }
}

export function createBanner(pkg) {
  let banner = `${pkg.name} ${pkg.version}`
  if (pkg.homepage) {
    banner += ` - ${pkg.homepage}`
  }
  if (pkg.license) {
    banner += `\n${pkg.license} Licensed`
  }
  return banner
}

export function createWebpackExternals(externals = {}) {
  return Object.keys(externals).reduce((webpackExternals, packageName) => {
    let globalName = externals[packageName]
    webpackExternals[packageName] = {
      root: globalName,
      commonjs2: packageName,
      commonjs: packageName,
      amd: packageName
    }
    return webpackExternals
  }, {})
}

/**
 * String.prototype.endsWith() is behind the --harmony flag in Node.js v0.12.
 */
export function endsWith(s1, s2) {
  return s1.lastIndexOf(s2) === s1.length - s2.length
}

/**
 * Inlines the generated webpack manifest into index.html before </head> and
 * deletes the generated manifest files.
 */
export function inlineManifest(cb) {
  try {
    let indexHtml = fs.readFileSync('dist/index.html', 'utf8')
    let webpackManifest = fs.readFileSync('dist/manifest.js', 'utf8')
    webpackManifest = webpackManifest.replace('\n//# sourceMappingURL=manifest.js.map', '')
    indexHtml = indexHtml.replace('</head>', `<script>${webpackManifest}</script></head>`)
    fs.writeFileSync('dist/index.html', indexHtml, 'utf8')
    fs.unlinkSync('dist/manifest.js')
    fs.unlinkSync('dist/manifest.js.map')
    cb()
  }
  catch (e) {
    cb(e)
  }
}

/**
 * At some stage, webpack-html-plugin started putting app and vendor in the
 * wrong order and providing a custom chunk sorting function which does nothing
 * apparently fixes it.
 */
export function sortChunks(chunks) {
  return chunks
}

/**
 * Better typeof.
 */
export function typeOf(o) {
  if (Number.isNaN(o)) return 'nan'
  return Object.prototype.toString.call(o).slice(8, -1).toLowerCase()
}
