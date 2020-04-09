const sbTemplate = require('../assets/2018statsbook.json')
const rowcol = require('../helpers/rowcol')
const uuid = require('uuid/v4')
const _ = require('lodash')

const teamNames = ['home', 'away']
// const periods = [1, 2]

module.exports = class SkaterManager {
    constructor() {
        this.crgSkaters = {}
    }

    getSkaters() {
        return this.crgSkaters
    }

    tooManyCrgSkaters() {
        const crgSkaters = this.crgSkaters
        let tooManySkaters = false

        teamNames.forEach((team) => {
            const maxNum = sbTemplate.teams[team].maxNum
            if(Object.values(crgSkaters[team]).length > maxNum) {
                tooManySkaters = true
            }
        })

        return tooManySkaters
    }

    compareCrgAndIgrf() {
        let result = true

        teamNames.forEach((teamName) => {
            if(this.crgSkaters[teamName].length !== this.igrfSkaters[teamName].length) {
                result = false
            } else {
                const common = _.intersectionBy(this.crgSkaters[team], this.igrfSkaters[team], s => s.number)
               if(common.length !== this.crgSkaters[team].length) {
                   result = false
               }
            }
        })
        
        return result
    }

    crgSkaters(crgData) {
        this.crgSkaters = {}

        if (crgData.teams) {
            crgData.teams.forEach((crgTeam, t) => {
                const team = []


                _.sortBy(crgTeam.skaters, (s) => s.number)
                .forEach((skater, s) => {
                    const number = skater.number
                    const name = skater.name
                    const id = skater.id

                    team.push({
                        id,
                        name,
                        number,
                        row: s
                    })
                })

                this.crgSkaters[teamNames[t]] = team
            })
        }

        return this.crgSkaters
    }

    igrfSkaters(workbook) {
        this.skatersOnIGRF = {}

        teamNames.forEach((team, t) => {
            skatersOnIGRF[team] = []
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
                    this.skatersOnIGRF[team].push({
                        number: number.toString(),
                        name: name,
                        row: s,
                        id: id
                    })
                }
            }
        })

        return this.skatersOnIGRF
    }
}