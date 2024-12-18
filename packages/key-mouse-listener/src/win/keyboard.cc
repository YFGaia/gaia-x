#include <windows.h>
#include <atomic>
#include <iostream>
#include "../keyboard.hpp"

namespace keyboard {
    std::atomic_bool installKeyboardHook(false);
    Napi::ThreadSafeFunction _tsfn;
    HHOOK keyboardHook = NULL;
    static HANDLE _hThread;
    static DWORD dwThreadID = 0;

    // Keyboard hook callback function
    LRESULT CALLBACK KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
        if (nCode >= 0 && installKeyboardHook) {
            KBDLLHOOKSTRUCT* kbStruct = (KBDLLHOOKSTRUCT*)lParam;
            
            auto pKeyEvent = new KeyboardEventContext();
            pKeyEvent->nCode = nCode;
            pKeyEvent->wParam = wParam;
            pKeyEvent->vkCode = kbStruct->vkCode;
            pKeyEvent->scanCode = kbStruct->scanCode;
            pKeyEvent->extended = (kbStruct->flags & LLKHF_EXTENDED) != 0;
            // std::cout << "KeyboardProc: " << pKeyEvent->vkCode << std::endl;
            // Create a JavaScript callback
            auto callback = [](Napi::Env env, Napi::Function jsCallback, KeyboardEventContext* pKeyEvent) {
                // std::cout << "Executing JS callback for key: " << pKeyEvent->vkCode << std::endl;
                
                // Create event type string
                std::string eventType = (pKeyEvent->wParam == WM_KEYDOWN || pKeyEvent->wParam == WM_SYSKEYDOWN) ? "keydown" : "keyup";
                
                // Pass parameters separately instead of as an object
                jsCallback.Call({
                    Napi::String::New(env, eventType),
                    Napi::Number::New(env, pKeyEvent->vkCode),
                    Napi::Number::New(env, pKeyEvent->scanCode),
                    Napi::Boolean::New(env, pKeyEvent->extended)
                });
                
                // std::cout << "JS callback executed" << std::endl;
                delete pKeyEvent;
            };

            // std::cout << "Calling NonBlockingCall..." << std::endl;
            _tsfn.NonBlockingCall(pKeyEvent, callback);
            // std::cout << "NonBlockingCall completed" << std::endl;
        }
        return CallNextHookEx(keyboardHook, nCode, wParam, lParam);
    }

    DWORD WINAPI KeyboardHookThread(LPVOID lpParam) {
        MSG msg;
        keyboardHook = installKeyboardHook.load() ? SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardProc, NULL, 0) : NULL;

        while (GetMessage(&msg, NULL, 0, 0) > 0) {
            if (msg.message != WM_USER) continue;

            if (!installKeyboardHook.load() && keyboardHook != NULL) {
                if (!UnhookWindowsHookEx(keyboardHook)) break;
                keyboardHook = NULL;
            } 
            else if (installKeyboardHook.load() && keyboardHook == NULL) {
                keyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardProc, NULL, 0);
                if (keyboardHook == NULL) break;
            }
        }

        _tsfn.Release();
        return GetLastError();
    }

    // Create keyboard hook
    Napi::Boolean createKeyboardHook(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        // std::cout << "createKeyboardHook" << std::endl;
        if (info.Length() < 1 || !info[0].IsFunction()) {
            throw Napi::Error::New(env, "Callback function expected");
        }

        _hThread = CreateThread(NULL, 0, KeyboardHookThread, NULL, CREATE_SUSPENDED, &dwThreadID);
        // Create ThreadSafeFunction
        _tsfn = Napi::ThreadSafeFunction::New(
            env,
            info[0].As<Napi::Function>(),
            "Keyboard Hook",
            512,
            1,
            [] ( Napi::Env ) { CloseHandle(_hThread); }
        );

        installKeyboardHook = true;
        ResumeThread(_hThread);
        
        return Napi::Boolean::New(env, true);
    }

    // Destroy keyboard hook
    Napi::Boolean destroyKeyboardHook(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        bool result = false;

        if (keyboardHook != NULL) {
            result = UnhookWindowsHookEx(keyboardHook) != 0;
            keyboardHook = NULL;
        }

        installKeyboardHook = false;
        if (dwThreadID != 0) {
            PostThreadMessageW(dwThreadID, WM_USER, NULL, NULL);
        }
        
        return Napi::Boolean::New(env, result);
    }

    // Pause keyboard events
    Napi::Boolean pauseKeyEvents(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        BOOL bDidPost = FALSE;
        if (dwThreadID != 0) {
            installKeyboardHook = false;
            bDidPost = PostThreadMessageW(dwThreadID, WM_USER, NULL, NULL);
        }
        return Napi::Boolean::New(env, bDidPost);
    }

    // Resume keyboard events
    Napi::Boolean resumeKeyEvents(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        BOOL bDidPost = FALSE;
        if (dwThreadID != 0) {
            installKeyboardHook = true;
            bDidPost = PostThreadMessageW(dwThreadID, WM_USER, NULL, NULL);
        }
        return Napi::Boolean::New(env, bDidPost);
    }
} 