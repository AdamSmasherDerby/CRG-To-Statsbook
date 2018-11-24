CRG Data Tool is a utility for converting output Game Data files from CRG Scoreboard and to WFTDA StatsBooks.  It can either generate a new statsbook based on a template or repopulate an existing statsbook file.  If there is a conflict between your scoreboard data and an existing statsbook file, it will attempt to help you resolve the conflict.

This software is still in beta stage. As such, be sure to back up any StatsBook files *before* feeding them to this program, unless you want to risk retyping stuff.

Although the software uses data from both CRG Scoreboard and WFTDA, it is not provided, endorsed, produced, or supported by the WFTDA. 

## Limitations

At present, CRG Scoreboard does not record enough data for a full statsbook, and in particular, does not record points per scoring trip.  As such, it is not possible to use this data file to fully populate the score sheet of the StatsBook at this time.  

## Current Abilities

At present, this tool can populate the following information from the game data file.  Information which is not entered in CRG is skipped.

* Game Time and Date
* Team Names
* Team Rosters with name and number
* Jam Numbers, including star passes
* Jammer numbers
* Pivot numbers
* Blocker numbers
* Penalty codes
* Foul Outs
* Expulsions
    * If the user is running a dev version of CRG that records expulsion codes, the program will use that, otherwise it will assume that the last penalty entered is the penalty for which the skater was expelled.
* Jam times on the Game Clock sheet.  Because why not?

Flamingo icon from http://www.iconsmind.com

Installable binaries are located at:
https://github.com/AdamSmasherDerby/CRG-To-Statsbook/releases

## Installation instructions:

*Windows:* Download and run <code>CRG Data Tool Setup.x.x.x-Windows.exe</code>

*Mac:* Download and run the <code>CRG Data Tool-x.x.x.dmg</code> file. Drag the flamingo onto the folder. Right or control click the StatsBook Tool program and select "open." Agree to run the software, despite dire warnings of awful consequences. (The awful consequences are that I have not ponied up $100 for a Developer certificate to sign the code.)

*Linux:* Download <code>crgdataktool-x.x.x-x86_64.AppImage</code>, then type "chmod a+x crgdatatool-x.x.x-x86_64.AppImage" to make the file executable. 

### Release Notes

* 0.0.1 - Alpha release for testing at BrewHaHa.
* 0.3.0 - July 1, 2018
    * Initial Public Beta.
* 0.3.1 - Also July 1, 2018
    * Immediate Bug Fix. (Nice going, Smasher.)
* 0.3.2 - July 2, 2018
    * No longer opens dev tools for "edit skaters" window in production version.
* 0.3.3 - August 5, 2018
    * Added ability to swap team order
    * Changed default output file name to match gamedata file name.
    * Allow the same CRG data file to be uploaded twice in a row.
    * Prevent files dropped outside of the drop zone from doing stuff.
* 0.3.4 - August 24, 2018
    * Skaters deselected in the edit screen are now removed from prexisting IGRF.
    * Fixed wrong input area turning pink on dragover.
    * Added error popup if attempt is made to save to a file open in Excel.
* 0.3.5 - September 28, 2018
    * Fixed error introduced in last version with updating IGRF
    * Fixed situation where filling in blockers at halftime would break conditional formatting after a second export at the end of the game.  This was due to an Excel issue where cell formats aren't updated properly. Thanks, Microsoft!
* 1.0.0 - October 10, 2018
    * Will read CRG 3.9.5 and later data files as well as earlier
    * Also probably time to declare a non-beta release.
* 1.0.1 - 
    * Cancel / Confirm buttons added at the bottom of the edit skaters dialog
    * Select CRG / Select IGRF checkboxes added to edit skaters dialog