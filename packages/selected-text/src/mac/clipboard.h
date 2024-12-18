#pragma once
#include <string>
#include <vector>
#include <map>

// Forward declarations for Objective-C classes
#ifdef __OBJC__
@class NSPasteboard;
@class NSString;
@class NSData;
#else
typedef void* NSPasteboard;
typedef void* NSString;
typedef void* NSData;
#endif

// Structure to hold clipboard content of various types
struct ClipboardContent {
    std::wstring text;        // Plain text content
    std::vector<uint8_t> rtf; // RTF data
    std::vector<uint8_t> pdf; // PDF data
    std::vector<uint8_t> image; // Image data (TIFF format on macOS)
    std::wstring html;        // HTML content
    bool hasText = false;
    bool hasRTF = false;
    bool hasPDF = false;
    bool hasImage = false;
    bool hasHTML = false;
};

class ClipboardManager {
public:
    ClipboardManager();
    virtual ~ClipboardManager();

    // Gets text from clipboard
    std::wstring getClipboardText();

    // Gets all available content from clipboard
    ClipboardContent getClipboardContent();

    // Saves current clipboard content (all formats)
    void saveCurrentClipboard();
   
    // Restores previously saved clipboard content
    void restoreClipboard();

    // Simulates keyboard text input
    void simulateKeyboardText(const std::wstring& text);

    // Copy and detect clipboard content
    std::wstring copyAndDetectText();

    // Set clipboard content with multiple formats
    void setClipboardContent(const ClipboardContent& content);

private:
    NSPasteboard* m_pasteboard;
    ClipboardContent m_savedContent;
    
    // Simulates Command+C key press
    void simulateCommandC();

    // Helper methods for data conversion
    std::vector<uint8_t> nsDataToVector(NSData* data);
    NSData* vectorToNSData(const std::vector<uint8_t>& data);
};
