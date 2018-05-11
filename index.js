//
//  OSZ/OSU file loader
//  By Sam Lynch
//  Covered by MIT licensing
//

//let fs = require('fs');

class OSUJSON {

	/**
	 * @private
	 * @constructor
	 */
    constructor() {/* y u make instance :( */}

	/**
	 * @returns {{circle: number, slider: number, new_combo: number, spinner: number, combo_col1: number, combo_col2: number, combo_col3: number, "osu!mania": number}}
	 * @private
	 */
	static get _hitObjectTypes() {
        return {
            'circle': 0x1,
            'slider': 0x2,
            'new_combo': 0x4,
            'spinner': 0x8,
            'combo_col1': 0x10,
            'combo_col2': 0x20,
            'combo_col3': 0x40,
            'osu!mania': 0x80
        }
    }

	/**
	 * @returns {{normal: number, whistle: number, finish: number, clap: number}}
	 * @private
	 */
	static get _hitObjectSounds() {
        return {
	        'none': 0x0,
            'normal': 0x1,
            'whistle': 0x2,
            'finish': 0x4,
            'clap': 0x8,
        }
    }

	/**
	 * @param bitflags
	 * @returns {{isNewCombo: boolean, isOsuMania: boolean, type: string}}
	 * @private
	 */
    static _createHitObjectType(bitflags) {
        let object = {
            isNewCombo: false,
            isOsuMania: false,
            type: ''
        };

        if (bitflags & this._hitObjectTypes['circle']) {
            object.type = 'circle';
        } else if (bitflags & this._hitObjectTypes['slider']) {
            object.type = 'slider';
        } else if (bitflags & this._hitObjectTypes['spinner']) {
            object.type = 'spinner';
        }

        if (bitflags & this._hitObjectTypes['new_combo']) {
            object.isNewCombo = true;
        }

        if (bitflags & this._hitObjectTypes['osu!mania']) {
            object.isOsuMania = true;
        }

        return object;
    }

    /**
     *
     * @param {Array<string>} splitFile The OSU file split into an array by newline
     * @param {int} index Index of the splitFile array to start at
     * @param {string} sectionName Name of the section to handle
     * @private
     */
    static _handleOSUSection(splitFile, index, sectionName) {
        let section = {};
        switch (sectionName) {
            case 'General':
            case 'Kenobi!':
            case 'Editor':
            case 'Metadata':
            case 'Difficulty':
                // handle by getting data after the colon as string
                let lineDifficulty;
                while ((lineDifficulty = splitFile[++index]).trim() !== '') {
                    let key = lineDifficulty.substring(0, lineDifficulty.indexOf(':'));
                    lineDifficulty = lineDifficulty.substring(lineDifficulty.indexOf(':') + 1).trim();
                    section[key] = isNaN(parseFloat(lineDifficulty)) ? (lineDifficulty) : (+lineDifficulty);
                }
                return section;
            case 'Events':
                // https://osu.ppy.sh/help/wiki/Storyboard_Scripting
                break;
            case 'TimingPoints':
				return this._handleTimingPoints(splitFile, index);
            case 'Colours':
                return this._handleColours(splitFile, index);
            case 'HitObjects':
                return this._handleHitObjects(splitFile, index);
            default:
                throw new Error('Unrecognised section name! ' + sectionName);
        }
    }

	/**
	 * @private
	 */
	static _handleTimingPoints(splitFile, index){
		let section = [];

		let lineTP; // hehehe
        let lastPositiveMPB; // last positive milliseconds per beat value
		while ((lineTP = splitFile[++index]).trim() !== '') {
			//Offset, Milliseconds per Beat, Meter, Sample Set, Sample Index, Volume, Inherited, Kiai Mode
            let lineSplit = lineTP.split(',');
            let line = {};
            line.offset = +lineSplit[0];
            line.mpb = +lineSplit[1];
            if(line.mpb < 0){
                // its a percentage
                line.mpb = Math.abs(line.mpb) * 0.01;
                line.mpb = lastPositiveMPB * line.mpb;
            } else {
                lastPositiveMPB = line.mpb;
            }
			line.meter = +lineSplit[2];
			line.sampleSet = this._getSampleSetType(+lineSplit[3]);
			line.sampleIndex = +lineSplit[4];
            line.volume = +lineSplit[5];
            line.inherited = (+lineSplit[6]) === 1;
            line.kiai = (+lineSplit[7]) === 1;

            section.push(line);
		}

		return section;
    }

	/**
	 * @param bitflag
	 * @returns {string}
	 */
    static _getHitSoundFromBitflag(bitflag) {
    	let result = {
    	    'normal': false,
    	    'whistle': false,
    	    'finish': false,
    	    'clap': false
	    };

        if (bitflag & this._hitObjectSounds['normal']) {
	        result['normal'] = true;
        }
        if (bitflag & this._hitObjectSounds['whistle']) {
	        result['whistle'] = true;
        }
        if (bitflag & this._hitObjectSounds['finish']) {
	        result['finish'] = true;
        }
        if (bitflag & this._hitObjectSounds['clap']) {
	        result['clap'] = true;
        }

        return result;
    }

	/**
	 * @param splitFile
	 * @param index
	 * @private
	 */
    static _handleColours(splitFile, index) {
        let section = {};

        let lineColours;
        while ((lineColours = splitFile[++index]).trim() !== '') {
            let key = lineColours.substring(0, lineColours.indexOf(':'));
            lineColours = lineColours.substring(lineColours.indexOf(':') + 1).trim();
            lineColours = lineColours.split(',');
            if (lineColours.length !== 3)
                throw new Error('Invalid number of colours!');

            section[key] = {
				r: (+lineColours[0]),
				g: (+lineColours[1]),
				b: (+lineColours[2])
			};
        }

        return section;
    }

	/**
	 * @param sampleSet
	 * @returns {string}
	 * @private
	 */
    static _getSampleSetType(sampleSet) {
        if (typeof(sampleSet) === 'undefined') throw new Error('Undefined addition set!');

        switch (sampleSet) {
            default:
            case 0:
                return 'auto';
            case 1:
                return 'normal';
            case 2:
                return 'soft';
            case 3:
                return 'drum';
        }
    }

    /**
     * @param {string} data
     * @private
     */
    static _handleExtras(data) {
        let extras = {};

        // sampleSet:additionSet:customIndex:sampleVolume:filename
        let splitStr = data.split(':');
        extras['sampleSet'] = this._getSampleSetType(+splitStr[0]);
        extras['additionalSet'] = (+splitStr[1]);
        extras['customIndex'] = (+splitStr[2]);
        extras['sampleVolume'] = (+splitStr[3]);
        extras['filename'] = (splitStr[4]);

        return extras;
    }

	/**
	 * @param {string} typeStr
	 * @returns {string}
	 * @private
	 */
    static _getSliderType(typeStr) {
        switch (typeStr) {
            default:
            case 'L':
                return 'linear';
            case 'P':
                return 'perfect';
            case 'B':
                return 'bezier';
            case 'C':
                console.warn("Use of Catmull curve is deprecated");
                return 'catmull';
        }
    }

    /**
     * @param {string} pathStr
     * @private
     */
    static _handleSliderPath(pathStr) {
        let pathStrSplit = pathStr.split('|');

        let path = {
            sliderType: this._getSliderType(pathStrSplit[0])
        };

        switch (path.sliderType) {
            case 'linear':
                // L|100:200
                path['end'] = {
                    x: (+pathStrSplit[1].split(':')[0]),
                    y: (+pathStrSplit[1].split(':')[1])
                };
                break;
            case 'perfect':
                path['passthrough'] = {
                    x: (+pathStrSplit[1].split(':')[0]),
                    y: (+pathStrSplit[1].split(':')[1])
                };
                path['end'] = {
                    x: (+pathStrSplit[2].split(':')[0]),
                    y: (+pathStrSplit[2].split(':')[1])
                };
                break;
            case 'bezier':

            	break;
            case 'catmull':
                // TODO: bezier and catmull curves
                console.warn('Bezier and catmull curves not yet implemented');
                break;
        }

        return path;
    }

	/**
	 * @param {Array<string>} splitLine
	 * @param {Object} entryRef
	 * @returns {Object} entryRef
	 * @private
	 */
    static _handleSlider(splitLine, entryRef) {
        // x,y,time,type,hitSound,sliderType|curvePoints,repeat,pixelLength,edgeHitsounds,edgeAdditions,extras

        entryRef['path'] = this._handleSliderPath(splitLine[5]);
        entryRef['repeat'] = (+splitLine[6]);
        entryRef['pixelLength'] = (+splitLine[7]);

        if(splitLine.length > 8){
	        entryRef['edgeHitsounds'] = (splitLine[8].split('|'));

	        for(let i = 0; i < entryRef['edgeHitsounds'].length; i++){
		        entryRef['edgeHitsounds'][i] = this._getHitSoundFromBitflag(entryRef['edgeHitsounds'][i]);
	        }

	        if (entryRef['edgeHitsounds'].length !== entryRef['repeat'] + 1) {
		        throw new Error('Number of edge hitsounds does not match repeat+1 syntax!');
	        }
	        for (let i = 0; i < entryRef['repeat'] + 1; i++) {
		        entryRef['edgeHitsounds'][i] = (+entryRef['edgeHitsounds'][i]);
	        }
        } else {
	        entryRef['edgeHitsounds'] = [];
        }

        return entryRef;
    }

	/**
	 * @param {Array<string>} splitFile
	 * @param {int} index
	 * @returns {Array<object>} section
	 * @private
	 */
    static _handleHitObjects(splitFile, index) {
        let section = [];

        let currLine;
        while ((currLine = splitFile[++index]).trim() !== '') {
            //x,y,time,type,hitSound...,extras
            let currLineSplit = currLine.split(',');
            let entry = {
                x: +currLineSplit[0],
                y: +currLineSplit[1],
                time: +currLineSplit[2],
                type: this._createHitObjectType(+currLineSplit[3]),
                hitSound: this._getHitSoundFromBitflag(+currLineSplit[4]),
                extras: undefined
            };

            // regular circle
            switch (entry.type.type) {
                case 'circle':
                    // x,y,time,type,hitSound,extras
                    if (currLineSplit.length === 6) {
                        entry['extras'] = this._handleExtras(currLineSplit[5]);
                    }
                    break;
                case 'slider':
                    entry = this._handleSlider(currLineSplit, entry);
                    if (currLineSplit.length === 11) {
                        entry['extras'] = this._handleExtras(currLineSplit[10]);
                    }
                    break;
                case 'spinner':
                    //x,y,time,type,hitSound,endTime,extras
                    entry['endTime'] = (+currLineSplit[10]);
                    if (currLineSplit.length === 7) {
                        entry['extras'] = this._handleExtras(currLineSplit[6]);
                    }
                    break;
                case 'new_combo': // ??
                    break;
            }

            section.push(entry);
        }

        return section;
    }

	/**
	 * @param {string} str
	 * @returns {number}
	 * @private
	 */
    static _getFileVersion(str) {
        if (str.substring(0, 17) !== "osu file format v") {
            throw new Error('Version not at top of file!');
        }

        return (+str.substring(17));
    }

	/**
	 * Gets the hitsounds required for a timing point (constructs filenames)
	 * @param {Array<Object>} timingpoints
	 * @param {Array<Object>} hitobjects
	 * @private
	 */
	static _getRequiredSamples(timingpoints, hitobjects) {
		// tp = {
		// 	"offset": -1866,
		// 	"mpb": 487.80487804878,
		// 	"meter": 4,
		// 	"sampleSet": "soft",
		// 	"sampleIndex": 1,
		// 	"volume": 20,
		// 	"inherited": true,
		// 	"kiai": false
		// };

		let filenames = [];

		for(let t = 0; t < timingpoints.length-1; t++){
			let tp = timingpoints[t];
			let nextTp = timingpoints[t+1];
			for(let h = 0; h < hitobjects.length; h++){
				let hitobject = hitobjects[h];
				if(hitobject.time > tp.offset && hitobject.time < nextTp.offset){
					// matching TP
					for(let k in hitobject.hitSound){
						if(hitobject.hitSound[k] === true || k === 'normal'){
							let filename = "" +
								tp.sampleSet +
								"-hit" +
								k +
								(tp.sampleIndex === 1 ? "" : tp.sampleIndex.toString()) +
								".wav";
							filenames.push(filename);
						}
					}
				}
			}
		}

		filenames = filenames.filter(function(item, pos, self) {
			return self.indexOf(item) === pos;
		});

		return filenames;
	}

    /**
     *
     * @param {String} file
     * @returns {Promise<void>}
     */
    static ParseOSUFileAsync(file) {
        return new Promise((resolve, reject) => {
            let output = {};

            // Check input
            if (!file || typeof file !== 'string') {
                reject('Invalid input! Must be a string!');
            }

            // Split file by newline and trim excess
            let split = file.split('\n');
            for (let i = 0; i < split.length; i++) {
                split[i] = split[i].trim();
            }

            // First line is version
            output['version'] = this._getFileVersion(split[0]);

            for (let i = 0; i < split.length; i++) {
                let current = split[i];

                if (current.length < 2)
                    continue; // Most likely an empty line

                if (current[0] === '[' && current.indexOf(']') !== -1) {
                    // it's a section start
                    let sectionName = current.match(/\[([^)]*)]/)[1];
                    output[sectionName] = this._handleOSUSection(split, i, sectionName);
                }
            }

            output['RequiredFiles'] = OSUJSON._getRequiredSamples(output['TimingPoints'], output['HitObjects']);

            resolve(output);
        });
    }
}
//
// let file = fs.readFileSync('./STYX_HELIX.osu', 'utf8');
// return OSUJSON.ParseOSUFileAsync(file).then((output)=>{
// 	console.log(output);
// });

module.exports = OSUJSON;