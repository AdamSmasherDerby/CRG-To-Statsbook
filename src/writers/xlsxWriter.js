const XLP = require('xlsx-populate')
const sbTemplate = require('../assets/2018statsbook.json')
const rowcol = require('../helpers/rowcol')
const teamNames = ['home', 'away']
const periods = [1, 2]

class XlsxWriter {
    constructor(workbook, newBook) {
        this.workbook = workbook
        this.newBook = newBook
    }

    processGameData(crgData, skaters, version) {
        this.crgData = crgData
        if (this.newBook) {
            this.gameInfo()
        }

        this.skaters(skaters)
        this.penalties(skaters)
        this.lineupsAndScore(skaters)
        this.gameClock()
        this.colophon(version)
    }


    writeFile(filename) {
        return this.workbook.toFileAsync(filename).then(() => filename)
    }

    gameInfo() {
        const sheet = this.workbook.sheet(sbTemplate.mainSheet)

        sheet.cell(sbTemplate.date).value(this.crgData.identifier.substr(0, 10))
        sheet.cell(sbTemplate.time).value(this.crgData.identifier.slice(11, 16))

        this.crgData.teams.forEach((team, idx) => {
            const nameCell = sbTemplate.teams[teamNames[idx]].league
            sheet.cell(nameCell).value(team.name)

        })
    }

    skaters(skaters) {


        teamNames.forEach((team) => {
            const teamSheet = sbTemplate.teams[team].sheetName
            const sheet = this.workbook.sheet(teamSheet)

            const numberCell = rowcol(sbTemplate.teams[team].firstNumber)
            const nameCell = rowcol(sbTemplate.teams[team].firstName)
            const maxNum = sbTemplate.teams[team].maxNum
            const teamSkaters = skaters[team]

            teamSkaters.forEach((skater, row) => {
                const name = skater.name
                const number = skater.number

                sheet.row(numberCell.r + row).cell(numberCell.c).value(number)
                sheet.row(nameCell.r + row).cell(nameCell.c).value(name)
            })


            // remove remaining values (if any) in the skater section of the IGRF
            for (let s = teamSkaters.length; s < maxNum; s++) {
                let row = numberCell.r
                sheet.row(row + s).cell(numberCell.c).value('')
                sheet.row(row + s).cell(nameCell.c).value('')
            }
        })
    }

    penalties(skaters) {
        // Update the penalty data in the statsbook from the CRG data
        const sheet = this.workbook.sheet(sbTemplate.penalties.sheetName)
        const expRe = /EXP-(\w)/

        teamNames.forEach((teamName, teamIdx) => {
            const team = skaters[teamName]
            const crgTeam = this.crgData[teamIdx]

            periods.forEach((period) => {
                const template = sbTemplate.penalties[period][teamName]

                const firstPenaltyCell = rowcol(template.firstPenalty)
                const firstJamCell = rowcol(template.firstJam)

                const firstFOCell = rowcol(template.firstFO)
                const firstFOJamCell = rowcol(template.firstFOJam)

                team.forEach((skater, row) => {
                    const skaterId = skater.id
                    const crgSkater = crgTeam.skaters.find(s => s.id === skaterId)

                    const penaltyRow = firstPenaltyCell.r + (row * 2)
                    const jamRow = firstJamCell.r + (row * 2)

                    let lastPenaltyCode = 'EXP'

                    if (crgSkater && crgSkater.penalties.length) {
                        const penalties = crgSkater.penalties
                        lastPenaltyCode = penalties[penalties.length - 1].code

                        let priorPenalties = penalties.filter(x => x.period < period).length

                        let penaltyCol = firstPenaltyCell.c + priorPenalties
                        let jamCol = firstJamCell.c + priorPenalties

                        penalties
                            .filter(x => x.period === period)
                            .forEach((penalty) => {

                                sheet.row(penaltyRow).cell(penaltyCol).value(penalty.code)
                                sheet.row(jamRow).cell(jamCol).value(penalty.jam)

                                penaltyCol += 1
                                jamCol += 1
                            })

                        if (crgSkater
                            && crgSkater.fo_exp
                            && crgSkater.fo_exp.period == period
                        ) {
                            const crgCode = crgSkater.fo_exp.code
                            let code

                            if (crgCode === 'FO') {
                                code = 'FO'
                            } else if (expRe.exec(crgCode) != null) {
                                code = expRe.exec(crgCode)[1]
                            } else if (crgCode == 'EXP') {
                                code = lastPenaltyCode
                            } else if (/^[ABCDEFGHILMNPX]{1}/.test(crgCode)) {
                                code = crgCode
                            } else {
                                code = '??'
                            }

                            let jam = crgSkater.fo_exp.jam
                            sheet.row(penaltyRow).cell(firstFOCell.c).value(code)
                            sheet.row(jamRow).cell(firstFOJamCell.c).value(jam)
                        }
                    }
                })
            })
        })
    }

    lineupAndScore(skaters) {
        // Process lineups - add jammers to the score sheet and everyone else to the lineup tab
        const scoreSheet = this.workbook.sheet(sbTemplate.score.sheetName)
        const lineupSheet = this.workbook.sheet(sbTemplate.lineups.sheetName)
        const boxCodes = sbTemplate.lineups.boxCodes
        const blockerRe = /Blocker(\d)/

        this.crgData.periods.forEach((period) => {
            const scoreCells = initializeCells('score', period.period)
            const lineupCells = initializeCells('lineup', period.period)

            period.jams.forEach((jam) => {
                const jamNumber = jam.jam
                const starPass = [false, false]

                teamNames.forEach((team, t) => {
                    const jamTeamData = jam.teams[t]
                    starPass[t] = jamTeamData.starPass
                    const starPassTrip = jamTeamData.starPassTrip

                    const jammer = jamTeamData.skaters.find((x) => x.position === 'Jammer')
                    const jammerNumber = getSkaterNumber(skaters, team, jammer)

                    const pivot = jamTeamData.skaters.find((x) => x.position === 'Pivot')
                    const pivotNumber = getSkaterNumber(skaters, team, pivot)

                    const blockers = jamTeamData.skaters.filter((x) => blockerRe.test(x.position)).slice(0,4)
                    
                    getCell(scoreSheet, scoreCells.jam[team]).value(jamNumber)
                    getCell(scoreSheet, scoreCells.jammer[team]).value(jammerNumber)

                    if (Object.prototype.hasOwnProperty.call(jamTeamData, 'trips')) {
                        let scoringTrips = jamTeamData.trips
                        let trip10Points = []
                        let hasInitialPoints = scoringTrips.length && scoringTrips[0].score > 0

                        // Score Checkboxes for all cases
                        // (Don't try to be clever with ternary operators - don't even TOUCH cells that need to be empty)
                        if (jamTeamData.lost) {
                            getCell(scoreSheet, scoreCells.lost).value('X')
                        }
                        if (jamTeamData.lead) {
                            getCell(scoreSheet, scoreCells.lead).value('X')
                        }
                        if (jamTeamData.call) {
                            getCell(scoreSheet, scoreCells.call).value('X')
                        }

                        // if length > 10 means more than 11 trips
                        // important note: this is > instead of >= on purpose
                        // if there are exactly 10 trips, the formula logic should not trigger
                        if (scoringTrips.length > 10) {
                            trip10Points = scoringTrips.slice(9)
                            scoringTrips = scoringTrips.slice(0, 9)
                        }

                        let row
                        // Scoring Trip Data for all cases
                        for (let t = 1; t < scoringTrips.length; t++) {

                            let trip = scoringTrips[t]

                            if (trip.tripBy === 'Jammer') {
                                row = scoreSheet.row(scoreCells.trip[team].r)
                            } else {
                                row = scoreSheet.row(scoreCells.trip[team].r + 1)
                            }

                            // Add trip scores to sheet for initial jammer
                            row.cell(scoreCells.trip[team].c + t - 1).value(scoringTrips[t].score)
                        }

                        if (trip10Points.length) {
                            // If someone starpasses on trip 11+, this logic doesn't work
                            // but also, no guidance is given in the manual on this, so it's #magicland anyways
                            if (trip10Points[0].tripBy === 'Jammer') {
                                row = scoreSheet.row(scoreCells.trip[team].r)
                            } else {
                                row = scoreSheet.row(scoreCells.trip[team].r + 1)
                            }

                            const trip10Cell = row.cell(scoreCells.trip[team].c + 8)
                            const formula = trip10Points.map(t => t.score).join('+')
                            trip10Cell.formula(formula)
                        }

                        if (hasInitialPoints && scoringTrips.length) {
                            let trip = scoringTrips[0]
                            if (trip.tripBy === 'Jammer') {
                                row = scoreSheet.row(scoreCells.trip[team].r)
                            } else {
                                row = scoreSheet.row(scoreCells.trip[team].r + 1)
                            }

                            let value = `${scoringTrips[0].score}`

                            if (scoringTrips[1]) {
                                value = `${value}+${scoringTrips[1].score}`
                            } else {
                                value = `${value}+0`
                            }

                            row.cell(scoreCells.trip[team].c).formula(value)
                        }

                        if (!starPass[t]) {
                            // No Star Pass Scoring and Lineup Data

                            if (jamTeamData.injury) {
                                getCell(scoreSheet, scoreCells.inj[team]).value('X')
                            }

                            // cannot mark no initial if initial points are present
                            if (jamTeamData.noInitial && !hasInitialPoints) {
                                getCell(scoreSheet, scoreCells.np[team]).value('X')
                            }


                            writeBoxTrips(lineupSheet, lineupCells.jammer, jammer, false, 0)

                        } else {
                            // Star Pass Score Checkboxes
                            if (jamTeamData.noInitial) {
                                getCell(scoreSheet, scoreCells.np[team]).value('X')
                                getCell(scoreSheet, scoreCells.np[team], 1).value('X')
                            } else if (starPassTrip == 1) {
                                getCell(scoreSheet, scoreCells.np[team]).value('X')
                            }

                            if(jamTeamData.inj) {
                                getCell(scoreSheet, scoreCells.inj[team]).value('X')
                            }

                            if (jammer && Object.prototype.hasOwnProperty.call(jammer, 'boxTripSymbols')) {
                                for (let sym in jammer.boxTripSymbols[1]) {
                                    lineupSheet
                                        .row(lineupCells.pivot[team].r)
                                        .cell(lineupCells.pivot[team].c + 1 + parseInt(sym))
                                        .value(jammer.boxTripSymbols[1][sym])
                                }
                            }

                        }

                    }

                    if (pivot) {
                        lineupSheet
                            .row(lineupCells.pivot[team].r)
                            .cell(lineupCells.pivot[team].c)
                            .value(pivotNumber)

                        writeBoxTrips(lineupSheet, lineupSheet.pivot, pivot, starPass, 0)
                    }

                    if(blockers.length) {
                        let offset
                        if(blockers.length === 4 && pivotNumber === '?') {
                            lineupSheet.row(lineupCells.noPivot[team].r).cell(lineupCells.noPivot[team].c).value('X')
                            offset = 0
                        } else {
                            offset = 1
                        }

                        blockers.forEach((blocker, b) => {
                            // Add blockers to statsbook
                            const blockerNumber = getSkaterNumber(skaters, team, blocker)
                            const blockerOffset = (b + offset) * (boxCodes + 1)

                            getCell(lineupSheet, lineupCells.pivot, 0, blockerOffset)
                                .value(blockerNumber)
    
                            writeBoxTrips(lineupSheet, lineupCells.pivot, blocker, starPass[t], blockerOffset)
                        })

                        rewriteLineupRow(lineupSheet, lineupCells.pivot[team])
                    }

                    if(starPass[t]) {
                        advanceRow(scoreCells, team, 1)
                        advanceRow(lineupCells, team, 1)

                        getCell(scoreSheet, scoreCells.jam[team]).value('SP')
                        getCell(scoreSheet, scoreCells.jammer[team]).value(pivotNumber)
                        getCell(lineupSheet, lineupCells.noPivot[team]).value('X')
                        getCell(lineupSheet, lineupCells.pivot).value(jammerNumber)

                        blockers.forEach((blocker, b) => {
                            // Add blockers to star pass line
                            const blockerNumber = getSkaterNumber(skaters, team, blocker)
                            const blockerOffset = (b + 1) * (boxCodes + 1)

                            getCell(lineupSheet, lineupCells.pivot, 0, blockerOffset).value(blockerNumber)
                        })

                        rewriteLineupRow(lineupSheet, lineupCells.pivot[team])
                    }
                })

                if(starPass.includes(true)) {
                    teamNames.forEach((team, t) => {
                        if(!starPass[t]) {
                            advanceRow(scoreCells, team, 1)
                            advanceRow(lineupCells, team, 1)
                            getCell(scoreSheet,scoreCells.jam[team]).value('SP*')
                        }
                    })
                }

                teamNames.forEach((team) => {
                    advanceRow(scoreCells, team, 1)
                    advanceRow(lineupCells, team, 1)
                })
            })
        })
    }

    gameClock() {
        const sheet = this.workbook.sheet(sbTemplate.clock.sheetName)

        this.crgData.periods.forEach((period) => {
            const jamTimeCell = rowcol(sbTemplate.clock[period.period].firstJamTime)

            period.jams.forEach((jam) => {
                const jamTime = jam.jamLengthSeconds
                if (jamTime) {
                    sheet.row(jamTimeCell.r).cell(jamTimeCell.c).value(jamTime)
                    jamTimeCell.r += 1
                }
            })
        })
    }

    colophon(version) {
        const colophonSheet = sbTemplate.colophon.sheetName
        const versionCell = sbTemplate.colophon.versionCell
        const versionText = `Statsbook generated by CRG to Statsbook Tool version ${version}`

        this.workbook.sheet(colophonSheet).cell(versionCell).value(versionText)
    }
}

function initialize(filename, newSB) {
    return XLP.fromFileAsync(filename)
        .then((workbook) => new XlsxWriter(workbook, newSB))
}


const cellTypes = {
    score: [
        { key: 'jam', templateKey: 'firstJamNumber' },
        { key: 'jammer', templateKey: 'firstJammerNumber' },
        { key: 'trip', templateKey: 'firstTrip' },
        { key: 'lost', templateKey: 'firstLost' },
        { key: 'lead', templateKey: 'firstLead' },
        { key: 'call', templateKey: 'firstCall' },
        { key: 'inj', templateKey: 'firstInj' },
        { key: 'np', templateKey: 'firstNp'}
    ],
    lineup: [ 
        { key: 'jam', templateKey: 'firstJamNumber' },
        { key: 'jammer', templateKey: 'firstJammer' },
        { key: 'noPivot', templateKey: 'firstNoPivot' }
    ]
}

/*
                lineupJammerCells[team] = rowcol(sbTemplate.lineups[period][team].firstJammer)
                lineupPivotCells[team] = { r: lineupJammerCells[team].r, c: lineupJammerCells[team].c + boxCodes + 1 }
                lineupNoPivotCells[team] = rowcol(sbTemplate.lineups[period][team].firstNoPivot)
*/
function getCell(sheet, address, rowOffset = 0, colOffset = 0) {
    return sheet
        .row(address.r + rowOffset)
        .cell(address.c + colOffset)
}

function writeBoxTrips(sheet, address, skater, starPass, offset) {
    // Box trips
    if (Object.prototype.hasOwnProperty.call(skater, 'boxTripSymbols')) {
        for (let sym in skater.boxTripSymbols[0]) {
            let tripOffset = offset + 1 + parseInt(sym)
            getCell(sheet, address, 0, tripOffset)
                .value(skater.boxTripSymbols[0][sym])
        }

        if (starPass) {
            for (let sym in skater.boxTripSymbols[1]) {
                let tripOffset = offset + 1 + parseInt(sym)
                getCell(sheet, address, 1, tripOffset)
                    .value(skater.boxTripSymbols[1][sym])
            }
        }
    }
}

function rewriteLineupRow(sheet, address) {
    const boxCodes = sbTemplate.lineups.boxCodes

    for (let b = 0; b < 4; b++) {
        // Rewrite the blocker numbers whether or not values were entered.
        // This is to account for an Excel bug that breaks conditional formatting.
        let blockerNumber = sheet
            .row(address.r)
            .cell(address.c + b * (boxCodes + 1))
            .value()
        blockerNumber = (blockerNumber == undefined ? '' : blockerNumber.toString())
        sheet
            .row(address.r)
            .cell(address.c + b * (boxCodes + 1))
            .value(blockerNumber)
    }
}


function initializeCells(sheet, period) {
    const template = sbTemplate.score[period]
    const result = {}

    cellTypes[sheet].forEach((type) => {
        result[type.key] = { 
            home: template.home[type.templateKey], 
            away: template.away[type.templateKey],
        }
    })

    return result
}

function advanceRow(cells, team, count) {
    Object.keys(cells).forEach((key) => {
        cells[key][team].r += count
        cells[key][team].r += count
    })
}

function getSkaterNumber(skaters, team, skater) {
    let number
    if(skater && skater.id && Object.prototype.hasOwnProperty.call(skaters[team], skater.id)) {
        number = skaters[team][skater.id].number
    } else if(skater && skater.comment) {
        // If XLSX-populate ever adds support for comments, change this 
        // to make a cell comment.
        number = skater.comment
    } else {
        number = '?'
    }

    return number
}

module.exports = initialize