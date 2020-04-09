module.exports = class Reader395 {
    readPenalty(penaltyNumber, penalty, skater) {
        const penaltyData = {
            period: penalty.Period,
            code: penalty.Code,
            jam: penalty.Jam,
            id: penalty.Id
        }

        if(penaltyNumber === 'FO_EXP') {
            skater.penalties.push(penaltyData)
        } else {
            skater.penalties.fo_exp = penaltyData
        }
    }

    jamStatsSource(rawData) {
        return rawData.Stats
    }

    addJam(jamNumber, rawData, jamList) {
        const jamLengthMS = rawData.JamClockElapsedEnd
        
        const teamOne = rawData['Team(1)']
        const teamTwo = rawData['Team(2)']

        jamList.push({
            jam: jamNumber,
            jamLength: msToTimeString(jamLengthMS),
            jamLengthSeconds: Math.round(jamLengthMS / 1000),
            teams: [{
                team: '1',
                jamScore: teamOne.JamScore,
                starPass: teamOne.StarPass,
                skaters: this.addJamSkaters(teamOne)
            }, {
                team: '2',
                jamScore: teamTwo.JamScore,
                starPass: teamTwo.StarPass,
                skaters: this.addJamSkaters(teamTwo)
            }]
        })
    }

    addJamSkaters(jamTeam) {
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
}

let msToTimeString = (totalms) => {
    // Convert ms as int to mm:ss.sss as string
    const mins = Math.floor(totalms / 60000)
    let secs = Math.floor((totalms % 60000) / 1000)
    let ms = totalms - mins * 60000 - secs * 1000
    let secstring = (secs < 10 ? `0${secs}` : `${secs}`)
    let msstring = (ms < 10 ? `00${ms}` : (ms < 100 ? `0${ms}` : `${ms}`))
    return (`${mins}:${secstring}.${msstring}`)
}