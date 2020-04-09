const XLP = require('xlsx-populate')
const sbTemplate = require('../assets/2018statsbook.json')
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
        this.lineupsAndScore()
        this.gameClock()
        this.colophon(version)
    }


    writeFile(filename) {
        return this.workbook.toFileAsync(filename)
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
            const teamSkaters = Object.values(skaters[team])

            teamSkaters.forEach((skater) => {
                const name = skater.name
                const number = skater.number
                const row = skater.row

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

                Object.keys(team).forEach((skaterId) => {
                    const skater = team[skaterId]
                    const crgSkater = crgTeam.skaters.find(s => s.id === skaterId)

                    const penaltyRow = firstPenaltyCell.r + (skater.row * 2)
                    const jamRow = firstJamCell.r + (skater.row * 2)

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

    lineupAndScore() {
        // Process lineups - add jammers to the score sheet and everyone else to the lineup tab
        const scoreSheet = this.workbook.sheet(sbTemplate.score.sheetName)
        const lineupSheet = this.workbook.sheet(sbTemplate.lineups.sheetName)
        const boxCodes = sbTemplate.lineups.boxCodes


        let    jamCells = { home: {}, away: {} },
            jammerCells = { home: {}, away: {} },
            lineupJammerCells = { home: {}, away: {} },
            lineupNoPivotCells = { home: {}, away: {} },
            lineupPivotCells = { home: {}, away: {} },
            firstTripCells = { home: {}, away: {} },
            firstLostCells = { home: {}, away: {} },
            firstLeadCells = { home: {}, away: {} },
            firstCallCells = { home: {}, away: {} },
            firstInjCells = { home: {}, away: {} },
            firstNpCells = { home: {}, away: {} },
            blockerRe = /Blocker(\d)/,
            starPassTrip = -1,
            hasInitialPoints = false,
            pivotID = undefined,
            pivotNumber = ''

        this.crgData.periods.forEach((period) => {
            const scoreCells = initializeCells('score', period.period)
            const lineupCells = initializeCells('lineup', period.period)

            period.jams.forEach((jam) => {
                const jamNumber = jam.jam
                const starPass = [false, false]

                teamNames.forEach((team, t) => {
                    const jamTeamData = jam.teams[t]
                    starPass[t] = jamTeamData.starPass

                })

                if(starPass.includes(true)) {
                    teamNames.forEach((team, t) => {
                        if(!starPass[t]) {
                            advanceRow(scoreCells, team, 1)
                            advanceRow(lineupCells, team, 1)
                            scoreSheet.row(scoreCells.jam[team].r).cell(scoreCells.jam[team].c).value('SP*')
                        }
                    })
                }

                teamNames.forEach((team) => {
                    advanceRow(scoreCells, team, 1)
                    advanceRow(lineupCells, team, 1)
                })
            })
        })
        for (let p in crgData.periods) {
            // For each period
            let period = crgData.periods[p].period
            


            // Get the starting cells         
            teamNames.forEach(team => {
                jamCells[team] = rowcol(sbTemplate.score[period][team].firstJamNumber)
                jammerCells[team] = rowcol(sbTemplate.score[period][team].firstJammerNumber)
                lineupJammerCells[team] = rowcol(sbTemplate.lineups[period][team].firstJammer)
                lineupPivotCells[team] = { r: lineupJammerCells[team].r, c: lineupJammerCells[team].c + boxCodes + 1 }
                lineupNoPivotCells[team] = rowcol(sbTemplate.lineups[period][team].firstNoPivot)
                firstTripCells[team] = rowcol(sbTemplate.score[period][team].firstTrip)
                firstLostCells[team] = rowcol(sbTemplate.score[period][team].firstLost)
                firstLeadCells[team] = rowcol(sbTemplate.score[period][team].firstLead)
                firstCallCells[team] = rowcol(sbTemplate.score[period][team].firstCall)
                firstInjCells[team] = rowcol(sbTemplate.score[period][team].firstInj)
                firstNpCells[team] = rowcol(sbTemplate.score[period][team].firstNp)
            })

            for (let j in crgData.periods[p].jams) {
                // For each jam

                // Retrieve the common jam number.
                let jamNumber = crgData.periods[p].jams[j].jam
                let starPass = [false, false]

                for (let t in teamNames) {
                    // For each team
                    let team = teamNames[t]
                    let jamTeamData = crgData.periods[p].jams[j].teams[t]
                    starPass[t] = jamTeamData.starPass
                    starPassTrip = jamTeamData.starPassTrip

                    // Retrieve the jammer number.
                    let jammerList = jamTeamData.skaters.filter(
                        x => x.position == 'Jammer'
                    )
                    // The jammer ID is undefined if no jammer was entered in this jam
                    let jammerID = (jammerList.length > 0 ? jammerList[0].id : undefined)

                    // Should return '' for jammer number if the jammer was not entered
                    // OR if the selected jammer is not present in the skater list.
                    let jammerNumber =
                        jammerID && skaters[teamNames[t]].hasOwnProperty(jammerID) ?
                            skaters[teamNames[t]][jammerID].number : '?'
                    // If XLSX-populate ever adds support for comments, add code here to
                    // make a cell comment

                    // Add the jam number and jammer number to scores
                    scoreSheet.row(jamCells[team].r).cell(jamCells[team].c).value(jamNumber)
                    scoreSheet.row(jammerCells[team].r).cell(jammerCells[team].c).value(jammerNumber)

                    // Add version 4.0 data to the score sheet, if present
                    if (Object.prototype.hasOwnProperty.call(jamTeamData, 'trips')) {
                        let scoringTrips = jamTeamData.trips
                        let trip10Points = []
                        hasInitialPoints = scoringTrips.length && scoringTrips[0].score > 0

                        // Score Checkboxes for all cases
                        // (Don't try to be clever with ternary operators - don't even TOUCH cells that need to be empty)
                        if (jamTeamData.lost) {
                            scoreSheet.row(firstLostCells[team].r).cell(firstLostCells[team].c).value('X')
                        }
                        if (jamTeamData.lead) {
                            scoreSheet.row(firstLeadCells[team].r).cell(firstLeadCells[team].c).value('X')
                        }
                        if (jamTeamData.call) {
                            scoreSheet.row(firstCallCells[team].r).cell(firstCallCells[team].c).value('X')
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
                                row = scoreSheet.row(firstTripCells[team].r)
                            } else {
                                row = scoreSheet.row(firstTripCells[team].r + 1)
                            }

                            // Add trip scores to sheet for initial jammer
                            row.cell(firstTripCells[team].c + t - 1).value(scoringTrips[t].score)
                        }

                        if (trip10Points.length) {
                            // If someone starpasses on trip 11+, this logic doesn't work
                            // but also, no guidance is given in the manual on this, so it's #magicland anyways
                            if (trip10Points[0].tripBy === 'Jammer') {
                                row = scoreSheet.row(firstTripCells[team].r)
                            } else {
                                row = scoreSheet.row(firstTripCells[team].r + 1)
                            }

                            const trip10Cell = row.cell(firstTripCells[team].c + 8)
                            const formula = trip10Points.map(t => t.score).join('+')
                            trip10Cell.formula(formula)
                        }

                        if (hasInitialPoints && scoringTrips.length) {
                            let trip = scoringTrips[0]
                            if (trip.tripBy === 'Jammer') {
                                row = scoreSheet.row(firstTripCells[team].r)
                            } else {
                                row = scoreSheet.row(firstTripCells[team].r + 1)
                            }

                            let value = `${scoringTrips[0].score}`

                            if (scoringTrips[1]) {
                                value = `${value}+${scoringTrips[1].score}`
                            } else {
                                value = `${value}+0`
                            }

                            row.cell(firstTripCells[team].c).formula(value)
                        }

                        if (!starPass[t]) {
                            // No Star Pass Scoring and Lineup Data

                            if (jamTeamData.injury) {
                                scoreSheet.row(firstInjCells[team].r).cell(firstInjCells[team].c).value('X')
                            }

                            // cannot mark no initial if initial points are present
                            if (jamTeamData.noInitial && !hasInitialPoints) {
                                scoreSheet.row(firstNpCells[team].r).cell(firstNpCells[team].c).value('X')
                            }



                            if (jammerList[0] && jammerList[0].hasOwnProperty('boxTripSymbols')) {
                                for (let sym in jammerList[0].boxTripSymbols[0]) {
                                    lineupSheet
                                        .row(lineupJammerCells[team].r)
                                        .cell(lineupJammerCells[team].c + 1 + parseInt(sym))
                                        .value(jammerList[0].boxTripSymbols[0][sym])
                                }
                            }

                        } else {
                            // Star Pass Score Checkboxes
                            if (jamTeamData.noInitial) {
                                scoreSheet.row(firstNpCells[team].r).cell(firstNpCells[team].c).value('X')
                                scoreSheet.row(firstNpCells[team].r + 1).cell(firstNpCells[team].c).value('X')
                            } else if (starPassTrip == 1) {
                                scoreSheet.row(firstNpCells[team].r).cell(firstNpCells[team].c).value('X')
                            }
                            scoreSheet.row(firstInjCells[team].r + 1).cell(firstInjCells[team].c).value(jamTeamData.inj ? 'X' : '')

                            // Star pass box trips
                            if (jammerList[0] && jammerList[0].hasOwnProperty('boxTripSymbols')) {
                                for (let sym in jammerList[0].boxTripSymbols[1]) {
                                    lineupSheet
                                        .row(lineupPivotCells[team].r)
                                        .cell(lineupPivotCells[team].c + 1 + parseInt(sym))
                                        .value(jammerList[0].boxTripSymbols[1][sym])
                                }
                            }

                        }

                    }

                    // Retrieve the pivot number.
                    let pivotList = jamTeamData.skaters.filter(
                        x => x.position == 'Pivot'
                    )

                    if (pivotList.length > 0) {
                        // If there is a pivot, add them to lineups
                        pivotID = pivotList[0].id
                        pivotNumber = pivotID && skaters[teamNames[t]].hasOwnProperty(pivotID)
                            ? skaters[teamNames[t]][pivotID].number
                            : ''
                        // If XLSX-populate ever adds support for comments, change this 
                        // to make a cell comment.
                        if (pivotNumber == '' && pivotList[0].comment != '') {
                            pivotNumber = pivotList[0].comment
                        }
                        lineupSheet
                            .row(lineupPivotCells[team].r)
                            .cell(lineupPivotCells[team].c)
                            .value(pivotNumber)

                        if (pivotList[0].hasOwnProperty('boxTripSymbols')) {
                            // Add pre star pass box trips for the pivot
                            for (let sym in pivotList[0].boxTripSymbols[0]) {
                                lineupSheet
                                    .row(lineupPivotCells[team].r)
                                    .cell(lineupPivotCells[team].c + 1 + parseInt(sym))
                                    .value(pivotList[0].boxTripSymbols[0][sym])
                            }

                            // Add post star pass box trips for the pivot
                            if (starPass[t]) {
                                for (let sym in pivotList[0].boxTripSymbols[1]) {
                                    lineupSheet
                                        .row(lineupJammerCells[team].r + 1)
                                        .cell(lineupJammerCells[team].c + 1 + parseInt(sym))
                                        .value(pivotList[0].boxTripSymbols[1][sym])
                                }
                            }
                        }
                    } else {
                        pivotID = undefined
                        pivotNumber = ''
                    }

                    // Retrieve the blocker numbers
                    let blockerList = jamTeamData.skaters.filter(
                        x => blockerRe.test(x.position)
                    )

                    let firstBlockerOffset = 1
                    if (blockerList.length > 3 && pivotID == undefined) {
                        // If there are more than three blockers and the pivot is undefined, start entering blockers in the pivot box
                        lineupSheet.row(lineupNoPivotCells[team].r).cell(lineupNoPivotCells[team].c).value('X')
                        firstBlockerOffset = 0
                    }

                    for (let b = 0; (b < 4 && b < blockerList.length); b++) {
                        // Add blockers to statsbook
                        let blockerID = blockerList[b].id
                        let blockerNumber = skaters[teamNames[t]].hasOwnProperty(blockerID)
                            ? skaters[teamNames[t]][blockerID].number
                            : ''
                        // If XLSX-populate ever adds support for comments, change this 
                        // to make a cell comment.
                        if (blockerNumber == '' && blockerList[b].comment != '') {
                            blockerNumber = blockerList[b].comment
                        }
                        lineupSheet
                            .row(lineupPivotCells[team].r)
                            .cell(lineupPivotCells[team].c + (b + firstBlockerOffset) * (boxCodes + 1))
                            .value(blockerNumber)

                        // Box trips
                        if (blockerList[b].hasOwnProperty('boxTripSymbols')) {
                            for (let sym in blockerList[b].boxTripSymbols[0]) {
                                lineupSheet
                                    .row(lineupPivotCells[team].r)
                                    .cell(lineupPivotCells[team].c + (b + firstBlockerOffset) * (boxCodes + 1) + 1 + parseInt(sym))
                                    .value(blockerList[b].boxTripSymbols[0][sym])
                            }

                            if (starPass[t]) {
                                for (let sym in blockerList[b].boxTripSymbols[1]) {
                                    lineupSheet
                                        .row(lineupPivotCells[team].r + 1)
                                        .cell(lineupPivotCells[team].c + (b + firstBlockerOffset) * (boxCodes + 1) + 1 + parseInt(sym))
                                        .value(blockerList[b].boxTripSymbols[1][sym])
                                }
                            }
                        }


                    }

                    rewriteLineupRow(team)

                    // If there's a star pass on THIS team, add an SP and the pivot's number to scores and lineups
                    if (starPass[t]) {
                        jamCells[team].r += 1
                        jammerCells[team].r += 1
                        lineupJammerCells[team].r += 1
                        lineupPivotCells[team].r += 1
                        lineupNoPivotCells[team].r += 1
                        firstTripCells[team].r += 1
                        firstLeadCells[team].r += 1
                        firstLostCells[team].r += 1
                        firstCallCells[team].r += 1
                        firstInjCells[team].r += 1
                        firstNpCells[team].r += 1

                        scoreSheet.row(jamCells[team].r).cell(jamCells[team].c).value('SP')
                        scoreSheet.row(jammerCells[team].r).cell(jammerCells[team].c).value(pivotNumber)
                        lineupSheet.row(lineupNoPivotCells[team].r).cell(lineupNoPivotCells[team].c).value('X')
                        lineupSheet.row(lineupPivotCells[team].r).cell(lineupPivotCells[team].c).value(jammerNumber)

                        for (let b = 0; (b < 3 && b < blockerList.length); b++) {
                            // Add blockers to star pass line
                            let blockerID = blockerList[b].id
                            let blockerNumber = skaters[teamNames[t]].hasOwnProperty(blockerID)
                                ? skaters[teamNames[t]][blockerID].number
                                : ''
                            lineupSheet
                                .row(lineupPivotCells[team].r)
                                .cell(lineupPivotCells[team].c + (b + 1) * (boxCodes + 1))
                                .value(blockerNumber)
                        }

                        rewriteLineupRow(team)
                    }
                }

                // Check for opposite team star passes
                if (starPass.includes(true)) {
                    for (let t in teamNames) {
                        if (!starPass[t]) {
                            // If one team does NOT have a star pass, but a star pass exists:
                            let team = teamNames[t]

                            jamCells[team].r += 1
                            jammerCells[team].r += 1
                            lineupJammerCells[team].r += 1
                            lineupPivotCells[team].r += 1
                            lineupNoPivotCells[team].r += 1
                            firstTripCells[team].r += 1
                            firstLeadCells[team].r += 1
                            firstLostCells[team].r += 1
                            firstCallCells[team].r += 1
                            firstInjCells[team].r += 1
                            firstNpCells[team].r += 1

                            scoreSheet.row(jamCells[team].r).cell(jamCells[team].c).value('SP*')
                        }
                    }
                }

                for (let t in teamNames) {
                    let team = teamNames[t]
                    jamCells[team].r += 1
                    jammerCells[team].r += 1
                    lineupJammerCells[team].r += 1
                    lineupPivotCells[team].r += 1
                    lineupNoPivotCells[team].r += 1
                    firstTripCells[team].r += 1
                    firstLeadCells[team].r += 1
                    firstLostCells[team].r += 1
                    firstCallCells[team].r += 1
                    firstInjCells[team].r += 1
                    firstNpCells[team].r += 1
                }

            }
        }
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

function rowcol(rcstring) {
    // Return row and col as 1 indexed numbers
    let [, colstr, rowstr] = /([a-zA-Z]+)([\d]+)/.exec(rcstring)
    let row = parseInt(rowstr)
    let col = colstr.split('').reduce((r, a) => r * 26 + parseInt(a, 36) - 9, 0)
    let robj = { r: row, c: col }
    return robj
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

module.exports = initialize