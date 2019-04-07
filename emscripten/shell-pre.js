// create separate namespace for all the Emscripten stuff.. otherwise naming clashes may occur especially when 
// optimizing using closure compiler..
window.spp_backend_state_UADE= {
	notReady: true,
	adapterCallback: function(){}	// overwritten later	
};
window.spp_backend_state_UADE["onRuntimeInitialized"] = function() {	// emscripten callback needed in case async init is used (e.g. for WASM)
	this.notReady= false;
	this.adapterCallback();
}.bind(window.spp_backend_state_UADE);

// HACK
window.getStringifiedLines= function(bytes) {
	var ret= [];
	
	var line = "";
	for (var i= 0; i<bytes.length; i++) {
		var c= bytes[i];
		if ((c == 13) || (c == 10)) { // CR or LF
			if (line.length) {	
				ret.push(line);	
				line= "";
			} else {
				// just ignore empty lines
			}
		} else {
			// this seems to be all that is needed.. see /Delitracker Custom/Chris Huelsbeck/ (copyright sign, etc)
			line = line + String.fromCharCode(c);
		}
	}
	return ret;
}

window.base64Decode = function(encoded) {
	var charArray = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	
	function findChar(str, c) {
		for (var i= 0; i<str.length; i++) {
			if (str.charAt(i) == c) {
				return i;
			}
		}
		return -1;
	} 
	function is_base64(c) {
		function alphanumeric(inputtxt) {
			var letterNumber = /^[0-9a-zA-Z]+$/;
			return inputtxt.match(letterNumber);
		}
		return (alphanumeric(""+c) || (c == '+') || (c == '/'));
	}

	
	var offsetlen= encoded.length;
	var i= j= offset= 0;
	var arr4= new Array(4);
	var arr3= new Array(3);
	var ret= [];

	while (offsetlen-- && ( encoded.charAt(offset) != '=') && is_base64(encoded.charAt(offset))) {
		arr4[i++]= encoded.charAt(offset); offset++;
		if (i ==4) {
			for (i = 0; i <4; i++) {
				arr4[i] = findChar(charArray, arr4[i]);
			}
			arr3[0] = ( arr4[0] << 2       ) + ((arr4[1] & 0x30) >> 4);
			arr3[1] = ((arr4[1] & 0xf) << 4) + ((arr4[2] & 0x3c) >> 2);
			arr3[2] = ((arr4[2] & 0x3) << 6) +   arr4[3];

			for (i = 0; (i < 3); i++) {
				var val= arr3[i];
				ret.push(val);
			}
			i = 0;
		}
	}
	if (i) {
		for (j = 0; j < i; j++) {
			arr4[j] = findChar(charArray, arr4[j]);
		}
		arr3[0] = (arr4[0] << 2) + ((arr4[1] & 0x30) >> 4);
		arr3[1] = ((arr4[1] & 0xf) << 4) + ((arr4[2] & 0x3c) >> 2);

		for (j = 0; (j < i - 1); j++) { 
			var val= arr3[j];
			ret.push(val);
		}
	}
	return ret;
};


var backend_UADE = (function(Module) {