const sbTemplate = require('../assets/2018statsbook.json')
const rowcol = require('../helpers/rowcol')
const uuid = require('uuid/v4')

const teamNames = ['home', 'away']
// const periods = [1, 2]

module.exports = class SkaterManager {
    constructor(crgData) {
        this.crgData = crgData
    }

    tooManyCrgSkaters() {
        const crgSkaters = this.crgSkaters()
        let tooManySkaters = false

        teamNames.forEach((team) => {
            const maxNum = sbTemplate.teams[team].maxNum
            if(Object.values(crgSkaters[team]).length > maxNum) {
                tooManySkaters = true
            }
        })

        return tooManySkaters
    }

    crgSkaters() {
        const crgSkaters = {}

        if (this.crgData.teams) {
            this.crgData.teams.forEach((crgTeam) => {
                const team = {}
                const skaterNumbers = Object.values(crgTeam.skaters).map((v) => v.number)
                const sortedSkaterNumbers = skaterNumbers.slice().sort()
                const rows = skaterNumbers.map((v) => sortedSkaterNumbers.indexOf(v))

                crgTeam.skaters.forEach((skater, s) => {
                    const number = skater.number
                    const name = skater.name
                    const id = skater.id
                    const row = parseInt(rows[s])

                    team[id] = {
                        name,
                        number,
                        row
                    }
                })
            })

            return crgSkaters
        }
    }

    igrfSkaters(workbook) {
        const skatersOnIGRF = {}

        teamNames.forEach((team, t) => {
            skatersOnIGRF[team] = {}
            const teamSheet = sbTemplate.teams[team].sheetName
            const maxNum = sbTemplate.teams[team].maxNum

            const numberCell = rowcol(sbTemplate.teams[team].firstNumber)
            const nameCell = rowcol(sbTemplate.teams[team].firstName)

            for(let s=0; s < maxNum; s++) {
                let number = workbook.sheet(teamSheet).row(numberCell.r + s).cell(numberCell.c).value()
                let name = workbook.sheet(teamSheet).row(nameCell.r + s).cell(nameCell.c).value() || ''

                let scoreboardMatch = this.crgData.teams[t].skaters.find(x => x.number == number)
                let id = scoreboardMatch != undefined ? scoreboardMatch.id : uuid()
                if (number != undefined){
                    skatersOnIGRF[team][id] = {
                        number: number.toString(),
                        name: name,
                        row: s,
                        id: id
                    }
                }
            }
        })

        return skatersOnIGRF
    }
}