const ReaderProvider = require('../src/readers/readerProvider')

const provider = new ReaderProvider()

describe('readerProvider getVersion', () => {
    it('v3.0.0', () => {
        const fileData = { identifier: 'this will be 3.0.0' }
        expect(provider.getVersion(fileData)).toEqual('v3.0.0')
    })

    it('v3.9.5', () => {
        const fileData = { state: { ignore: 'this' } }
        expect(provider.getVersion(fileData)).toEqual('v3.9.5')
    })

    it('v4.0.0', () => {
        const fileData = { state: { ['ScoreBoard.Version(release)']: 'v4.0.0' } }
        expect(provider.getVersion(fileData)).toEqual('v4.0.0')
    })

    it('v4.x', () => {
        const fileData = { state: { ['ScoreBoard.Version(release)']: 'v4.3.4' } }
        expect(provider.getVersion(fileData)).toEqual('v4.3.4')
    })

    it('other', () => {
        expect(provider.getVersion(null)).toEqual('unknown')
        expect(provider.getVersion()).toEqual('unknown')
        expect(provider.getVersion('blah')).toEqual('unknown')
        expect(provider.getVersion(400)).toEqual('unknown')
    })
})
