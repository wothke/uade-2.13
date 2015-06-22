/*
 uade_adapter.js: Adapts UADE backend to generic WebAudio/ScriptProcessor player.
 
 Known limitation: seeking is not supported by UADE
 
 version 1.0
 
 	Copyright (C) 2015 Juergen Wothke

 LICENSE
 
 This library is free software; you can redistribute it and/or modify it
 under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 2.1 of the License, or (at
 your option) any later version. This library is distributed in the hope
 that it will be useful, but WITHOUT ANY WARRANTY; without even the implied
 warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public
 License along with this library; if not, write to the Free Software
 Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301 USA
*/

UADEBackendAdapter = (function(){ var $this = function (basePath) { 
	$this.base.call(this, backend_UADE.Module, 2);	
		this.basePath= basePath;
		this.Module.ccall('emu_prepare', 'number', ['string'], [basePath]);	// init virtual FS
	}; 
	// UADE's sample buffer contains 2-byte integer sample data (i.e. must be rescaled) 
	// of 2 interleaved channels
	extend(EmsHEAP16BackendAdapter, $this, {  
		getAudioBuffer: function() {
			var ptr=  this.Module.ccall('emu_get_audio_buffer', 'number');			
			// make it a this.Module.HEAP16 pointer
			return ptr >> 1;	// 2 x 16 bit samples			
		},
		getAudioBufferLength: function() {
			var len= this.Module.ccall('emu_get_audio_buffer_length', 'number') >>2;
			return len;
		},
		computeAudioSamples: function() {
			var status= this.Module.ccall('emu_compute_audio_samples', 'number');
			
			if (status == -1)  {
				return status;	// waiting for some file
			} else if (status > 0) {
				// song is done or error (file can not be loaded with no hope of recovery)

				var isExit= this.Module.ccall('emu_is_exit', 'number');
				if ( isExit) {
					return 2;		// error
				} else {
					return 1;		// end
				}
			}
			return 0;	
		},
		getPathAndFilename: function(fullFilename) {			
			// we need to properly separate the subfolder path from the basePath
			// because the basePath must be properly set to make UADE look for
			// its resource files in the right place..
			if (fullFilename.substring(0, this.basePath.length) == this.basePath) {
				fullFilename= fullFilename.substring(this.basePath.length);
			}
			return [this.basePath, fullFilename];
		},
		loadMusicData: function(sampleRate, path, filename, data) {
			// UADE adds its own path delim so we better remove existing delim
			if (path.substr(-1) === "/") path= path.substring(0, path.length-1);
			
			var ret = this.Module.ccall('emu_init', 'number', 
								['number', 'string', 'string'], 
								[sampleRate, path, filename]);
				
			if (ret == 0) {
				// UADE's maximum sample rate is SOUNDTICKS_NTSC 3579545 which 
				// should never be a relevant limitation here..
				var inputSampleRate = sampleRate;
				this.resetSampleRate(sampleRate, inputSampleRate); 
			}
			return ret;
		},
		evalTrackOptions: function(options) {
			this.initSongAttributes();
			
			if ((typeof options.timeout != 'undefined') && (options.timeout >0)) {
				ScriptNodePlayer.getInstance().setPlaybackTimeout(options.timeout*1000);
			}			
			if(options.track >0) {
				// songs without multiple subsongs seem to take this very badly.. (e.g. 'powerdrift')
				return this.Module.ccall('emu_set_subsong', 'number', ['number'], [options.track]);
			}
			return 0;
		},				
		teardown: function() {
//			this.Module.ccall('emu_teardown', 'number'); for some reason wasn't used in the old version
		},		
		
		initSongAttributes: function() {
			this.songInfo= new Object();
			this.songInfo.info1= "";
			this.songInfo.info2= "";
			this.songInfo.info3= "";;
			this.songInfo.mins= "";
			this.songInfo.maxs= "";
			this.songInfo.curs= "";			
		},
		getSongInfoMeta: function() {
			return {info1: String,
					info2: String,
					info3: String,
					mins: String,
					maxs: String,
					curs: String 
					};
		},
		updateSongInfo: function(filename, result) {
			result.info1= this.songInfo.info1;
			result.info2= this.songInfo.info2;
			result.info3= this.songInfo.info3;;			
			result.mins= this.songInfo.minText;
			result.maxs= this.songInfo.maxText;
			result.curs= this.songInfo.currText;
		},
		// --------------------------- async file loading stuff -------------------------
		handleBackendSongAttributes: function(backendAttr, target) {
			// UADE "asynchronously" pushes a respective update..
			this.songInfo.info1= backendAttr.info1;
			this.songInfo.info2= backendAttr.info2;
			this.songInfo.info3= backendAttr.info3;;		
			this.songInfo.mins= backendAttr.minText;
			this.songInfo.maxs= backendAttr.maxText;
			this.songInfo.curs= backendAttr.currText;
			
			this.updateSongInfo("", target);		
		},
		mapBackendFilename: function (name) {
			var input= this.Module.Pointer_stringify(name);
			return input;
		},
		registerFileData: function(pathFilenameArray, data) {
			// setup data in our virtual FS (the next access should then be OK)
			return this.registerEmscriptenFileData(pathFilenameArray, data);
		},
		
	});	return $this; })();
	