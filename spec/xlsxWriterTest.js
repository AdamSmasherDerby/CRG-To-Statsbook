const SpecWorkbookWrapper = require('./support/SpecWorkbookWrapper')
const XlsxWriter = require('../src/writers/xlsxWriter') 
const _ = require('lodash')

describe('xlsxWriter', () => {
    let specWrapper
    let writer
    let skaters
    let skaterManager

    beforeEach(() => {
        specWrapper = new SpecWorkbookWrapper()
        writer = new XlsxWriter(specWrapper, true)
        skaters = { home: [], away: [] }
        skaterManager = { getSkaters() { return skaters } }
        writer.skaterManager = skaterManager
    })


    it('fills game info', () => {
        writer.crgData = {
            "identifier": "2017-07-26 20:24 - Chicago Bruise Brothers vs Minnesota Terrordactyls",
            teams: [
                { name: 'Team A' },
                { name: 'Team B' }
            ] 
        }

        writer.gameInfo()

        const sheets = specWrapper.sheetCache
        const names = Object.keys(sheets)

        expect(names).toEqual(['IGRF'])

        

        expect(sheets['IGRF'].getCellA1('B7').currentValue).toEqual('2017-07-26')
        expect(sheets['IGRF'].getCellA1('I7').currentValue).toEqual('20:24')
        
        expect(sheets['IGRF'].getCellA1('B10').currentValue).toEqual('Team A')
        expect(sheets['IGRF'].getCellA1('I10').currentValue).toEqual('Team B')
        
    })

    describe('skater data', () => {

        function validateResult() {
            const sheets = specWrapper.sheetCache
            const names = Object.keys(sheets)
    
            expect(names).toEqual(['IGRF'])

            for(let r = 14; r < 34; r++) {
                
                let homeSkater = skaters.home[r-14] || { name: '', number: '' }
                let awaySkater = skaters.away[r-14] || { name: '', number: '' }

                expect(sheets['IGRF'].values[r][2]).toEqual(homeSkater.number)
                expect(sheets['IGRF'].values[r][3]).toEqual(homeSkater.name)
                expect(sheets['IGRF'].values[r][9]).toEqual(awaySkater.number)
                expect(sheets['IGRF'].values[r][10]).toEqual(awaySkater.name)
            }

            expect(sheets['IGRF'].values[13]).toBeUndefined()
            expect(sheets['IGRF'].values[35]).toBeUndefined()

        }

        it('handles normal teams', () => {
            skaters.home = [
                { name: 'A1', number: '100', row: '1' },
                { name: 'A2', number: '101', row: '2' }
            ]
            skaters.away = [
                { name: 'B1', number: '200', row: '1' },
                { name: 'B2', number: '201', row: '2' }
            ]

            writer.skaters()

            const sheets = specWrapper.sheetCache
            const names = Object.keys(sheets)
    
            expect(names).toEqual(['IGRF'])
            // test the test code -- use manual indicies before looping
            expect(sheets['IGRF'].values[14][2]).toEqual('100')
                expect(sheets['IGRF'].values[14][3]).toEqual('A1')
                expect(sheets['IGRF'].values[14][9]).toEqual('200')
                expect(sheets['IGRF'].values[14][10]).toEqual('B1')

            validateResult()
        })

        it('does NOT use the "row" property to sort skaters', () => {
            // sorting should happen in the skater manager, the "row" property should not be used at all
            skaters.home = [
                { name: 'A2', number: '101', row: 2 },
                { name: 'A1', number: '100', row: 1 },
            ]
            skaters.away = [
                { name: 'B2', number: '201', row: 2 },
                { name: 'B1', number: '200', row: 1 },
            ]

            writer.skaters()

            const sheets = specWrapper.sheetCache
            const names = Object.keys(sheets)
    
            expect(names).toEqual(['IGRF'])

            expect(sheets['IGRF'].values[14][2]).toEqual('101')
            expect(sheets['IGRF'].values[14][3]).toEqual('A2')
            expect(sheets['IGRF'].values[14][9]).toEqual('201')
            expect(sheets['IGRF'].values[14][10]).toEqual('B2')
        })

        it('handles empty skater lists', () => {
            skaters.home = []
            skaters.away = []

            writer.skaters()

            validateResult()
        })

        it('handles too long skater lists', () => {
            // one team has exactly 20 skaters (to make sure there are no off-by-one errors)
            // one tema has "too many" skaters, and should be capped to 20
            skaters.home = _.range(0,20).map(i => ({ name: `A${i}`, number: `${100+i}` }))
            skaters.away = _.range(0,25).map(i => ({ name: `B${i}`, number: `${200+i}` }))
            
            writer.skaters()

            validateResult()

        })
    })
})