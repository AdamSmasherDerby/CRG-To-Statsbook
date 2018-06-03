CRG Data Tool is a utility for converting output Game Data files from CRG Scoreboard and to WFTDA StatsBooks.  It can either generate a new statsbook based on a template or repopulate an existing statsbook file.  

This software is in *early development*. As such, be sure to back up any StatsBook files *before* feeding them to this program, unless you want to risk retyping stuff.

Although the software uses data from both CRG Scoreboard and WFTDA, it is not provided, endorsed, produced, or supported by the WFTDA. It is likely to break.

## Limitations

At present, CRG Scoreboard does not record enough data for a full statsbook, and in particular, does not record points per scoring trip.  As such, it is not possible to use this data file to fully populate the score sheet of the StatsBook at this time.  

## Current Abilities

At present, this tool can populate the following information from the game data file:

* Game Time and Date
* Team Names
* Team Rosters with name and number
* Jam Numbers, including star passes if entered
* Jammer numbers, if entered
* Penalty codes, if entered
* Foul Outs, if entered
* Expulsions, sort of.
    * Note that CRG does not currently record the penalty code for expulsions.  The tool will assume that the last penalty recorded for an expelled skater is the one for which they were expelled.  The user should manually verify that this (and frankly, every other darn thing this program does) is correct.



Installable binaries are located at:
https://github.com/AdamSmasherDerby/CRG-To-Statsbook/releases


Flamingo icon from http://www.iconsmind.com

### Release Notes

* 0.0.1 - Alpha release for testing at BrewHaHa