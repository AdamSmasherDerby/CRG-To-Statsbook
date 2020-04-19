const Reader395 = require('./reader395')
const Reader400 = require('./reader400')

module.exports = class ReaderProvider {
    getVersion(fileData) {
        let version

        if (fileData && Object.prototype.hasOwnProperty.call(fileData, 'identifier')) {
            version = 'v3.0.0'
        } else if (fileData && Object.prototype.hasOwnProperty.call(fileData, 'state')) {
            if(Object.prototype.hasOwnProperty.call(fileData.state, 'ScoreBoard.Version(release)')) {
                version = fileData.state['ScoreBoard.Version(release)']
            } else {
                version = 'v3.9.5'
            }
        } else {
            version = 'unknown'
        }

        return version
    }

    getReader(version) {
        if (version === 'unknown' || version === 'v3.0.0') {
            return null
        } else if (version === 'v3.9.5') {
            return new Reader395()
        } else {
            return new Reader400()
        }
    }
}