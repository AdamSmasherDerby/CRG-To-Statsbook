const _ = require('lodash')
const Reader935 = require('./readers/reader395')
const Reader400 = require('./readers/reader400')

exports.makecrgdata = (fileData, crgFilename) => {
    const reader395 = new Reader935()
    const reader400 = new Reader400()

    let crgData = {
        teams: [{
            team: '1',
            skaters: []
        },{
            team: '2',
            skaters: []
        }],
        periods: [],
        version: ''
    }

    if (fileData.hasOwnProperty('identifier')){
        // CRG formats prior to 3.9.5.  fileData is simply returned as is.
        crgData = fileData
        crgData.version = '3.0'
    } else if (fileData.hasOwnProperty('state')){
        // Determine version
        crgData.version = (fileData.state.hasOwnProperty('ScoreBoard.InJam') ? '4.0' : '3.9.5')

        let sb = {}
        let keys = Object.keys(fileData.state)
        let values = Object.values(fileData.state)
        let id, team, penaltyNumber, idIndex, skater, penalty
        let skaterIndices = {}
        let skaterRE = /Team\((\d)\)\.Skater\((\w+-\w+-\w+-\w+-\w+)\)\.Number/
        let penaltyRE = /Team\((\d)\)\.Skater\((\w+-\w+-\w+-\w+-\w+)\)\.Penalty\((\d)\)\.Id/
        let jamStartRE = /Period\((\d)\)\.Jam\((\d+)\)\.PeriodClockElapsedStart/

        // Make sb array
        for (let k in keys){
            _.set(sb, keys[k], values[k])
        }

        sb = sb.ScoreBoard

        for (let k in keys){
        // Populate skaters and penalties

            // If this line is a skaterId line, add their data to crgData
            let match = skaterRE.exec(keys[k])
            if (match != undefined) {
                team = match[1]
                id = match[2]
                idIndex = crgData.teams[parseInt(team) - 1].skaters.push(
                    {
                        number: sb[`Team(${team})`][`Skater(${id})`].Number,
                        penalties: [],
                        name: sb[`Team(${team})`][`Skater(${id})`].Name,
                        id: id,
                        fo_exp: {}
                    }
                )
                // Track the position of each skater ID in the crgData list
                skaterIndices[id] = idIndex - 1
            }

            // If this line is a penalty ID line, add it to the entry for that skater
            match = penaltyRE.exec(keys[k])
            if (match != undefined) {
                team = match[1]
                id = match[2]
                penaltyNumber = match[3]

                skater = crgData.teams[parseInt(team) - 1].skaters[skaterIndices[id]]
                penalty = sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`]
                if (crgData.version == '3.9.5') {
                    reader395.readPenalty(penaltyNumber, penalty, skater)
                } else {
                    reader400.readPenalty(penaltyNumber, penalty, skater)
                }
            }
        }

        // Load team names, create identifer
        crgData.teams[0].name = sb['Team(1)'].Name
        crgData.teams[1].name = sb['Team(2)'].Name
        
        let localStartTime = crgFilename.substr(11,5).replace('_',':')
        let localStartDate = crgFilename.substr(0,10)
        // let unixStart = moment(sb.Stats['Period(1)']['Jam(1)'].PeriodClockWalltimeStart)
        // let localStart = moment(`${localStartDate} ${localStartTime}`)
        // Time Offset is in ms for future use
        // let timeoffset = (unixStart > localStart ?  localStart - unixStart : unixStart - localStart)

        crgData.identifier = `${localStartDate} ${localStartTime} - ${crgData.teams[0].name} vs ${crgData.teams[1].name}`

        for(let k in keys){
        // Populate scores and lineups
            let match = jamStartRE.exec(keys[k])
            if (match != undefined) {
                let period = parseInt(match[1])
                let jam = parseInt(match[2])
                if (period == 0 || jam == 0) { continue }

                if (crgData.periods.length < period) {
                // if this period doesn't exist, add it
                    crgData.periods.push(
                        { 
                            period: period,
                            jams: []
                        }
                    )
                }
                let rawData = sb[`Period(${period})`][`Jam(${jam})`]
                let jamList = crgData.periods[period - 1].jams
                
                if (!jamList.some(x => x.jam == jam)) {
                    
                // if this jam doesn't exist, add it
                    if(crgData.version == '3.9.5') {
                        reader395.addJam(jam, rawData, jamList)

                    } else {
                        reader400.addJam(jam, rawData, jamList)
                    }
                }

                crgData.periods[period - 1].jams = _.orderBy(crgData.periods[period - 1].jams, ['jam'])
            }
        }
        
    } 
    return crgData
}