const rowcol = require('../src/helpers/rowcol')

describe('rowCol', () => {
    it('translates basic excel cells', () => {
        expect(rowcol('A1')).toEqual({ c: 1, r: 1 })
        expect(rowcol('C4')).toEqual({ c: 3, r: 4 })
    })

    it('handles large definitions', () => {
        expect(rowcol('A99')).toEqual({ c: 1, r: 99 })
        expect(rowcol('Z4')).toEqual({ c: 26, r: 4 })
        expect(rowcol('AA89')).toEqual({ c: 27, r: 89 })
    })

    it('handles invalid input', () => {
        expect(rowcol('99A')).toEqual(null)
        expect(rowcol(null)).toEqual(null)
        expect(rowcol('B0')).toEqual(null)
        expect(rowcol()).toEqual(null)
    })
})