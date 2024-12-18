#ifndef SELECTION_H
#define SELECTION_H
/** copied from https://github.com/lujjjh/node-selection/blob/main/src/selection.hpp */
#include <optional>
#include <string>
#include <tuple>

#ifdef _WIN32
#define pid_t int
#endif

namespace selection {
class RuntimeException : public std::exception {
  const std::string msg;

public:
  RuntimeException(const std::string &msg) : msg(msg) {}

  virtual const char *what() const throw() { return msg.c_str(); }
};
} // namespace selection

struct ProcessInfo {
  pid_t pid;
  std::optional<std::string> name;
  std::optional<std::string> bundleIdentifier; // macOS only
};

struct Selection {
  std::string text;
  std::optional<ProcessInfo> process;
};

struct WindowInfo {
  std::string title;
  struct {
    int x;
    int y;
    int width;
    int height;
  } bounds;
};

// some headers from uia may conflict with normal headers, so we split the two implemention in two libries
namespace uia_impl {
int Initialize();
bool CheckAccessibilityPermissions(bool prompt);
Selection getTextByUIA();
std::optional<WindowInfo> getWindowInformation();
} // namespace uia_impl

namespace clipboard_impl {  
int Initialize();
Selection getTextByClipboard();
} // namespace clipboard_impl

#define NAPI_BOOL(name, val)                                                                                           \
  bool name;                                                                                                           \
  if (napi_get_value_bool(env, val, &name) != napi_ok) {                                                               \
    napi_throw_error(env, "EINVAL", "Expected boolean");                                                               \
    return NULL;                                                                                                       \
  }

#define NAPI_ARGV_BOOL(name, i) NAPI_BOOL(name, argv[i])

#endif
