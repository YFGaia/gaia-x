#define WIN32_LEAN_AND_MEAN 1
#include <napi.h>
#include <windows.h>
#include <string>
#include <iostream>
#include <atomic>
#include "../mouse.hpp"

typedef BOOL(WINAPI *SetProcessDpiAwarenessContextFunc)(DPI_AWARENESS_CONTEXT);
typedef BOOL(WINAPI *SetProcessDPIAwareFunc)(void);

// Global variables
namespace mouse {
    Napi::ThreadSafeFunction _tsfn;
    std::atomic_bool captureMouseMove = false;
    std::atomic_bool installEventHook = false;
}

// Windows-specific globals
static HANDLE _hThread;
static std::atomic_bool dpiAware = false;
static DWORD dwThreadID = 0;

POINT GetLogicalMousePosition(HWND hwnd) {
    POINT point;
    if (GetCursorPos(&point)) {
        if (ScreenToClient(hwnd, &point)) {
            return point;
        }
    }
    return {0, 0};
}

void onMainThread(Napi::Env env, Napi::Function function, mouse::MouseEventContext *pMouseEvent) {
    auto nCode = pMouseEvent->nCode;
    auto wParam = pMouseEvent->wParam;
    auto ptX = pMouseEvent->ptX;
    auto ptY = pMouseEvent->ptY;
    auto nMouseData = pMouseEvent->mouseData;

    delete pMouseEvent;

    if (nCode >= 0) {
        auto name = "";
        auto button = -1;

        if (wParam == WM_MOUSEMOVE) {
            if(mouse::captureMouseMove.load()) {
                name = "mousemove";
            }
        } else {
            if (wParam == WM_LBUTTONUP || wParam == WM_RBUTTONUP || wParam == WM_MBUTTONUP || wParam == WM_XBUTTONUP) {
                name = "mouseup";
            } else if (wParam == WM_LBUTTONDOWN || wParam == WM_RBUTTONDOWN || wParam == WM_MBUTTONDOWN || wParam == WM_XBUTTONDOWN) {
                name = "mousedown";
            } else if (wParam == WM_MOUSEWHEEL || wParam == WM_MOUSEHWHEEL) {
                name = "mousewheel";
            }

            if (wParam == WM_LBUTTONUP || wParam == WM_LBUTTONDOWN) {
                button = 1;
            } else if (wParam == WM_RBUTTONUP || wParam == WM_RBUTTONDOWN) {
                button = 2;
            } else if (wParam == WM_MBUTTONUP || wParam == WM_MBUTTONDOWN) {
                button = 3;
            } else if (wParam == WM_MOUSEWHEEL) {
                button = 0;
            } else if (wParam == WM_MOUSEHWHEEL) {
                button = 1;
            }
        }

        if (name != "") {
            Napi::HandleScope scope(env);

            auto x = Napi::Number::New(env, ptX);
            auto y = Napi::Number::New(env, ptY);
            auto mouseData = Napi::Number::New(env, nMouseData);

            function.Call(
                env.Global(),
                {
                    Napi::String::New(env, name), x, y,
                    Napi::Number::New(env, button), mouseData
                }
            );
        }
    }
}

POINT scaledPos() {
    POINT pt;
    GetCursorPos(&pt);
    
    HWND hwnd = WindowFromPoint(pt);
    if (!hwnd) {
        hwnd = GetDesktopWindow();
    }

    UINT dpi = GetDpiForWindow(hwnd);
    float scalingFactor = dpi / 96.0f;
    
    POINT logicalPt = pt;
    // std::cout << " pt: " << pt.x << ", " << pt.y << std::endl;
    logicalPt.x /= scalingFactor;
    logicalPt.y /= scalingFactor;
    // std::cout << " pt: " << logicalPt.x << ", " << logicalPt.y << " scale: " << scalingFactor << std::endl;
    return logicalPt;
}

LRESULT CALLBACK HookCallback(int nCode, WPARAM wParam, LPARAM lParam) {
    if(!(wParam == WM_MOUSEMOVE && !mouse::captureMouseMove.load())) {
        MSLLHOOKSTRUCT *data = (MSLLHOOKSTRUCT *)lParam;
        auto pMouseEvent = new mouse::MouseEventContext();
        pMouseEvent->nCode = nCode;
        pMouseEvent->wParam = wParam;

        POINT pt = scaledPos();
        pMouseEvent->ptX = pt.x;
        pMouseEvent->ptY = pt.y;
        pMouseEvent->mouseData = data->mouseData;

        mouse::_tsfn.NonBlockingCall(pMouseEvent, onMainThread);
    }

    return CallNextHookEx(NULL, nCode, wParam, lParam);
}

DWORD WINAPI MouseHookThread(LPVOID lpParam) {
    MSG msg;
    HHOOK hook = mouse::installEventHook.load() ? SetWindowsHookEx(WH_MOUSE_LL, HookCallback, NULL, 0) : NULL;

    while (GetMessage(&msg, NULL, 0, 0) > 0) {
        if (msg.message != WM_USER) continue;

        if (!mouse::installEventHook.load() && hook != NULL) {
            if (!UnhookWindowsHookEx(hook)) break;
            hook = NULL;
        } 
        else if (mouse::installEventHook.load() && hook == NULL) {
            hook = SetWindowsHookEx(WH_MOUSE_LL, HookCallback, NULL, 0);
            if (hook == NULL) break;
        }
    }

    mouse::_tsfn.Release();
    return GetLastError();
}

namespace mouse {
    Napi::Boolean createMouseHook(const Napi::CallbackInfo &info) {
        _hThread = CreateThread(NULL, 0, MouseHookThread, NULL, CREATE_SUSPENDED, &dwThreadID);
        _tsfn = Napi::ThreadSafeFunction::New(
            info.Env(),
            info[0].As<Napi::Function>(),
            "WH_MOUSE_LL Hook Thread",
            512,
            1,
            [] ( Napi::Env ) { CloseHandle(_hThread); }
        );

        ResumeThread(_hThread);
        return Napi::Boolean::New(info.Env(), true);
    }

    void enableMouseMove(const Napi::CallbackInfo &info) {
        captureMouseMove = true;
    }

    void disableMouseMove(const Napi::CallbackInfo &info) {
        captureMouseMove = false;
    }

    Napi::Boolean pauseMouseEvents(const Napi::CallbackInfo &info) {
        BOOL bDidPost = FALSE;
        if (dwThreadID != 0) {
            installEventHook = false;
            bDidPost = PostThreadMessageW(dwThreadID, WM_USER, NULL, NULL);
        }
        return Napi::Boolean::New(info.Env(), bDidPost);
    }

    Napi::Boolean resumeMouseEvents(const Napi::CallbackInfo &info) {
        BOOL bDidPost = FALSE;
        if (dwThreadID != 0) {
            installEventHook = true;
            bDidPost = PostThreadMessageW(dwThreadID, WM_USER, NULL, NULL);
        }
        return Napi::Boolean::New(info.Env(), bDidPost);
    }
}
