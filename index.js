//
//  OSZ/OSU file loader
//  By Sam Lynch
//  Covered by MIT licensing
//


class OSULoader {

	constructor(){/* y u make instance :( */}

	/**
	 *
	 * @param {Array<string>} splitFile The OSU file split into an array by newline
	 * @param {int} index Index of the splitFile array to start at
	 * @param {string} sectionName Name of the section to handle
	 * @private
	 */
	static _handleOSUSection(splitFile, index, sectionName){
		switch(sectionName){
			case 'General':
			case 'Kenobi!':
				break;
			case 'Editor':
				break;
			case 'Metadata':
				break;
			case 'Difficulty':
				break;
			case 'Events':
				break;
			case 'TimingPoints':
				break;
			case 'Colours':
				break;
			case 'HitObjects':
				break;
		}
	}

	/**
	 *
	 * @param {String} file
	 * @returns {Promise<void>}
	 */
	static ParseOSUFileAsync(file){
		return new Promise((resolve, reject)=>{
			let output = {};

			// Check input
			if(!file || typeof file !== 'string'){
				reject('Invalid input! Must be a string!');
			}

			// Split file by newline and trim excess
			let split = file.split('\n');
			for(let i = 0; i < split.length; i++){
				split[i] = split[i].trim();
			}

			for(let i = 0; i < split.length; i++){
				let current = split[i];

				if(current[0] === '/' && current[1] === '/')
					continue;                               // It's a comment, bugger off
				else if(current[0] === '[' && current.indexOf(']') !== -1){
					// it's a section start
					let sectionName = current.match(/\[([^)]*)\]/)[1];
					output[sectionName] = this._handleOSUSection(split, i, sectionName);
				}
			}

		});
	}
}

module.exports = OSULoader;