#include <AppKit/AppKit.h>
#include <ApplicationServices/ApplicationServices.h>
#include <Foundation/Foundation.h>

#include "../selection.hpp"
/** copied from https://github.com/lujjjh/node-selection/blob/main/src/selection_mac.mm */
namespace uia_impl {
using selection::RuntimeException;

static NSSet *appsManuallyEnableAx = [[NSSet alloc] initWithArray:@[ @"com.google.Chrome", @"org.mozilla.firefox" ]];

int Initialize() {
  return 0;
}

bool CheckAccessibilityPermissions(bool prompt) {
  NSDictionary *options = @{(__bridge id)kAXTrustedCheckOptionPrompt : @(prompt)};
  return AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)options);
}

std::string ToString(NSString *string) {
  return std::string([string UTF8String], [string lengthOfBytesUsingEncoding:NSUTF8StringEncoding]);
}

pid_t GetFrontProcessID() {
  // TODO: activeApplication is deprecated, should use frontmostApplication instead;
  // however, the latter requires a main event loop to be running, which would block
  // Node's event loop.
  NSDictionary *frontmostApplication = [[NSWorkspace sharedWorkspace] activeApplication];
  if (!frontmostApplication) {
    return 0;
  }
  return [frontmostApplication[@"NSApplicationProcessIdentifier"] intValue];
}

std::optional<std::string> GetProcessName(pid_t pid) {
  NSRunningApplication *application = [NSRunningApplication runningApplicationWithProcessIdentifier:pid];
  if (!application) {
    return std::nullopt;
  }
  NSURL *url = [application executableURL];
  if (!url) {
    return std::nullopt;
  }
  return ToString([url lastPathComponent]);
}

std::optional<std::string> GetBundleIdentifier(pid_t pid) {
  NSRunningApplication *application = [NSRunningApplication runningApplicationWithProcessIdentifier:pid];
  if (!application) {
    return std::nullopt;
  }
  NSString *bundleIdentifier = [application bundleIdentifier];
  if (!bundleIdentifier) {
    return std::nullopt;
  }
  return ToString(bundleIdentifier);
}

void TouchDescendantElements(AXUIElementRef element, int maxDepth) {
  if (!element || maxDepth <= 0) {
    return;
  }
  
  CFArrayRef children = nullptr;
  auto error = AXUIElementCopyAttributeValue(element, kAXChildrenAttribute, (CFTypeRef *)&children);
  if (error != kAXErrorSuccess || !children) {
    return;
  }
  
  for (CFIndex i = 0; i < std::min(CFArrayGetCount(children), (CFIndex)8); i++) {
    TouchDescendantElements((AXUIElementRef)CFArrayGetValueAtIndex(children, i), maxDepth - 1);
  }
  CFRelease(children);
}

AXUIElementRef _GetFocusedElement(pid_t pid) {
  AXUIElementRef application = AXUIElementCreateApplication(pid);
  if (!application) {
    return nullptr;
  }

  auto bundleId = GetBundleIdentifier(pid);
  if (bundleId) {
    NSString *bundleIdentifier = [NSString stringWithUTF8String:bundleId->c_str()];
    if ([appsManuallyEnableAx containsObject:bundleIdentifier]) {
      AXUIElementSetAttributeValue(application, (__bridge CFStringRef)@"AXManualAccessibility", kCFBooleanTrue);
      AXUIElementSetAttributeValue(application, (__bridge CFStringRef)@"AXEnhancedUserInterface", kCFBooleanTrue);
    }
  }

  AXUIElementRef focusedElement = nullptr;
  auto error = AXUIElementCopyAttributeValue(application, kAXFocusedUIElementAttribute, (CFTypeRef *)&focusedElement);
  if (error != kAXErrorSuccess) {
    error = AXUIElementCopyAttributeValue(application, kAXFocusedWindowAttribute, (CFTypeRef *)&focusedElement);
  }
  CFRelease(application);
  
  if (error != kAXErrorSuccess && focusedElement) {
    CFRelease(focusedElement);
    return nullptr;
  }
  
  return focusedElement;
}

AXUIElementRef GetFocusedElement(pid_t pid) {
  AXUIElementRef focusedElement = _GetFocusedElement(pid);
  // Touch all descendant elements to enable accessibility in apps like Word and Excel.
  if (focusedElement) {
    TouchDescendantElements(focusedElement, 8);
    CFRelease(focusedElement);
    focusedElement = _GetFocusedElement(pid);
  }
  return focusedElement;
}

std::string GetSelectionText(pid_t pid) {
  AXUIElementRef focusedElement = GetFocusedElement(pid);
  if (!focusedElement) {
    NSLog(@"No focused element found");
    return "";
  }

  CFTypeRef text = nullptr;
  auto error = AXUIElementCopyAttributeValue(focusedElement, kAXSelectedTextAttribute, &text);
  if (error != kAXErrorSuccess) {
    NSLog(@"Failed to get kAXSelectedTextAttribute, error: %d", error);
    // Handle WebKit-like elements.
    CFTypeRef range = nullptr;
    error = AXUIElementCopyAttributeValue(focusedElement, (__bridge CFStringRef)@"AXSelectedTextMarkerRange", &range);
    if (error == kAXErrorSuccess && range) {
      NSLog(@"Got AXSelectedTextMarkerRange, attempting to get text");
      error = AXUIElementCopyParameterizedAttributeValue(focusedElement, 
        (__bridge CFStringRef)@"AXStringForTextMarkerRange", range, &text);
      if (error != kAXErrorSuccess) {
        NSLog(@"Failed to get AXStringForTextMarkerRange, error: %d", error);
      }
      CFRelease(range);
    } else {
      NSLog(@"Failed to get AXSelectedTextMarkerRange, error: %d", error);
    }
  }
  CFRelease(focusedElement);
  
  if (error != kAXErrorSuccess || !text) {
    return "";  // Return empty string instead of throwing error
  }

  std::string result = ToString((__bridge NSString *)text);
  CFRelease(text);
  return result;
}

Selection getTextByUIA() {
  auto pid = GetFrontProcessID();
  if (!pid) {
    return Selection{
      .text = "",
      .process = ProcessInfo{.pid = 0}
    };
  }

  return Selection{
      .text = GetSelectionText(pid),
      .process = ProcessInfo{.pid = pid, .name = GetProcessName(pid), .bundleIdentifier = GetBundleIdentifier(pid)}};
}

std::optional<WindowInfo> getWindowInformation() {
  NSWindow* keyWindow = [[NSApplication sharedApplication] keyWindow];
  if (!keyWindow) {
    return std::nullopt;
  }

  NSString* title = [keyWindow title];
  if (!title) {
    return std::nullopt;
  }

  // Get window frame in window coordinates
  NSRect frame = [keyWindow frame];
  
  // Convert frame to screen coordinates
  NSRect screenFrame = [[keyWindow screen] frame];
  
  // In macOS, the origin (0,0) starts from bottom-left
  // We need to flip the y-coordinate to match top-left origin convention
  CGFloat flippedY = screenFrame.size.height - (frame.origin.y + frame.size.height);
  
  WindowInfo info;
  info.title = ToString(title);
  info.bounds.x = frame.origin.x;
  info.bounds.y = flippedY;
  info.bounds.width = frame.size.width;
  info.bounds.height = frame.size.height;

  return info;
}

} // namespace uia_impl
