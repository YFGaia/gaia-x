#pragma once

#include <napi.h>
#include <atomic>

#ifdef __APPLE__
#include <CoreGraphics/CoreGraphics.h>
#endif

namespace mouse {
    // Function declarations for Node.js bindings
    Napi::Boolean createMouseHook(const Napi::CallbackInfo &info);
    void enableMouseMove(const Napi::CallbackInfo &info);
    void disableMouseMove(const Napi::CallbackInfo &info);
    Napi::Boolean pauseMouseEvents(const Napi::CallbackInfo &info);
    Napi::Boolean resumeMouseEvents(const Napi::CallbackInfo &info);

    // Common variables
    extern std::atomic_bool captureMouseMove;
    extern std::atomic_bool installEventHook;
    extern Napi::ThreadSafeFunction _tsfn;

    // Platform-specific event context structures
    #ifdef _WIN32
    struct MouseEventContext {
        public:
            int nCode;
            unsigned int wParam;
            long ptX;
            long ptY;
            unsigned long mouseData;
    };
    #elif __APPLE__
    struct MouseEventContext {
        public:
            CGEventType type;
            CGPoint location;
            CGMouseButton button;
            int64_t mouseData;
    };
    #endif
} 