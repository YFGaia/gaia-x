const { getTextByClipboard, getTextByUIA, activeWindow } = require('node-gyp-build')(__dirname);

exports.getTextByClipboard = getTextByClipboard;

exports.getTextByUIA = getTextByUIA;

exports.activeWindow = activeWindow;