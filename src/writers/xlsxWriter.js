const XLP = require('xlsx-populate')
const sbTemplate = require('../assets/2018statsbook.json')
const teamNames = ['home', 'away']

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
            const teamSkaters = Array.from(skaters[team])

            teamSkaters.forEach((skater) => {
                const name = skater.name
                const number = skater.number
                const row = skater.row

                sheet.row(numberCell.r + row).cell(numberCell.c).value(number)
                sheet.row(nameCell.r + row).cell(nameCell.c).value(name)
            })


            for (let s = teamSkaters.length; s < maxNum; s++) {
                let row = numberCell.r
                workbook.sheet(teamSheet).row(row + s).cell(numberCell.c).value('')
                workbook.sheet(teamSheet).row(row + s).cell(nameCell.c).value('')
            }
        })
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