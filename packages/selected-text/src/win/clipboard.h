#pragma once
#include <string>
#include <windows.h>
#include <vector>

namespace clipboard_winrt {
    // Clear clipboard history
    bool clearClipboardHistory();
    
    // Delete the latest clipboard item
    bool deleteLatestHistoryItem();

    // Check if clipboard history is enabled, the logic is to get a record from the clipboard, if there is no record, it is considered not enabled
    bool isHistoryEnabled();
} 

// Structure to hold clipboard content of various types
struct ClipboardContent {
    std::wstring text;        // Plain text content
    std::vector<uint8_t> rtf; // RTF data
    std::vector<uint8_t> bitmap; // Bitmap data
    std::wstring html;        // HTML content
    bool hasText = false;
    bool hasRTF = false;
    bool hasBitmap = false;
    bool hasHTML = false;
};

class ClipboardManager {
public:
    static bool isSimulatingCtrlC; // Flag to indicate if we are simulating Ctrl+C
   
    ClipboardManager();
    virtual ~ClipboardManager();

    // Simulates Ctrl+C key press
    // Try to get selected text by simulating Ctrl+C
    void simulateCtrlC();
   
    // Gets text from clipboard (supports both Unicode and ANSI)
    std::wstring getClipboardText();

    // Gets all available content from clipboard
    ClipboardContent getClipboardContent();

    // Saves current clipboard content
    void saveCurrentClipboard();
   
    // Restores previously saved clipboard content
    void restoreClipboard();

    void simulateKeyboardText(const std::wstring& text);

    // Copy and detect clipboard content
    std::wstring copyAndDetectText();

    // Clear clipboard history
    bool clearClipboardHistory();

    // Check if clipboard history is enabled
    bool isClipboardHistoryEnabled();

    // Set clipboard content with multiple formats
    void setClipboardContent(const ClipboardContent& content);

protected:
    ClipboardContent m_savedContent;
    HWND m_hwnd;

private:
    // Helper methods for data conversion
    std::vector<uint8_t> getClipboardData(UINT format);
    void setClipboardData(UINT format, const std::vector<uint8_t>& data);
    void setClipboardText(const std::wstring& text);
}; 