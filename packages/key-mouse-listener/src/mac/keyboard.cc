#include <CoreGraphics/CoreGraphics.h>
#include <Carbon/Carbon.h>
#include <atomic>
#include <iostream>
#include "../keyboard.hpp"

namespace keyboard {
    std::atomic_bool installKeyboardHook(false);
    Napi::ThreadSafeFunction _tsfn;
    static CFRunLoopSourceRef runLoopSource = nullptr;
    static CFMachPortRef eventTap = nullptr;
    static CFRunLoopRef runLoop = nullptr;
    static dispatch_queue_t eventQueue = nullptr;

    // Keyboard event callback function
    CGEventRef KeyboardEventCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *refcon) {
        if (!installKeyboardHook.load()) {
            return event;
        }

        // Only process keyboard events
        if (type != kCGEventKeyDown && type != kCGEventKeyUp && type != kCGEventFlagsChanged) {
            return event;
        }

        // Create event context
        auto pKeyEvent = new KeyboardEventContext();
        pKeyEvent->type = type;
        pKeyEvent->keyCode = (CGKeyCode)CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode);
        pKeyEvent->isKeyDown = (type == kCGEventKeyDown);
        pKeyEvent->isRepeat = CGEventGetIntegerValueField(event, kCGKeyboardEventAutorepeat);

        // Pass to JS callback
        _tsfn.NonBlockingCall(pKeyEvent, [](Napi::Env env, Napi::Function jsCallback, KeyboardEventContext* pKeyEvent) {
            std::string eventType = pKeyEvent->isKeyDown ? "keydown" : "keyup";
            
            jsCallback.Call({
                Napi::String::New(env, eventType),
                Napi::Number::New(env, pKeyEvent->keyCode),
                Napi::Number::New(env, 0),  // scanCode equivalent not available on Mac
                Napi::Boolean::New(env, false)  // extended flag not relevant for Mac
            });
            
            delete pKeyEvent;
        });

        return event;
    }

    void CleanupEventTap() {
        if (runLoopSource) {
            if (runLoop) {
                CFRunLoopRemoveSource(runLoop, runLoopSource, kCFRunLoopCommonModes);
            }
            CFRelease(runLoopSource);
            runLoopSource = nullptr;
        }
        
        if (eventTap) {
            CGEventTapEnable(eventTap, false);
            CFRelease(eventTap);
            eventTap = nullptr;
        }

        if (runLoop) {
            CFRunLoopStop(runLoop);
            runLoop = nullptr;
        }

        if (eventQueue) {
            dispatch_release(eventQueue);
            eventQueue = nullptr;
        }
    }

    void* RunEventLoop(void*) {
        runLoop = CFRunLoopGetCurrent();
        
        // Create event tap
        eventTap = CGEventTapCreate(
            kCGSessionEventTap,
            kCGHeadInsertEventTap,
            kCGEventTapOptionDefault,
            CGEventMaskBit(kCGEventKeyDown) | 
            CGEventMaskBit(kCGEventKeyUp) | 
            CGEventMaskBit(kCGEventFlagsChanged),
            KeyboardEventCallback,
            nullptr
        );
        
        if (!eventTap) {
            std::cerr << "Failed to create event tap" << std::endl;
            return nullptr;
        }

        // Create run loop source
        runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0);
        if (!runLoopSource) {
            std::cerr << "Failed to create run loop source" << std::endl;
            CleanupEventTap();
            return nullptr;
        }

        // Add to run loop and enable
        CFRunLoopAddSource(runLoop, runLoopSource, kCFRunLoopCommonModes);
        CGEventTapEnable(eventTap, true);

        // Run the event loop
        CFRunLoopRun();
        
        return nullptr;
    }

    // Create keyboard hook
    Napi::Boolean createKeyboardHook(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsFunction()) {
            throw Napi::Error::New(env, "Callback function expected");
        }

        // Create thread-safe function
        _tsfn = Napi::ThreadSafeFunction::New(
            env,
            info[0].As<Napi::Function>(),
            "Keyboard Hook",
            512,
            1,
            [](Napi::Env) { CleanupEventTap(); }
        );

        // Create dispatch queue for event loop
        eventQueue = dispatch_queue_create("com.keyboard.listener", DISPATCH_QUEUE_SERIAL);
        if (!eventQueue) {
            throw Napi::Error::New(env, "Failed to create dispatch queue");
        }

        installKeyboardHook = true;
        dispatch_async(eventQueue, ^{
            RunEventLoop(nullptr);
        });

        return Napi::Boolean::New(env, true);
    }

    // Destroy keyboard hook
    Napi::Boolean destroyKeyboardHook(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        installKeyboardHook = false;
        CleanupEventTap();
        
        return Napi::Boolean::New(env, true);
    }

    // Pause keyboard events
    Napi::Boolean pauseKeyEvents(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (eventTap) {
            installKeyboardHook = false;
            CGEventTapEnable(eventTap, false);
        }
        
        return Napi::Boolean::New(env, true);
    }

    // Resume keyboard events
    Napi::Boolean resumeKeyEvents(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (eventTap) {
            installKeyboardHook = true;
            CGEventTapEnable(eventTap, true);
        }
        
        return Napi::Boolean::New(env, true);
    }
} 