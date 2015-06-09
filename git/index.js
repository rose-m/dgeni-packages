"use strict";

var Package = require('dgeni').Package;

/**
 * @dgPackage git
 * @description
 * Create and export a new Dgeni package called git which provides
 * some git and version information to the `extraData` for the
 * `renderDocsProcessor`.
 */
module.exports = new Package('git', [])

.factory(require('./services/decorateVersion'))
.factory(require('./services/getPreviousVersions'))
.factory(require('./services/gitData'))
.factory(require('./services/gitRepoInfo'))
.factory(require('./services/packageInfo'))
.factory(require('./services/versionInfo'))

.config(function(renderDocsProcessor, gitData) {
  renderDocsProcessor.extraData.git = gitData;
});
