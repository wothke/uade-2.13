/*
 uade_adapter.js: Adapts UADE backend to generic WebAudio/ScriptProcessor player.
 
 Known limitation: seeking is not supported by UADE
 
 version 1.01 with added support for "outside files"
 
 	Copyright (C) 2018 Juergen Wothke

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
		this.isReady= false;
		
		if (!backend_UADE.Module.notReady) {
			// in sync scenario the "onRuntimeInitialized" has already fired before execution gets here,
			// i.e. it has to be called explicitly here (in async scenario "onRuntimeInitialized" will trigger
			// the call directly)
			this.doOnAdapterReady();
		}		
	}; 
	// UADE's sample buffer contains 2-byte integer sample data (i.e. must be rescaled) 
	// of 2 interleaved channels
	extend(EmsHEAP16BackendAdapter, $this, {
		doOnAdapterReady: function() {
			// called when runtime is ready (e.g. asynchronously when WASM is loaded)
			this.Module.ccall('emu_prepare', 'number', ['string'], [this.basePath]);	// init virtual FS
			this.isReady = true;
		},
		isAdapterReady: function() { 
			return this.isReady;
		},		
		
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
		mapUri2Fs: function(uri) {		// use extended ASCII that most likely isn't used in filenames
			// replace chars that cannot be used in file/foldernames
			var out= uri.replace(/\/\//, "ýý");	
				out = out.replace(/\?/, "ÿ");
				out = out.replace(/:/, "þ");
				out = out.replace(/\*/, "ü");
				out = out.replace(/"/, "û");
				out = out.replace(/</, "ù");
				out = out.replace(/>/, "ø");
				out = out.replace(/\|/, "÷");
			return out;
		},
		mapFs2Uri: function(fs) {
			var out= fs.replace(/ýý/, "//");
				out = out.replace(/ÿ/, "?");
				out = out.replace(/þ/, ":");
				out = out.replace(/ü/, "*");
				out = out.replace(/û/, "\"");
				out = out.replace(/ù/, "<");
				out = out.replace(/ø/, ">");
				out = out.replace(/÷/, "|");
			return out;
		},
		mapUrl: function(filename) {
			// used transform the "internal filename" to a valid URL
			var uri= this.mapFs2Uri(filename);
			var p= uri.indexOf("@");	// cut off "basePath" for "outside" files
			if (p >= 0) {
				uri= uri.substring(p+1);
			}			
			return uri;
		},
		/*
		* Creates the URL used to retrieve the song file.
		*/
		mapInternalFilename: function(overridePath, basePath, filename) {
			// the problem is that in UADE there is only one "basePath" and this specifies 
			// where to look for *any* files, i.e. uade prefixes this path to whatever
			// files it is tying to load (config/music - doesn't matter), i.e. a correct 
			// outside URL CANNOT be passed through UADE without being messed up in the process
			
			// solution: use a special marker for "outside" URLs and later just substitute 
			// whatever garbage path information UADE is adding (see mapUrl() above)
			
			// map URL to some valid FS path (must not contain "//", ":" or "?")
			// input e.g. "@mod_proxy.php?mod=Fasttracker/4-Mat/bonus.mod" or
			// "@ftp://foo.com/foo/bar/file.mod" (should avoid name clashes)
			filename= this.mapUri2Fs("@" + filename);	// treat all songs as "from outside"

			return ((overridePath)?overridePath:basePath) + filename;	// this._basePath ever needed?
		},
		getPathAndFilename: function(fullFilename) {
			// input is path+filename combined: base for "registerFileData" & "loadMusicData"
			
			if (fullFilename.substring(0, this.basePath.length) == this.basePath) {
				fullFilename= fullFilename.substring(this.basePath.length);
			}
			// since uade needs the basePath to *ALWAYS* point to the folder where the various config 
			// files can be found, the filename returned here is actually still a path 
			return [this.basePath, fullFilename];
		},
		mapCacheFileName: function (name) {
			return name;	// might need to use toUpper() in case there are inconsistent refs
		},
		mapBackendFilename: function (name) {
			// triggered by UADE whenever it tries to load a file, the input "name" is
			// composed of UADE's basePath combined with the file that uade is looking for:
			// the "name" is what UADE later WILL USE for fopen (which is NOT affected by any mappings 
			// that might be done here.. i.e. in order to function the file must be installed in the FS
			// under exactly that path/name!)
			var input= this.Module.Pointer_stringify(name);
			return input;
		},
		registerFileData: function(pathFilenameArray, data) {
			// NOTE: UADE uses the "C fopen" based impl to access all files, i.e. the files 
			// MUST BE properly provided within the FS (the local player cache here is nothing more than a 
			// convenience shortcut to detect if data is  already available - but irrelevant to UADE)
			
			// input: the path is fixed to the basePath & the filename is actually still a path+filename
			var path= pathFilenameArray[0];
			var filename= pathFilenameArray[1];
					
			// MANDATORTY to move any path info still present in the "filename" to "path"
			var tmpPpathFilenameArray = new Array(2);	// do not touch original IO param			
			var p= filename.lastIndexOf("/");
			if (p > 0) {
				tmpPpathFilenameArray[0]= path + filename.substring(0, p);
				tmpPpathFilenameArray[1]= filename.substring(p+1);
			} else  {
				tmpPpathFilenameArray[0]= path;
				tmpPpathFilenameArray[1]= filename;
			}

			// setup data in our virtual FS (the next access should then be OK)
			return this.registerEmscriptenFileData(tmpPpathFilenameArray, data);
		},
		loadMusicData: function(sampleRate, path, filename, data, options) {
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
		
	});	return $this; })();
	