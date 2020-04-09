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

    describe('penalty data', () => {
        it('handles normal penalty data', () => {
            writer.crgData = {
                teams: [
                    { 
                        name: 'Team A', 
                        skaters: [
                            {
                                id: 'aaa',
                                number: '100',
                                penalties: [
                                    { period: 1, jam: 2, code: 'P' },
                                    { period: 1, jam: 4, code: 'D' }
                                ]
                            },
                            {
                                id: 'bbb',
                                number: '101',
                                penalties: [
                                    { period: 1, jam: 1, code: 'X' }
                                ]
                            }
                        ]
                    },
                    {
                        name: 'Team B',
                        skaters: [
                            { 
                                id: 'ccc',
                                number: '200',
                                penalties: [ { period: 1, jam: 3, code: 'C' } ]
                            }
                        ]
                    }
                ]
            }

            skaters.home = [{ id: 'aaa', number: '100' }, { id: 'bbb', number: '101' }]
            skaters.away = [{ id: 'ccc', number: '200' }]


            writer.penalties()

            const sheets = specWrapper.sheetCache
            const names = Object.keys(sheets)
    
            expect(names).toEqual(['Penalties'])

            const values = sheets['Penalties'].values

            expect(values[4][2]).toEqual('P')
            expect(values[5][2]).toEqual(2)

            expect(values[4][3]).toEqual('D')
            expect(values[5][3]).toEqual(4)

            expect(values[6][2]).toEqual('X')
            expect(values[7][2]).toEqual(1)

            expect(values[4][17]).toEqual('C')
            expect(values[5][17]).toEqual(3)

            expect(values[3]).toBeUndefined()
            expect(values[8]).toBeUndefined()

            expect(values[4][4]).toBeUndefined()
            expect(values[4][18]).toBeUndefined()

        })

        it('handles "too many" penalties', () => {
            writer.crgData = {
                teams: [
                    { 
                        name: 'Team A', 
                        skaters: [
                            {
                                id: 'aaa',
                                number: '100',
                                penalties: [
                                    { period: 1, jam: 2, code: 'P' },
                                    { period: 1, jam: 4, code: 'D' }
                                ]
                            },
                            {
                                id: 'bbb',
                                number: '101',
                                penalties: [
                                    { period: 1, jam: 1, code: 'A' },
                                    { period: 1, jam: 2, code: 'B' },
                                    { period: 1, jam: 3, code: 'C' },
                                    { period: 1, jam: 4, code: 'D' },
                                    { period: 1, jam: 5, code: 'F' },
                                    { period: 1, jam: 6, code: 'G' },
                                    { period: 1, jam: 7, code: 'H' },
                                    { period: 1, jam: 8, code: 'I' },
                                    { period: 1, jam: 9, code: 'M' },
                                    { period: 1, jam: 10, code: 'N' }

                                ]
                            }
                        ]
                    },
                    {
                        name: 'Team B',
                        skaters: [
                            { 
                                id: 'ccc',
                                number: '200',
                                penalties: [ { period: 1, jam: 3, code: 'C' } ]
                            }
                        ]
                    }
                ]
            }

            skaters.home = [{ id: 'aaa', number: '100' }, { id: 'bbb', number: '101' }]
            skaters.away = [{ id: 'ccc', number: '200' }]


            writer.penalties()

            const sheets = specWrapper.sheetCache
            const names = Object.keys(sheets)
    
            expect(names).toEqual(['Penalties'])

            const values = sheets['Penalties'].values

            expect(values[6][2]).toEqual('A')
            expect(values[7][2]).toEqual(1)

            expect(values[6][10]).toEqual('M')
            expect(values[7][10]).toEqual(9)

            expect(values[6][11]).toBeUndefined()
            expect(values[7][11]).toBeUndefined()
        })

        it('handles 1st period/2nd period offsets', () => {
            writer.crgData = {
                teams: [
                    { 
                        name: 'Team A', 
                        skaters: [
                            {
                                id: 'aaa',
                                number: '100',
                                penalties: [
                                    { period: 1, jam: 2, code: 'P' },
                                    { period: 2, jam: 4, code: 'D' }
                                ]
                            },
                            {
                                id: 'bbb',
                                number: '101',
                                penalties: [
                                    { period: 2, jam: 1, code: 'X' }
                                ]
                            }
                        ]
                    },
                    {
                        name: 'Team B',
                        skaters: [
                            { 
                                id: 'ccc',
                                number: '200',
                                penalties: [ 
                                    { period: 2, jam: 3, code: 'C' },
                                    { period: 2, jam: 5, code: 'A' }
                                ]
                            }
                        ]
                    }
                ]
            }

            skaters.home = [{ id: 'aaa', number: '100' }, { id: 'bbb', number: '101' }]
            skaters.away = [{ id: 'ccc', number: '200' }]


            writer.penalties()

            const sheets = specWrapper.sheetCache
            const names = Object.keys(sheets)
    
            expect(names).toEqual(['Penalties'])

            const values = sheets['Penalties'].values

            expect(values[4][2]).toEqual('P')
            expect(values[5][2]).toEqual(2)

            expect(values[4][31]).toEqual('D')
            expect(values[5][31]).toEqual(4)

            expect(values[4][30]).toBeUndefined()
            expect(values[5][30]).toBeUndefined()

            expect(values[6][30]).toEqual('X')
            expect(values[7][30]).toEqual(1)

            expect(values[4][45]).toEqual('C')
            expect(values[5][45]).toEqual(3)

            expect(values[4][46]).toEqual('A')
            expect(values[5][46]).toEqual(5)
        })
        
        it('handles missing data', () => {
            writer.crgData = {
                teams: [
                    { 
                        name: 'Team A', 
                        skaters: [
                            {
                                id: 'aaa',
                                number: '100',
                                penalties: [
                                    { period: 1, jam: 2, code: 'Q' }
                                ]
                            },
                            {
                                id: 'bbb',
                                number: '101',
                                penalties: [
                                    { period: 1, jam: 3, code: undefined }
                                ]
                            }
                        ]
                    },
                    {
                        name: 'Team B',
                        skaters: [
                            { 
                                id: 'ccc',
                                number: '200',
                                penalties: [ 
                                    { period: 1, jam: undefined, code: 'C' },
                                ]
                            }
                        ]
                    }
                ]
            }

            skaters.home = [{ id: 'aaa', number: '100' }, { id: 'bbb', number: '101' }]
            skaters.away = [{ id: 'ccc', number: '200' }]

            writer.penalties()

            const sheets = specWrapper.sheetCache
            const names = Object.keys(sheets)
    
            expect(names).toEqual(['Penalties'])

            const values = sheets['Penalties'].values

            expect(values[4][2]).toEqual('Q')
            expect(values[5][2]).toEqual(2)

            expect(values[6][2]).toEqual('?')
            expect(values[7][2]).toEqual(3)

            expect(values[4][17]).toEqual('C')
            expect(values[5][17]).toEqual('?')
        })

        it('handles a missing skater data', () => {
            writer.crgData = {
                teams: [
                    { 
                        name: 'Team A', 
                        skaters: [
                            {
                                id: 'aaa',
                                number: '100',
                                penalties: [
                                    { period: 1, jam: 2, code: 'Q' }
                                ]
                            },
                            {
                                id: 'bbb',
                                number: '101',
                                penalties: [
                                    { period: 1, jam: 3, code: undefined }
                                ]
                            }
                        ]
                    },
                    {
                        name: 'Team B',
                        skaters: [
                            { 
                                id: 'ccc',
                                number: '200',
                                penalties: [ 
                                    { period: 1, jam: undefined, code: 'C' },
                                ]
                            }
                        ]
                    }
                ]
            }

            skaters.home = [{ id: 'aaa', number: '100' }]
            skaters.away = []

            writer.penalties()

            const sheets = specWrapper.sheetCache
            const names = Object.keys(sheets)
    
            expect(names).toEqual(['Penalties'])

            const values = sheets['Penalties'].values

            expect(values[4][2]).toEqual('Q')
            expect(values[5][2]).toEqual(2)

            expect(values[6]).toBeUndefined()
            expect(values[4][3]).toBeUndefined()
            
        })

        it('handles FO/EXP - FO', () => {
            writer.crgData = {
                teams: [
                    { 
                        name: 'Team A', 
                        skaters: [
                            {
                                id: 'aaa',
                                number: '100',
                                penalties: [
                                    { period: 1, jam: 2, code: 'A' }
                                ],
                                fo_exp: {
                                    period: 1,
                                    jam: 4,
                                    code: 'FO'
                                }
                            },
                        ]
                    },
                    {
                        name: 'Team B',
                        skaters: [
                        ]
                    }
                ]
            }

            skaters.home = [{ id: 'aaa', number: '100' }]
            skaters.away = []

            writer.penalties()

            const sheets = specWrapper.sheetCache
            const names = Object.keys(sheets)
    
            expect(names).toEqual(['Penalties'])

            const values = sheets['Penalties'].values

            expect(values[4][2]).toEqual('A')
            expect(values[5][2]).toEqual(2)

            expect(values[4][11]).toEqual('FO')
            expect(values[5][11]).toEqual(4)

            expect(values[4].length).toBe(12)
        })

        it('handles FO/EXP - Specific EXP', () => {
            writer.crgData = {
                teams: [
                    { 
                        name: 'Team A', 
                        skaters: [
                            {
                                id: 'aaa',
                                number: '100',
                                penalties: [
                                    { period: 1, jam: 2, code: 'A' }
                                ],
                                fo_exp: {
                                    period: 1,
                                    jam: 4,
                                    code: 'F'
                                }
                            },
                        ]
                    },
                    {
                        name: 'Team B',
                        skaters: [
                        ]
                    }
                ]
            }

            skaters.home = [{ id: 'aaa', number: '100' }]
            skaters.away = []

            writer.penalties()

            const sheets = specWrapper.sheetCache
            const names = Object.keys(sheets)
    
            expect(names).toEqual(['Penalties'])

            const values = sheets['Penalties'].values

            expect(values[4][2]).toEqual('A')
            expect(values[5][2]).toEqual(2)

            expect(values[4][11]).toEqual('F')
            expect(values[5][11]).toEqual(4)

            expect(values[4].length).toBe(12)
        })

        it('handles FO/EXP - General EXP', () => {
            writer.crgData = {
                teams: [
                    { 
                        name: 'Team A', 
                        skaters: [
                            {
                                id: 'aaa',
                                number: '100',
                                penalties: [
                                    { period: 1, jam: 2, code: 'A' }
                                ],
                                fo_exp: {
                                    period: 1,
                                    jam: 4,
                                    code: 'EXP'
                                }
                            },
                        ]
                    },
                    {
                        name: 'Team B',
                        skaters: [
                        ]
                    }
                ]
            }

            skaters.home = [{ id: 'aaa', number: '100' }]
            skaters.away = []

            writer.penalties()

            const sheets = specWrapper.sheetCache
            const names = Object.keys(sheets)
    
            expect(names).toEqual(['Penalties'])

            const values = sheets['Penalties'].values

            expect(values[4][2]).toEqual('A')
            expect(values[5][2]).toEqual(2)

            expect(values[4][11]).toEqual('A')
            expect(values[5][11]).toEqual(4)

            expect(values[4].length).toBe(12)
        })

        it('handles FO/EXP - Unknwon Code', () => {
            writer.crgData = {
                teams: [
                    { 
                        name: 'Team A', 
                        skaters: [
                            {
                                id: 'aaa',
                                number: '100',
                                penalties: [
                                    { period: 1, jam: 2, code: 'A' }
                                ],
                                fo_exp: {
                                    period: 1,
                                    jam: 4,
                                    code: 'Q'
                                }
                            },
                        ]
                    },
                    {
                        name: 'Team B',
                        skaters: [
                        ]
                    }
                ]
            }

            skaters.home = [{ id: 'aaa', number: '100' }]
            skaters.away = []

            writer.penalties()

            const sheets = specWrapper.sheetCache
            const names = Object.keys(sheets)
    
            expect(names).toEqual(['Penalties'])

            const values = sheets['Penalties'].values

            expect(values[4][2]).toEqual('A')
            expect(values[5][2]).toEqual(2)

            expect(values[4][11]).toEqual('??')
            expect(values[5][11]).toEqual(4)

            expect(values[4].length).toBe(12)
        })

        it('handles FO/EXP - Second Period FO', () => {
            writer.crgData = {
                teams: [
                    { 
                        name: 'Team A', 
                        skaters: [
                            {
                                id: 'aaa',
                                number: '100',
                                penalties: [
                                    { period: 1, jam: 2, code: 'A' },
                                    { period: 2, jam: 5, code: 'F' }
                                ],
                                fo_exp: {
                                    period: 2,
                                    jam: 4,
                                    code: 'G'
                                }
                            },
                        ]
                    },
                    {
                        name: 'Team B',
                        skaters: [
                        ]
                    }
                ]
            }

            skaters.home = [{ id: 'aaa', number: '100' }]
            skaters.away = []

            writer.penalties()

            const sheets = specWrapper.sheetCache
            const names = Object.keys(sheets)
    
            expect(names).toEqual(['Penalties'])

            const values = sheets['Penalties'].values

            expect(values[4][2]).toEqual('A')
            expect(values[5][2]).toEqual(2)

            expect(values[4][39]).toEqual('G')
            expect(values[5][39]).toEqual(4)

            expect(values[4][11]).toBeUndefined()
        })
    })

    describe('score and lineup data', () => {
        
    })
})