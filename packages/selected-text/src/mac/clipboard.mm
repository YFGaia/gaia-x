#include "clipboard.h"
#import <AppKit/AppKit.h>
#import <Carbon/Carbon.h>
#include "../selection.hpp"

// Helper functions for string conversion
NSString* wstring_to_nsstring(const std::wstring& str) {
    return [[NSString alloc] initWithBytes:str.data()
                                  length:str.size() * sizeof(wchar_t)
                                encoding:NSUTF32LittleEndianStringEncoding];
}

std::string wstring_to_utf8(const std::wstring& wstr) {
    NSString* nsstr = wstring_to_nsstring(wstr);
    return std::string([nsstr UTF8String]);
}

std::wstring nsstring_to_wstring(NSString* str) {
    if (!str) return L"";
    NSData* data = [str dataUsingEncoding:NSUTF32LittleEndianStringEncoding];
    if (!data) return L"";
    const wchar_t* chars = reinterpret_cast<const wchar_t*>([data bytes]);
    return std::wstring(chars, [data length] / sizeof(wchar_t));
}

ClipboardManager::ClipboardManager() {
    m_pasteboard = (NSPasteboard*)[NSPasteboard generalPasteboard];
}

ClipboardManager::~ClipboardManager() {
}

std::vector<uint8_t> ClipboardManager::nsDataToVector(NSData* data) {
    if (!data) return std::vector<uint8_t>();
    const uint8_t* bytes = (const uint8_t*)[data bytes];
    return std::vector<uint8_t>(bytes, bytes + [data length]);
}

NSData* ClipboardManager::vectorToNSData(const std::vector<uint8_t>& data) {
    if (data.empty()) return nil;
    return [NSData dataWithBytes:data.data() length:data.size()];
}

std::wstring ClipboardManager::getClipboardText() {
    NSString* string = [m_pasteboard stringForType:NSPasteboardTypeString];
    return nsstring_to_wstring(string);
}

ClipboardContent ClipboardManager::getClipboardContent() {
    ClipboardContent content;
    
    // Get text content
    NSString* string = [m_pasteboard stringForType:NSPasteboardTypeString];
    if (string) {
        content.text = nsstring_to_wstring(string);
        content.hasText = true;
    }
    
    // Get RTF content
    NSData* rtfData = [m_pasteboard dataForType:NSPasteboardTypeRTF];
    if (rtfData) {
        content.rtf = nsDataToVector((NSData*)rtfData);
        content.hasRTF = true;
    }
    
    // Get PDF content
    NSData* pdfData = [m_pasteboard dataForType:NSPasteboardTypePDF];
    if (pdfData) {
        content.pdf = nsDataToVector((NSData*)pdfData);
        content.hasPDF = true;
    }
    
    // Get image content (TIFF format)
    NSData* tiffData = [m_pasteboard dataForType:NSPasteboardTypeTIFF];
    if (tiffData) {
        content.image = nsDataToVector((NSData*)tiffData);
        content.hasImage = true;
    }
    
    // Get HTML content
    NSString* htmlString = [m_pasteboard stringForType:NSPasteboardTypeHTML];
    if (htmlString) {
        content.html = nsstring_to_wstring(htmlString);
        content.hasHTML = true;
    }
    
    return content;
}

void ClipboardManager::saveCurrentClipboard() {
    m_savedContent = getClipboardContent();
}

void ClipboardManager::restoreClipboard() {
    [m_pasteboard clearContents];
    
    // Prepare types array
    NSMutableArray* types = [NSMutableArray array];
    
    // Restore text
    if (m_savedContent.hasText) {
        [types addObject:NSPasteboardTypeString];
        NSString* nsString = wstring_to_nsstring(m_savedContent.text);
        [m_pasteboard setString:nsString forType:NSPasteboardTypeString];
    }
    
    // Restore RTF
    if (m_savedContent.hasRTF) {
        [types addObject:NSPasteboardTypeRTF];
        NSData* rtfData = vectorToNSData(m_savedContent.rtf);
        [m_pasteboard setData:rtfData forType:NSPasteboardTypeRTF];
    }
    
    // Restore PDF
    if (m_savedContent.hasPDF) {
        [types addObject:NSPasteboardTypePDF];
        NSData* pdfData = vectorToNSData(m_savedContent.pdf);
        [m_pasteboard setData:pdfData forType:NSPasteboardTypePDF];
    }
    
    // Restore image
    if (m_savedContent.hasImage) {
        [types addObject:NSPasteboardTypeTIFF];
        NSData* tiffData = vectorToNSData(m_savedContent.image);
        [m_pasteboard setData:tiffData forType:NSPasteboardTypeTIFF];
    }
    
    // Restore HTML
    if (m_savedContent.hasHTML) {
        [types addObject:NSPasteboardTypeHTML];
        NSString* htmlString = wstring_to_nsstring(m_savedContent.html);
        [m_pasteboard setString:htmlString forType:NSPasteboardTypeHTML];
    }
    
    // Declare types
    [m_pasteboard declareTypes:types owner:nil];
}

void ClipboardManager::setClipboardContent(const ClipboardContent& content) {
    [m_pasteboard clearContents];
    
    NSMutableArray* types = [NSMutableArray array];
    
    // Set text
    if (content.hasText) {
        [types addObject:NSPasteboardTypeString];
        NSString* nsString = wstring_to_nsstring(content.text);
        [m_pasteboard setString:nsString forType:NSPasteboardTypeString];
    }
    
    // Set RTF
    if (content.hasRTF) {
        [types addObject:NSPasteboardTypeRTF];
        NSData* rtfData = vectorToNSData(content.rtf);
        [m_pasteboard setData:rtfData forType:NSPasteboardTypeRTF];
    }
    
    // Set PDF
    if (content.hasPDF) {
        [types addObject:NSPasteboardTypePDF];
        NSData* pdfData = vectorToNSData(content.pdf);
        [m_pasteboard setData:pdfData forType:NSPasteboardTypePDF];
    }
    
    // Set image
    if (content.hasImage) {
        [types addObject:NSPasteboardTypeTIFF];
        NSData* tiffData = vectorToNSData(content.image);
        [m_pasteboard setData:tiffData forType:NSPasteboardTypeTIFF];
    }
    
    // Set HTML
    if (content.hasHTML) {
        [types addObject:NSPasteboardTypeHTML];
        NSString* htmlString = wstring_to_nsstring(content.html);
        [m_pasteboard setString:htmlString forType:NSPasteboardTypeHTML];
    }
    
    // Declare types
    [m_pasteboard declareTypes:types owner:nil];
}

void ClipboardManager::simulateCommandC() {
    CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
    
    // Command down
    CGEventRef cmdDown = CGEventCreateKeyboardEvent(source, kVK_Command, true);
    CGEventPost(kCGHIDEventTap, cmdDown);
    CFRelease(cmdDown);
    
    // 'C' key down
    CGEventRef cDown = CGEventCreateKeyboardEvent(source, kVK_ANSI_C, true);
    CGEventSetFlags(cDown, kCGEventFlagMaskCommand);
    CGEventPost(kCGHIDEventTap, cDown);
    CFRelease(cDown);
    
    // 'C' key up
    CGEventRef cUp = CGEventCreateKeyboardEvent(source, kVK_ANSI_C, false);
    CGEventSetFlags(cUp, kCGEventFlagMaskCommand);
    CGEventPost(kCGHIDEventTap, cUp);
    CFRelease(cUp);
    
    // Command up
    CGEventRef cmdUp = CGEventCreateKeyboardEvent(source, kVK_Command, false);
    CGEventPost(kCGHIDEventTap, cmdUp);
    CFRelease(cmdUp);
    
    CFRelease(source);
    
    // Wait a bit for the clipboard to update
    usleep(50000); // 50ms
}

void ClipboardManager::simulateKeyboardText(const std::wstring& text) {
    NSString* nsString = wstring_to_nsstring(text);
    
    // Write to pasteboard
    [m_pasteboard clearContents];
    [m_pasteboard writeObjects:@[nsString]];
}

std::wstring ClipboardManager::copyAndDetectText() {
    // Save current clipboard content
    saveCurrentClipboard();
    
    // Simulate Command+C
    simulateCommandC();
    
    // Get the text
    std::wstring text = getClipboardText();
    
    // Restore original clipboard content
    restoreClipboard();
    
    return text;
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
} // namespace clipboard_impl