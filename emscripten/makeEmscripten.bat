:: **** use the "-s WASM" switch to compile WebAssembly output. warning: the SINGLE_FILE approach does NOT currently work in Chrome 63.. ****
emcc.bat -s WASM=0 -s ASSERTIONS=1 -s SAFE_HEAP=0 -s TOTAL_MEMORY=33554432 --pre-js pre.js --js-library callback.js -s VERBOSE=0 -s FORCE_FILESYSTEM=1 -Wno-pointer-sign -I../src/ -I../src/include -I../src/frontends/common -Os -O3 --memory-init-file 0 --closure 1 --llvm-lto 1 ../src/newcpu.c ../src/memory.c ../src/custom.c ../src/cia.c ../src/audio.c ../src/compiler.c ../src/cpustbl.c ../src/missing.c ../src/sd-sound.c ../src/md-support.c ../src/cfgfile.c ../src/fpp.c ../src/readcpu.c ../src/cpudefs.c ../src/cpuemu1.c ../src/cpuemu2.c ../src/cpuemu3.c ../src/cpuemu4.c ../src/cpuemu5.c ../src/cpuemu6.c ../src/cpuemu7.c ../src/cpuemu8.c ../src/uade.c ../src/unixatomic.c ../src/ossupport.c ../src/uademain.c ../src/sinctable.c ../src/text_scope.c ../src/frontends/common/effects.c ../src/frontends/common/uadeconf.c ../src/frontends/common/support.c ../src/frontends/common/songinfo.c ../src/frontends/common/songdb.c ../src/frontends/common/amifilemagic.c ../src/frontends/common/eagleplayer.c adapter.c -s EXPORTED_FUNCTIONS="['_emu_prepare','_emu_init','_emu_is_exit','_emu_compute_audio_samples','_emu_teardown','_emu_get_audio_buffer','_emu_set_subsong','_emu_get_audio_buffer_length', '_malloc', '_free', '_emu_set_panning']"  -o htdocs/uade.js -s SINGLE_FILE=0 -s EXTRA_EXPORTED_RUNTIME_METHODS="['ccall', 'getValue', 'Pointer_stringify']"  -s BINARYEN_ASYNC_COMPILATION=1 -s BINARYEN_TRAP_MODE='clamp' && copy /b shell-pre.js + htdocs\uade.js + shell-post.js htdocs\web_uade.js && del htdocs\uade.js && copy /b htdocs\web_uade.js + uade_adapter.js htdocs\backend_uade.js && del htdocs\web_uade.js

:: **** use the "-s WASM" switch to compile WebAssembly output. warning: the SINGLE_FILE approach does NOT currently work in Chrome 63.. ****
::set "OPT= -s WASM=0 -s ASSERTIONS=0 --pre-js pre.js --js-library callback.js -s VERBOSE=0 -s FORCE_FILESYSTEM=1 -Wno-pointer-sign -I../src/ -I../src/include -I../src/frontends/common -Os -O3 "

::if not exist "built/uade.bc" (
::	call emcc.bat %OPT% ../src/newcpu.c ../src/memory.c ../src/custom.c ../src/cia.c ../src/audio.c ../src/compiler.c ../src/cpustbl.c ../src/missing.c ../src/sd-sound.c ../src/md-support.c ../src/cfgfile.c ../src/fpp.c ../src/readcpu.c ../src/cpudefs.c ../src/cpuemu1.c ../src/cpuemu2.c ../src/cpuemu3.c ../src/cpuemu4.c ../src/cpuemu5.c ../src/cpuemu6.c ../src/cpuemu7.c ../src/cpuemu8.c ../src/uade.c ../src/unixatomic.c ../src/ossupport.c ../src/uademain.c ../src/sinctable.c ../src/text_scope.c ../src/frontends/common/effects.c ../src/frontends/common/uadeconf.c ../src/frontends/common/support.c ../src/frontends/common/songinfo.c ../src/frontends/common/songdb.c ../src/frontends/common/amifilemagic.c ../src/frontends/common/eagleplayer.c	 -o built/uade.bc 
::	IF !ERRORLEVEL! NEQ 0 goto :END
::)
::call emcc.bat  %OPT% --closure 1 --llvm-lto 1 --memory-init-file 0  built/uade.bc adapter.c -s EXPORTED_FUNCTIONS="['_emu_prepare','_emu_init','_emu_is_exit','_emu_compute_audio_samples','_emu_teardown','_emu_get_audio_buffer','_emu_set_subsong','_emu_get_audio_buffer_length', '_malloc', '_free', '_emu_set_panning']"  -o htdocs/uade.js -s SINGLE_FILE=0 -s EXTRA_EXPORTED_RUNTIME_METHODS="['ccall', 'getValue', 'Pointer_stringify']"  -s BINARYEN_ASYNC_COMPILATION=1 -s BINARYEN_TRAP_MODE='clamp' && copy /b shell-pre.js + htdocs\uade.js + shell-post.js htdocs\web_uade.js && del htdocs\uade.js && copy /b htdocs\web_uade.js + uade_adapter.js htdocs\backend_uade.js && del htdocs\web_uade.js

:: :END

