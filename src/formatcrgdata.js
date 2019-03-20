const _ = require('lodash')

exports.makecrgdata = (fileData, crgFilename) => {
    let crgData = {
        teams: [{
            team: '1',
            skaters: []
        },{
            team: '2',
            skaters: []
        }],
        periods: []
    }

    if (fileData.hasOwnProperty('identifier')){
        // CRG formats prior to 3.9.5
        crgData = fileData
    } else if (fileData.hasOwnProperty('state')){
        // CRG 3.9.5 and up
        let sb = {}
        let keys = Object.keys(fileData.state)
        let values = Object.values(fileData.state)
        let id, team, penaltyNumber, idIndex
        let skaterIndices = {}
        let skaterRE = /Team\((\d)\)\.Skater\((\w+-\w+-\w+-\w+-\w+)\)\.Number/
        let penaltyRE = /Team\((\d)\)\.Skater\((\w+-\w+-\w+-\w+-\w+)\)\.Penalty\((\d)\)\.Id/
        let jamStartRE = /Stats\.Period\((\d)\)\.Jam\((\d+)\)\.PeriodClockWalltimeStart/

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
                        id: id
                    }
                )
                skaterIndices[id] = idIndex - 1
            }

            // If this line is a penalty ID line, add it to the entry for that skater
            match = penaltyRE.exec(keys[k])
            if (match != undefined) {
                team = match[1]
                id = match[2]
                penaltyNumber = match[3]
                crgData.teams[parseInt(team) - 1].skaters[skaterIndices[id]].penalties.push(
                    {
                        period: sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`].Period,
                        code: sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`].Code,
                        jam: sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`].Jam,
                        id: sb[`Team(${team})`][`Skater(${id})`][`Penalty(${penaltyNumber})`].Id
                    }
                )
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

                if (crgData.periods.length < period) {
                // if this period doesn't exist, add it
                    crgData.periods.push(
                        { 
                            period: period,
                            jams: []
                        }
                    )
                }
                
                if (crgData.periods[period - 1].jams.findIndex( x => {return x.jam == jam}) == -1) {
                // if this jam doesn't exist, add it

                    let jamLengthMS = sb.Stats[`Period(${period})`][`Jam(${jam})`].JamClockElapsedEnd
                    let teamOne = sb.Stats[`Period(${period})`][`Jam(${jam})`]['Team(1)']
                    let teamTwo = sb.Stats[`Period(${period})`][`Jam(${jam})`]['Team(2)']


                    crgData.periods[period - 1].jams.push(
                        {
                            jam: jam,
                            jamLength: msToTimeString(jamLengthMS),
                            teams: [{
                                team: '1',
                                jamScore: sb.Stats[`Period(${period})`][`Jam(${jam})`]['Team(1)'].JamScore,
                                starPass: sb.Stats[`Period(${period})`][`Jam(${jam})`]['Team(1)'].StarPass,
                                skaters: getJamSkaters(teamOne)
                            },{
                                team: '2',
                                jamScore: sb.Stats[`Period(${period})`][`Jam(${jam})`]['Team(2)'].JamScore,
                                starPass: sb.Stats[`Period(${period})`][`Jam(${jam})`]['Team(2)'].StarPass,
                                skaters: getJamSkaters(teamTwo)
                            }]
                        }
                    )
                }

                crgData.periods[period - 1].jams = _.orderBy(crgData.periods[period - 1].jams, ['jam'])
            }
        }
        
    }
    return crgData
}

let msToTimeString = (totalms) => {
    let mins = Math.floor(totalms / 60000)
    let secs = Math.floor((totalms % 60000)/1000)
    let ms = totalms - mins * 60000 - secs * 1000
    let secstring = (secs < 10 ? `0${secs}` : `${secs}`)
    let msstring = (ms < 10 ? `00${ms}` : (ms < 100 ? `0${ms}` : `${ms}`))
    return (`${mins}:${secstring}.${msstring}`)
}

let getJamSkaters = (jamTeam) => {
    // Given an object of key/value pairs for a given team in a given jam, return
    // an array of skater objects.
    let teamSkaterRE = /Skater\((\w+-\w+-\w+-\w+-\w+)\)/
    let keys = Object.keys(jamTeam)
    let id, penaltyBox, position
    let skaters = []
    for (let k in keys) {
        let match = teamSkaterRE.exec(keys[k])
        if (match != undefined){
            id = match[1]
            penaltyBox = jamTeam[`Skater(${id})`].PenaltyBox
            position = jamTeam[`Skater(${id})`].Position
        
            skaters.push({
                id: id,
                penaltyBox: penaltyBox,
                position: position
            })
        }
    }
    return skaters
}