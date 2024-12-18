#pragma once

#include <napi.h>
#include <atomic>

#ifdef __APPLE__
#include <CoreGraphics/CoreGraphics.h>
#endif

namespace keyboard {
    // Function declarations for Node.js bindings
    Napi::Boolean createKeyboardHook(const Napi::CallbackInfo &info);
    Napi::Boolean destroyKeyboardHook(const Napi::CallbackInfo &info);
    Napi::Boolean pauseKeyEvents(const Napi::CallbackInfo &info);
    Napi::Boolean resumeKeyEvents(const Napi::CallbackInfo &info);

    // Common variables
    extern std::atomic_bool installKeyboardHook;
    extern Napi::ThreadSafeFunction _tsfn;

    // Platform-specific event context structures
    #ifdef _WIN32
    struct KeyboardEventContext {
        public:
            int nCode;
            unsigned int wParam;  // WM_KEYDOWN, WM_KEYUP, etc.
            unsigned int vkCode;  // Virtual key code
            unsigned int scanCode;
            bool extended;        // Extended key flag
    };
    #elif __APPLE__
    struct KeyboardEventContext {
        public:
            CGEventType type;
            CGKeyCode keyCode;
            bool isKeyDown;
            bool isRepeat;
    };
    #endif
} 