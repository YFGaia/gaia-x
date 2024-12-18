#pragma once
#include <string>
#include <iostream>

class Logger {
public:
    enum class Level {
        Debug,
        Info,
        Warning,
        Error,
        Success
    };

    static void setLogLevel(Level level) { s_logLevel = level; }
    static Level getLogLevel() { return s_logLevel; }

    static void debug(const std::wstring& message);
    static void info(const std::wstring& message);
    static void warning(const std::wstring& message);
    static void error(const std::wstring& message);
    static void success(const std::wstring& message);

private:
    static void log(Level level, const std::wstring& message);
    static Level s_logLevel;
}; 