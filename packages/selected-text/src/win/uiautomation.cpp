#include <UIAutomation.h>
#include <atlbase.h>
#include <comutil.h>
#include <psapi.h>
#include <vector>
#include <windows.h>
#pragma comment(lib, "comsuppw.lib")
#pragma comment(lib, "psapi.lib")

#include "../selection.hpp"
#include "../logger.h"

/** copied from https://github.com/lujjjh/node-selection/blob/main/src/selection_win.cpp */
namespace uia_impl {
using selection::RuntimeException;

int Initialize() {
  // Use a more complete COM initialization
  HRESULT hr = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE);
  if (FAILED(hr) && hr != RPC_E_CHANGED_MODE) { // Ignore already initialized cases
    // If the first attempt fails, try other modes
    hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED | COINIT_DISABLE_OLE1DDE);
    if (FAILED(hr) && hr != RPC_E_CHANGED_MODE) {
      throw RuntimeException("Failed to initialize COM");
    }
  }

  // Ensure UI Automation permissions are enabled
  if (!CheckAccessibilityPermissions(true)) {
    throw RuntimeException("Failed to enable UI Automation accessibility");
  }
  return 0;
}

bool CheckAccessibilityPermissions(bool prompt) {
  // Check accessibility permissions
  BOOL isProcessElevated = FALSE;
  HANDLE hToken = nullptr;

  if (OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &hToken)) {
    TOKEN_ELEVATION elevation;
    DWORD size = sizeof(TOKEN_ELEVATION);
    if (GetTokenInformation(hToken, TokenElevation, &elevation, sizeof(elevation), &size)) {
      isProcessElevated = elevation.TokenIsElevated;
    }
    CloseHandle(hToken);
  }

  // Check UI Automation permissions
  BOOL accessEnabled = FALSE;
  if (SystemParametersInfo(SPI_GETSCREENREADER, 0, &accessEnabled, 0)) {
    if (!accessEnabled) {
      // Try to enable UI Automation
      if (SystemParametersInfo(SPI_SETSCREENREADER, TRUE, NULL, 0)) {
        // Verify again if it was successfully enabled
        SystemParametersInfo(SPI_GETSCREENREADER, 0, &accessEnabled, 0);
      }
    }
  }

  // Check if the UIA COM server is running
  CComPtr<IUIAutomation> testAutomation;
  HRESULT hr = CoCreateInstance(
    CLSID_CUIAutomation, nullptr, CLSCTX_INPROC_SERVER | CLSCTX_LOCAL_SERVER,
    IID_IUIAutomation, reinterpret_cast<void **>(&testAutomation)
  );

  if (FAILED(hr) || !testAutomation) {
    if (prompt && !isProcessElevated) {
      // You can add code here to prompt the user to elevate permissions
      return false;
    }
  }

  return accessEnabled || testAutomation != nullptr;
}

std::string BSTRtoUTF8(BSTR bstr) {
  int len = SysStringLen(bstr);
  if (len == 0)
    return "";
  int size_needed = WideCharToMultiByte(CP_UTF8, 0, bstr, len, NULL, 0, NULL, NULL);
  std::string ret(size_needed, '\0');
  WideCharToMultiByte(CP_UTF8, 0, bstr, len, &ret.front(), ret.size(), NULL, NULL);
  return ret;
}

std::string PTCHARtoUTF8(TCHAR *ptchar) {
#ifndef UNICODE
  return std::string(ptchar);
#else
  int size_needed = WideCharToMultiByte(CP_UTF8, 0, ptchar, -1, NULL, 0, NULL, NULL);
  if (size_needed <= 0) {
    return "";
  }
  std::vector<char> buffer(size_needed);
  WideCharToMultiByte(CP_UTF8, 0, ptchar, -1, buffer.data(), buffer.size(), NULL, NULL);
  return std::string(buffer.data());
#endif
}

void _OutputElementName(IUIAutomationElement *element) {
  CComBSTR name;
  if (element->get_CurrentName(&name) == S_OK) {
    auto s = BSTRtoUTF8(name);
    printf("name: %s\n", s.data());
  }
}

CComPtr<IUIAutomation> CreateUIAutomation() {
  CComPtr<IUIAutomation> automation;

  // Ensure COM is initialized correctly
  HRESULT hrCo = CoInitialize(nullptr);
  if (FAILED(hrCo) && hrCo != RPC_E_CHANGED_MODE) {
    throw RuntimeException("COM initialization failed");
  }

  // Retry mechanism
  for (int attempts = 0; attempts < 3; attempts++) {
    HRESULT hr = CoCreateInstance(
        CLSID_CUIAutomation, nullptr,
        CLSCTX_INPROC_SERVER | CLSCTX_LOCAL_SERVER, // Add LOCAL_SERVER support
        IID_IUIAutomation, 
        reinterpret_cast<void **>(&automation)
    );

    if (SUCCEEDED(hr) && automation) {
      return automation;
    }

    // Detailed error information
    if (FAILED(hr)) {
      wchar_t errorMsg[512];
      swprintf_s(errorMsg, L"UIAutomation creation failed (attempt %d) with HRESULT: 0x%08X", attempts + 1, hr);
      Logger::error(errorMsg);
    }

    Sleep(500); // Increase the retry interval time
  }

  throw RuntimeException("Failed to create UIAutomation after multiple attempts");
}

Selection getTextByUIA() {
  static CComPtr<IUIAutomation> automation = CreateUIAutomation();
  if (!automation) {
    throw RuntimeException("failed to create UIAutomation");
  }

  // Retry to get the focused element
  const int MAX_RETRIES = 3;
  CComPtr<IUIAutomationElement> focusedElement;

  for (int retry = 0; retry < MAX_RETRIES; retry++) {
    HRESULT hr = automation->GetFocusedElement(&focusedElement);
    if (SUCCEEDED(hr) && focusedElement) {
      break;
    }
    Sleep(100); // Short wait and retry
  }

  if (!focusedElement) {
    throw RuntimeException("no focused element after retries");
  }

  CComPtr<IUIAutomationTreeWalker> treeWalker;
  if (automation->get_RawViewWalker(&treeWalker) != S_OK || !treeWalker) {
    throw RuntimeException("failed to get tree walker");
  }

  // Traverse the element tree to find the text pattern
  for (; focusedElement;) {
    CComPtr<IUIAutomationTextPattern> textPattern;
    HRESULT hr = focusedElement->GetCurrentPatternAs(
        UIA_TextPatternId, IID_IUIAutomationTextPattern,
        reinterpret_cast<void **>(&textPattern)
    );

    // If getting the text pattern fails, try to get it from the child text pattern
    if (FAILED(hr) || !textPattern) {
      CComPtr<IUIAutomationTextChildPattern> textChildPattern;
      hr = focusedElement->GetCurrentPatternAs(
        UIA_TextChildPatternId, IID_IUIAutomationTextChildPattern,
        reinterpret_cast<void **>(&textChildPattern)
      );

      if (SUCCEEDED(hr) && textChildPattern) {
        CComPtr<IUIAutomationElement> containerElement;
        if (SUCCEEDED(textChildPattern->get_TextContainer(&containerElement)) && containerElement) {
          hr = containerElement->GetCurrentPatternAs(
            UIA_TextPatternId, IID_IUIAutomationTextPattern,
            reinterpret_cast<void **>(&textPattern)
          );
        }
      }
    }

    // If getting the text pattern succeeds, try to get the selected text
    if (SUCCEEDED(hr) && textPattern) {
      std::optional<ProcessInfo> process;
      {
        pid_t pid;
        if (focusedElement->get_CurrentProcessId(&pid) == S_OK) {
          process = ProcessInfo{pid};
          auto hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, pid);
          if (hProcess) {
            TCHAR buffer[MAX_PATH];
            if (GetModuleFileNameEx(hProcess, NULL, buffer, MAX_PATH)) {
              PathStripPath(buffer);
              auto name = PTCHARtoUTF8(buffer);
              process->name = name;
            //   Logger::info(L"Process name: " + std::wstring(buffer));
            }
            CloseHandle(hProcess);
          }
        }
      }

      // Retry to get the selected text
      for (int textRetry = 0; textRetry < MAX_RETRIES; textRetry++) {
        CComPtr<IUIAutomationTextRangeArray> textRanges;
        if (SUCCEEDED(textPattern->GetSelection(&textRanges)) && textRanges) {
          int length;
          if (SUCCEEDED(textRanges->get_Length(&length)) && length > 0) {
            CComPtr<IUIAutomationTextRange> textRange;
            if (SUCCEEDED(textRanges->GetElement(0, &textRange))) {
              CComBSTR fullText;
              if (SUCCEEDED(textRange->GetText(-1, &fullText)) && fullText) {
                return {BSTRtoUTF8(fullText), process};
              }
            }
          }
        }
        Sleep(100); // Short wait and retry
      }
    }

    // Get the parent element, if it fails, exit the loop
    CComPtr<IUIAutomationElement> parentElement;
    if (FAILED(treeWalker->GetParentElement(focusedElement, &parentElement))) {
      break;
    }
    focusedElement = parentElement;
  }

  throw RuntimeException("no valid selection");
}

std::optional<WindowInfo> getWindowInformation() {
  HWND hwnd = GetForegroundWindow();
  if (!hwnd) {
    return std::nullopt;
  }

  // Get window title
  int titleLength = GetWindowTextLengthW(hwnd);
  if (titleLength == 0) {
    return std::nullopt;
  }

  std::vector<wchar_t> titleBuffer(titleLength + 1);
  if (GetWindowTextW(hwnd, titleBuffer.data(), titleLength + 1) == 0) {
    return std::nullopt;
  }

  // Get window bounds
  RECT rect;
  if (!GetWindowRect(hwnd, &rect)) {
    return std::nullopt;
  }

  WindowInfo info;
  info.title = BSTRtoUTF8(SysAllocString(titleBuffer.data()));
  info.bounds.x = rect.left;
  info.bounds.y = rect.top;
  info.bounds.width = rect.right - rect.left;
  info.bounds.height = rect.bottom - rect.top;

  return info;
}

} // namespace uia_impl
