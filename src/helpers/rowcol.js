module.exports = function rowcol(rcstring) {
    // Return row and col as 1 indexed numbers
    let robj = null
    const result = /([a-zA-Z]+)([1-9]\d*)/.exec(rcstring)
    if(result && result.length) {
        const [, colstr, rowstr] = result
        const row = parseInt(rowstr)
        const col = colstr.split('').reduce((r, a) => r * 26 + parseInt(a, 36) - 9, 0)
        robj = { r: row, c: col }
    }
    return robj
}
