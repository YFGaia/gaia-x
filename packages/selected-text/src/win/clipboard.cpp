#include <windows.h>  // The Windows API must be included first
#include <iostream>
#include <csignal>
#include "clipboard.h"
#include <vector>
#include "../logger.h"
#include <locale>
#include <codecvt>
#include <string>
#include "../selection.hpp"
#include <winrt/Windows.ApplicationModel.DataTransfer.h>
#include <winrt/Windows.Foundation.Collections.h>

namespace clipboard_winrt {
bool clearClipboardHistory() {
    try {
        winrt::Windows::ApplicationModel::DataTransfer::Clipboard::ClearHistory();
        return true;
    }
    catch (const winrt::hresult_error& ex) {
        Logger::error(L"Failed to clear clipboard history: " + std::wstring(ex.message()));
        return false;
    }
}

bool deleteLatestHistoryItem() {
    try {
        // Get clipboard history items
        auto historyItemsResult = winrt::Windows::ApplicationModel::DataTransfer::Clipboard::GetHistoryItemsAsync().get();
        if (!historyItemsResult || historyItemsResult.Items().Size() == 0) {
            return false;
        }

        // Get the most recent item (first item in the list)
        auto latestItem = historyItemsResult.Items().GetAt(0);
        
        // Delete this specific item
        // Logger::info(L"Delete clipboard history item");
        winrt::Windows::ApplicationModel::DataTransfer::Clipboard::DeleteItemFromHistory(latestItem);
        return true;
    }
    catch (const winrt::hresult_error& ex) {
        Logger::error(L"Failed to delete latest clipboard item: " + std::wstring(ex.message()));
        return false;
    }
}

bool isHistoryEnabled() {
    try {
        auto historyItemsResult = winrt::Windows::ApplicationModel::DataTransfer::Clipboard::GetHistoryItemsAsync().get();
        if (historyItemsResult.Items().Size() == 0) {
            Logger::info(L"Clipboard history is not enabled");
            return false;
        }
        return true;
    }
    catch (...) {
        return false;
    }
}
} 

// To solve the problem of deprecating codecvt in C++17, we implement a simple UTF-8 conversion function ourselves
std::wstring utf8_to_wstring(const std::string& str) {
    if (str.empty()) return std::wstring();
    int size_needed = MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), NULL, 0);
    std::wstring wstrTo(size_needed, 0);
    MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), &wstrTo[0], size_needed);
    return wstrTo;
}

std::string wstring_to_utf8(const std::wstring& wstr) {
    if (wstr.empty()) return std::string();
    int size_needed = WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), NULL, 0, NULL, NULL);
    std::string strTo(size_needed, 0);
    WideCharToMultiByte(CP_UTF8, 0, &wstr[0], (int)wstr.size(), &strTo[0], size_needed, NULL, NULL);
    return strTo;
}

// Initialize static member
bool ClipboardManager::isSimulatingCtrlC = false;

// Signal handler for SIGINT
static void signalHandler(int signum) {
    if (ClipboardManager::isSimulatingCtrlC) {
        // Ignore SIGINT if we're simulating Ctrl+C
        return;
    }
    // Otherwise, handle the signal normally
    std::signal(SIGINT, SIG_DFL);
    std::raise(SIGINT);
}

ClipboardManager::ClipboardManager() {
    // Set up signal handler
    std::signal(SIGINT, signalHandler);
    
    // Create a dummy window for clipboard operations
    WNDCLASSEX wc = {};
    wc.cbSize = sizeof(WNDCLASSEX);
    wc.lpfnWndProc = DefWindowProc;
    wc.hInstance = GetModuleHandle(NULL);
    wc.lpszClassName = L"ClipboardManagerClass";
    RegisterClassEx(&wc);

    m_hwnd = CreateWindow(L"ClipboardManagerClass", NULL, 0, 0, 0, 0, 0, HWND_MESSAGE, NULL, GetModuleHandle(NULL), NULL);
}

ClipboardManager::~ClipboardManager() {
    if (m_hwnd) {
        DestroyWindow(m_hwnd);
    }
}

bool ClipboardManager::isClipboardHistoryEnabled() {
    return clipboard_winrt::isHistoryEnabled();
}

std::vector<uint8_t> ClipboardManager::getClipboardData(UINT format) {
    std::vector<uint8_t> result;
    if (!OpenClipboard(m_hwnd)) {
        return result;
    }

    HANDLE hData = GetClipboardData(format);
    if (hData) {
        void* pData = GlobalLock(hData);
        if (pData) {
            SIZE_T size = GlobalSize(hData);
            result.resize(size);
            memcpy(result.data(), pData, size);
            GlobalUnlock(hData);
        }
    }

    CloseClipboard();
    return result;
}

void ClipboardManager::setClipboardData(UINT format, const std::vector<uint8_t>& data) {
    if (data.empty()) return;

    HGLOBAL hGlobal = GlobalAlloc(GMEM_MOVEABLE, data.size());
    if (hGlobal) {
        void* pGlobal = GlobalLock(hGlobal);
        if (pGlobal) {
            memcpy(pGlobal, data.data(), data.size());
            GlobalUnlock(hGlobal);
            SetClipboardData(format, hGlobal);
        }
    }
}

void ClipboardManager::setClipboardText(const std::wstring& text) {
    if (text.empty()) return;

    size_t size = (text.length() + 1) * sizeof(wchar_t);
    HGLOBAL hGlobal = GlobalAlloc(GMEM_MOVEABLE, size);
    if (hGlobal) {
        wchar_t* pGlobal = static_cast<wchar_t*>(GlobalLock(hGlobal));
        if (pGlobal) {
            wcscpy_s(pGlobal, text.length() + 1, text.c_str());
            GlobalUnlock(hGlobal);
            SetClipboardData(CF_UNICODETEXT, hGlobal);
        }
    }
}

ClipboardContent ClipboardManager::getClipboardContent() {
    ClipboardContent content;
    
    if (!OpenClipboard(m_hwnd)) {
        return content;
    }

    // Get text content
    HANDLE hData = GetClipboardData(CF_UNICODETEXT);
    if (hData) {
        wchar_t* pText = static_cast<wchar_t*>(GlobalLock(hData));
        if (pText) {
            content.text = pText;
            content.hasText = true;
            GlobalUnlock(hData);
        }
    }

    // Get RTF content
    auto rtfData = getClipboardData(RegisterClipboardFormat(L"Rich Text Format"));
    if (!rtfData.empty()) {
        content.rtf = std::move(rtfData);
        content.hasRTF = true;
    }

    // Get bitmap content
    auto bitmapData = getClipboardData(CF_DIB);
    if (!bitmapData.empty()) {
        content.bitmap = std::move(bitmapData);
        content.hasBitmap = true;
    }

    // Get HTML content
    auto htmlFormat = RegisterClipboardFormat(L"HTML Format");
    auto htmlData = getClipboardData(htmlFormat);
    if (!htmlData.empty()) {
        // Convert HTML data to string
        std::string htmlStr(reinterpret_cast<char*>(htmlData.data()), htmlData.size());
        content.html = utf8_to_wstring(htmlStr);
        content.hasHTML = true;
    }

    CloseClipboard();
    return content;
}

void ClipboardManager::setClipboardContent(const ClipboardContent& content) {
    if (!OpenClipboard(m_hwnd)) {
        return;
    }

    EmptyClipboard();

    // Set text content
    if (content.hasText) {
        // Use content.text directly since it's already a wstring
        size_t size = (content.text.length() + 1) * sizeof(wchar_t);
        HGLOBAL hMem = GlobalAlloc(GMEM_MOVEABLE, size);
        if (hMem) {
            wchar_t* ptr = static_cast<wchar_t*>(GlobalLock(hMem));
            if (ptr) {
                wcscpy_s(ptr, content.text.length() + 1, content.text.c_str());
                GlobalUnlock(hMem);
                SetClipboardData(CF_UNICODETEXT, hMem);
            }
        }
    }

    // Set RTF content
    if (content.hasRTF) {
        setClipboardData(RegisterClipboardFormat(L"Rich Text Format"), content.rtf);
    }

    // Set bitmap content
    if (content.hasBitmap) {
        setClipboardData(CF_DIB, content.bitmap);
    }

    // Set HTML content
    if (content.hasHTML) {
        std::string htmlStr = wstring_to_utf8(content.html);
        std::vector<uint8_t> htmlData(htmlStr.begin(), htmlStr.end());
        setClipboardData(RegisterClipboardFormat(L"HTML Format"), htmlData);
    }

    CloseClipboard();
    Sleep(100);
}

void ClipboardManager::saveCurrentClipboard() {
    m_savedContent = getClipboardContent();
    Logger::info(L"Cache clipboard");
}

void ClipboardManager::restoreClipboard() {
    Logger::info(L"Restore clipboard"); // + m_savedContent.text
    setClipboardContent(m_savedContent);
}

std::wstring ClipboardManager::copyAndDetectText() {
    // Save the current clipboard content
    bool historyEnabled = clipboard_winrt::isHistoryEnabled();
    saveCurrentClipboard();
    
    // Simulate Ctrl+C
    simulateCtrlC();
    Sleep(100); // Wait for clipboard update
    
    // Get text, if Ctrl+C actually didn't select any text, it will get the old record
    std::wstring capturedText = getClipboardText();
    
    // If clipboard history is enabled, delete the record we just created
    if (historyEnabled && !capturedText.empty()) {
        clipboard_winrt::deleteLatestHistoryItem();  // Delete the record we just created
        clipboard_winrt::deleteLatestHistoryItem();  // Delete the original record, then restore the original content
        // Directly delete the first record, the second record cannot be used directly for pasting, so it needs to be deleted again and then restored
    }
    // Restore the original content
    restoreClipboard();

    return capturedText;
}

void ClipboardManager::simulateCtrlC() {
    Logger::info(L"Simulating Ctrl+C");
    isSimulatingCtrlC = true;
    
    INPUT inputs[4] = {};
    ZeroMemory(inputs, sizeof(inputs));

    // Press Ctrl
    inputs[0].type = INPUT_KEYBOARD;
    inputs[0].ki.wVk = VK_CONTROL;
    inputs[0].ki.wScan = MapVirtualKey(VK_CONTROL, MAPVK_VK_TO_VSC);
    inputs[0].ki.dwFlags = KEYEVENTF_EXTENDEDKEY;
    SendInput(1, inputs, sizeof(INPUT));
    Sleep(30);  // Reduced from 50ms

    // Press C
    inputs[1].type = INPUT_KEYBOARD;
    inputs[1].ki.wVk = 'C';
    inputs[1].ki.wScan = MapVirtualKey('C', MAPVK_VK_TO_VSC);
    inputs[1].ki.dwFlags = 0;
    SendInput(1, &inputs[1], sizeof(INPUT));
    Sleep(30);  // Reduced from 50ms

    // Release C
    inputs[2].type = INPUT_KEYBOARD;
    inputs[2].ki.wVk = 'C';
    inputs[2].ki.wScan = MapVirtualKey('C', MAPVK_VK_TO_VSC);
    inputs[2].ki.dwFlags = KEYEVENTF_KEYUP;
    SendInput(1, &inputs[2], sizeof(INPUT));
    Sleep(50);  // Reduced from 100ms

    // Release Ctrl
    inputs[3].type = INPUT_KEYBOARD;
    inputs[3].ki.wVk = VK_CONTROL;
    inputs[3].ki.wScan = MapVirtualKey(VK_CONTROL, MAPVK_VK_TO_VSC);
    inputs[3].ki.dwFlags = KEYEVENTF_KEYUP | KEYEVENTF_EXTENDEDKEY;
    SendInput(1, &inputs[3], sizeof(INPUT));

    Sleep(100);  // Reduced from 200ms
    isSimulatingCtrlC = false;
}

void ClipboardManager::simulateKeyboardText(const std::wstring& text) {
    // Prepare input array - we need 2 inputs (press and release) per character
    std::vector<INPUT> inputs; // Declare the vector first
    inputs.reserve(text.length() * 2); // Reserve space for inputs

    for (size_t i = 0; i < text.length(); i++) {
        // Key press
        INPUT inputPress = {};
        inputPress.type = INPUT_KEYBOARD;
        inputPress.ki.wVk = 0;  // We'll use Unicode input instead of virtual keys
        inputPress.ki.wScan = text[i];  // Unicode character
        inputPress.ki.dwFlags = KEYEVENTF_UNICODE;
        inputs.push_back(inputPress); // Add key press to the vector

        // Key release
        INPUT inputRelease = {};
        inputRelease.type = INPUT_KEYBOARD;
        inputRelease.ki.wVk = 0;
        inputRelease.ki.wScan = text[i];
        inputRelease.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
        inputs.push_back(inputRelease); // Add key release to the vector
    }

    // Send all inputs at once
    SendInput(static_cast<UINT>(inputs.size()), inputs.data(), sizeof(INPUT));
    Sleep(50);  // Small delay to ensure all keypresses are registered
}

std::wstring ClipboardManager::getClipboardText() {
    std::wstring result;
    if (!OpenClipboard(m_hwnd)) {
        return result;
    }

    // Try Unicode text first
    HANDLE hData = GetClipboardData(CF_UNICODETEXT);
    if (hData) {
        wchar_t* pText = static_cast<wchar_t*>(GlobalLock(hData));
        if (pText) {
            result = pText;
            GlobalUnlock(hData);
        }
    }
    else {
        // Fall back to ANSI text
        hData = GetClipboardData(CF_TEXT);
        if (hData) {
            char* pText = static_cast<char*>(GlobalLock(hData));
            if (pText) {
                // Convert ANSI to Unicode
                int len = MultiByteToWideChar(CP_ACP, 0, pText, -1, NULL, 0);
                if (len > 0) {
                    std::wstring temp(len - 1, 0);
                    MultiByteToWideChar(CP_ACP, 0, pText, -1, &temp[0], len);
                    result = temp;
                }
                GlobalUnlock(hData);
            }
        }
    }

    CloseClipboard();
    return result;
}

bool ClipboardManager::clearClipboardHistory() {
    return clipboard_winrt::clearClipboardHistory();
}

// Factory function implementation
ClipboardManager* CreateClipboardManager() {
    return new ClipboardManager();
} 

namespace clipboard_impl {
    int Initialize() {
        return 0;
    }

    Selection getTextByClipboard() {
        ClipboardManager* g_clipboardManager = new ClipboardManager();
        std::wstring text = g_clipboardManager->copyAndDetectText();
        delete g_clipboardManager;
        return {wstring_to_utf8(text), std::nullopt};
    }
}
