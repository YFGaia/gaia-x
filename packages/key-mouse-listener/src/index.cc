// Platform-specific mouse event handling
#include <napi.h>
#include "mouse.hpp"
#include "keyboard.hpp"

// Initialize the module and export functions
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Export mouse functions
    exports.Set(Napi::String::New(env, "createMouseHook"),
                Napi::Function::New(env, mouse::createMouseHook));
    exports.Set(Napi::String::New(env, "enableMouseMove"),
                Napi::Function::New(env, mouse::enableMouseMove));
    exports.Set(Napi::String::New(env, "disableMouseMove"),
                Napi::Function::New(env, mouse::disableMouseMove));
    exports.Set(Napi::String::New(env, "pauseMouseEvents"),
                Napi::Function::New(env, mouse::pauseMouseEvents));
    exports.Set(Napi::String::New(env, "resumeMouseEvents"),
                Napi::Function::New(env, mouse::resumeMouseEvents));

    // Export keyboard functions
    exports.Set(Napi::String::New(env, "createKeyboardHook"),
                Napi::Function::New(env, keyboard::createKeyboardHook));
    exports.Set(Napi::String::New(env, "destroyKeyboardHook"),
                Napi::Function::New(env, keyboard::destroyKeyboardHook));
    exports.Set(Napi::String::New(env, "pauseKeyEvents"),
                Napi::Function::New(env, keyboard::pauseKeyEvents));
    exports.Set(Napi::String::New(env, "resumeKeyEvents"),
                Napi::Function::New(env, keyboard::resumeKeyEvents));

    return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)