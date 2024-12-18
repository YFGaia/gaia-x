#include <CoreGraphics/CoreGraphics.h>
#include <Carbon/Carbon.h>
#include <atomic>
#include <iostream>
#include "../mouse.hpp"

namespace mouse {
    std::atomic_bool captureMouseMove(false);
    std::atomic_bool installEventHook(false);
    static bool hasLoggedMoveDisabled = false;
    Napi::ThreadSafeFunction _tsfn;
    static CFRunLoopSourceRef runLoopSource = nullptr;
    static CFMachPortRef eventTap = nullptr;
    static CFRunLoopRef runLoop = nullptr;
    static dispatch_queue_t eventQueue = nullptr;

    // Mouse event callback function
    CGEventRef MouseEventCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *refcon) {
        if (!installEventHook.load()) {
            std::cout << "[Mouse Debug] Event hook not installed, skipping event" << std::endl;
            return event;
        }

        // Check if it's a mouse event we're interested in
        bool isMouseEvent = false;
        switch (type) {
            case kCGEventMouseMoved:
                if (!captureMouseMove.load()) {
                    if (!hasLoggedMoveDisabled) {
                        std::cout << "[Mouse Debug] Mouse move event received but capture is disabled" << std::endl;
                        hasLoggedMoveDisabled = true;
                    }
                    return event;
                }
                isMouseEvent = true;
                break;
            case kCGEventLeftMouseDown:
            case kCGEventLeftMouseUp:
            case kCGEventRightMouseDown:
            case kCGEventRightMouseUp:
            case kCGEventOtherMouseDown:
            case kCGEventOtherMouseUp:
            case kCGEventScrollWheel:
                isMouseEvent = true;
                break;
            default:
                std::cout << "[Mouse Debug] Unhandled event type: " << type << std::endl;
                return event;
        }

        if (!isMouseEvent) {
            return event;
        }

        // Get mouse location
        CGPoint location = CGEventGetLocation(event);
        // std::cout << "[Mouse Debug]" << type << ", Position: (" << location.x << ", " << location.y << ")" << std::endl;

        // Create event context
        auto pMouseEvent = new MouseEventContext();
        pMouseEvent->type = type;
        pMouseEvent->location = location;
        
        // Get mouse button
        switch (type) {
            case kCGEventLeftMouseDown:
            case kCGEventLeftMouseUp:
                pMouseEvent->button = kCGMouseButtonLeft;
                break;
            case kCGEventRightMouseDown:
            case kCGEventRightMouseUp:
                pMouseEvent->button = kCGMouseButtonRight;
                break;
            case kCGEventOtherMouseDown:
            case kCGEventOtherMouseUp:
                pMouseEvent->button = kCGMouseButtonCenter;
                break;
            default:
                pMouseEvent->button = kCGMouseButtonLeft; // Default to left button for move/scroll events
        }

        // Get scroll wheel data or other mouse data
        if (type == kCGEventScrollWheel) {
            pMouseEvent->mouseData = CGEventGetIntegerValueField(event, kCGScrollWheelEventDeltaAxis1);
        } else {
            pMouseEvent->mouseData = 0;
        }

        // Pass to JS callback
        _tsfn.NonBlockingCall(pMouseEvent, [](Napi::Env env, Napi::Function jsCallback, MouseEventContext* pMouseEvent) {
            std::string eventType;
            switch (pMouseEvent->type) {
                case kCGEventMouseMoved:
                    eventType = "mousemove";
                    break;
                case kCGEventLeftMouseDown:
                case kCGEventRightMouseDown:
                case kCGEventOtherMouseDown:
                    eventType = "mousedown";
                    break;
                case kCGEventLeftMouseUp:
                case kCGEventRightMouseUp:
                case kCGEventOtherMouseUp:
                    eventType = "mouseup";
                    break;
                case kCGEventScrollWheel:
                    eventType = "wheel";
                    break;
                default:
                    eventType = "unknown";
            }

            try {
                jsCallback.Call({
                    Napi::String::New(env, eventType),
                    Napi::Number::New(env, pMouseEvent->location.x),
                    Napi::Number::New(env, pMouseEvent->location.y),
                    Napi::Number::New(env, pMouseEvent->button),
                    Napi::Number::New(env, pMouseEvent->mouseData)
                });
            } catch (const std::exception& e) {
                std::cerr << "[Mouse Debug] Error executing JS callback: " << e.what() << std::endl;
            }

            delete pMouseEvent;
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
        // std::cout << "[Mouse Debug] Starting mouse event loop" << std::endl;
        runLoop = CFRunLoopGetCurrent();
        
        // Create event tap for all mouse events
        CGEventMask eventMask = 
            CGEventMaskBit(kCGEventMouseMoved) |
            CGEventMaskBit(kCGEventLeftMouseDown) |
            CGEventMaskBit(kCGEventLeftMouseUp) |
            CGEventMaskBit(kCGEventRightMouseDown) |
            CGEventMaskBit(kCGEventRightMouseUp) |
            CGEventMaskBit(kCGEventOtherMouseDown) |
            CGEventMaskBit(kCGEventOtherMouseUp) |
            CGEventMaskBit(kCGEventScrollWheel);

        // std::cout << "[Mouse Debug] Creating event tap with mask: " << eventMask << std::endl;

        // First try with session event tap
        eventTap = CGEventTapCreate(
            kCGSessionEventTap,
            kCGHeadInsertEventTap,
            kCGEventTapOptionDefault,
            eventMask,
            MouseEventCallback,
            nullptr
        );
        
        // If session event tap fails, try HID event tap
        if (!eventTap) {
            // std::cout << "[Mouse Debug] Session event tap creation failed, trying HID event tap..." << std::endl;
            eventTap = CGEventTapCreate(
                kCGHIDEventTap,
                kCGHeadInsertEventTap,
                kCGEventTapOptionDefault,
                eventMask,
                MouseEventCallback,
                nullptr
            );
        }

        if (!eventTap) {
            std::cerr << "[Mouse Debug] Failed to create mouse event tap. Please check accessibility permissions." << std::endl;
            return nullptr;
        }

        // std::cout << "[Mouse Debug] Event tap created successfully" << std::endl;

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

        // Verify event tap is receiving events
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 1 * NSEC_PER_SEC), dispatch_get_main_queue(), ^{
            if (!captureMouseMove.load()) {
                std::cout << "Mouse event tap is active but not capturing move events. Call enableMouseMove() to start capturing." << std::endl;
            }
        });

        // Run the event loop
        CFRunLoopRun();
        
        return nullptr;
    }

    // Create mouse hook
    Napi::Boolean createMouseHook(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1 || !info[0].IsFunction()) {
            throw Napi::Error::New(env, "Callback function expected");
        }

        // Cleanup any existing event tap
        CleanupEventTap();

        // Create thread-safe function
        _tsfn = Napi::ThreadSafeFunction::New(
            env,
            info[0].As<Napi::Function>(),
            "Mouse Hook",
            512,
            1,
            [](Napi::Env) { CleanupEventTap(); }
        );

        // Create dispatch queue for event loop
        eventQueue = dispatch_queue_create("com.mouse.listener", DISPATCH_QUEUE_SERIAL);
        if (!eventQueue) {
            throw Napi::Error::New(env, "Failed to create dispatch queue");
        }

        installEventHook = true;
        dispatch_async(eventQueue, ^{
            RunEventLoop(nullptr);
        });

        return Napi::Boolean::New(env, true);
    }

    // Enable mouse move events
    void enableMouseMove(const Napi::CallbackInfo& info) {
        captureMouseMove = true;
        hasLoggedMoveDisabled = false;
        // std::cout << "[Mouse Debug] Mouse move capture enabled" << std::endl;
    }

    // Disable mouse move events
    void disableMouseMove(const Napi::CallbackInfo& info) {
        captureMouseMove = false;
        // std::cout << "[Mouse Debug] Mouse move capture disabled" << std::endl;
    }

    // Pause mouse events
    Napi::Boolean pauseMouseEvents(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (eventTap) {
            installEventHook = false;
            CGEventTapEnable(eventTap, false);
        }
        
        return Napi::Boolean::New(env, true);
    }

    // Resume mouse events
    Napi::Boolean resumeMouseEvents(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (eventTap) {
            installEventHook = true;
            CGEventTapEnable(eventTap, true);
        }
        
        return Napi::Boolean::New(env, true);
    }
}
