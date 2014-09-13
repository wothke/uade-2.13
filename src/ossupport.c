#include "ossupport.h"

#ifdef EMSCRIPTEN
#include "standalonesupport.c"
#else
#include "unixsupport.c"
#endif