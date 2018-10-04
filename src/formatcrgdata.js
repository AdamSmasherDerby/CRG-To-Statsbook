const _ = require('lodash')

exports.makecrgdata = (fileData, crgFilename) => {
    let crgData = {
        teams: [{},{}],
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
        for (let key in keys){
            _.set(sb, keys[key], values[key])
        }
        
        sb = sb.ScoreBoard
        crgData.teams[0].name = sb['Team(1)'].Name
        crgData.teams[1].name = sb['Team(2)'].Name
        crgData.identifier = `${crgFilename.substr(0,10)} - ${crgData.teams[0].name} vs ${crgData.teams[1].name}`
    }
    return crgData
}
