#include "logger.h"

// Initialize static member
Logger::Level Logger::s_logLevel = Logger::Level::Info;

void Logger::log(Level level, const std::wstring& message) {
    if (level < s_logLevel) return;

    const wchar_t* prefix = L"";
    switch (level) {
        case Level::Debug:   prefix = L"[Debug] "; break;
        case Level::Info:    prefix = L"[Info] "; break;
        case Level::Warning: prefix = L"[Warning] "; break;
        case Level::Error:   prefix = L"[Error] "; break;
        case Level::Success: prefix = L"[Success] "; break;
    }

    std::wcout << prefix << message << std::endl;
}

void Logger::debug(const std::wstring& message) {
    log(Level::Debug, message);
}

void Logger::info(const std::wstring& message) {
    log(Level::Info, message);
}

void Logger::warning(const std::wstring& message) {
    log(Level::Warning, message);
}

void Logger::error(const std::wstring& message) {
    log(Level::Error, message);
}

void Logger::success(const std::wstring& message) {
    log(Level::Success, message);
} 