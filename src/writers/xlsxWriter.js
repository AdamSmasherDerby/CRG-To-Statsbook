const XLP = require('xlsx-populate')
const sbTemplate = require('../assets/2018statsbook.json')
const teamNames = ['home', 'away']
const periods = [1,2]

class XlsxWriter {
    constructor(workbook, newBook) {
        this.workbook = workbook
        this.newBook = newBook
    }

    processGameData(crgData, skaters) {
        this.crgData = crgData
        if (this.newBook) {
            this.gameInfo()
        }

        this.skaters(skaters)
        this.penalties()
        this.lineupsAndScore()
        this.colophon()
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
            const sheet = workbook.sheet(teamSheet)

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
                workbook.sheet(teamSheet).row(row + s).cell(numberCell.c).value('')
                workbook.sheet(teamSheet).row(row + s).cell(nameCell.c).value('')
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
                    const skater = team[skaterId];
                    const crgSkater = crgTeam.skaters.find(s => s.id === skaterId)

                    const penaltyRow = firstPenaltyCell.r + (skater.row * 2)
                    const jamRow = firstJamCell.r + (skater.row * 2)

                    let lastPenaltyCode = 'EXP'

                    if(skaterData && skaterData.penalties.length) {
                        const penalties = skaterData.penalties
                        lastPenaltyCode = penalties[penalties.length - 1].code
                        
                    }
                })
            })
        })
        for (let t in teamNames) {
            // For each team
            let teamName = teamNames[t]
            let team = skaters[teamName]

            for (let p = 1; p < 3; p++) {
                // For each period
                let firstPenaltyCell = rowcol(sbTemplate.penalties[p][teamName].firstPenalty)
                let pFirstCol = firstPenaltyCell.c

                let firstJamCell = rowcol(sbTemplate.penalties[p][teamName].firstJam)
                let jFirstCol = firstJamCell.c

                let firstFOCell = rowcol(sbTemplate.penalties[p][teamName].firstFO)
                let firstFOJamCell = rowcol(sbTemplate.penalties[p][teamName].firstFOJam)

                for (let skaterID in team) {
                    // For each skater on the team

                    let skater = team[skaterID]
                    let skaterData = crgData.teams[t].skaters.find(x => x.id == skaterID)
                    let penaltyRow = firstPenaltyCell.r + (skater.row * 2)
                    let jamRow = firstJamCell.r + (skater.row * 2)
                    let lastPenaltyCode = 'EXP'

                    if (skaterData != undefined && skaterData.penalties.length > 0) {
                        // If they have any penalties, add them

                        let plist = skaterData.penalties
                        lastPenaltyCode = plist[plist.length - 1].code

                        let priorPenalties = plist.filter(x => x.period < p).length
                        let penaltyCol = pFirstCol + priorPenalties
                        let jamCol = jFirstCol + priorPenalties
                        plist = plist.filter(x => x.period == p)

                        for (let pen in plist) {
                            let code = plist[pen].code
                            let jam = plist[pen].jam

                            workbook.sheet(sheet).row(penaltyRow).cell(penaltyCol).value(code)
                            workbook.sheet(sheet).row(jamRow).cell(jamCol).value(jam)

                            penaltyCol += 1
                            jamCol += 1
                        }

                    }

                    if (skaterData != undefined
                        && skaterData.hasOwnProperty('fo_exp')
                        && skaterData.fo_exp.period == p
                    ) {
                        let code = '??'
                        if (skaterData.fo_exp.code == 'FO') {
                            code = 'FO'
                        } else if (expRe.exec(skaterData.fo_exp.code) != null) {
                            code = expRe.exec(skaterData.fo_exp.code)[1]
                        } else if (skaterData.fo_exp.code == 'EXP') {
                            code = lastPenaltyCode
                        } else if (/^[ABCDEFGHILMNPX]{1}/.test(skaterData.fo_exp.code)) {
                            code = skaterData.fo_exp.code
                        }
                        let jam = skaterData.fo_exp.jam
                        workbook.sheet(sheet).row(penaltyRow).cell(firstFOCell.c).value(code)
                        workbook.sheet(sheet).row(jamRow).cell(firstFOJamCell.c).value(jam)
                    }
                }
            }
        }
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

module.exports = initialize