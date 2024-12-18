#define NAPI_VERSION 3
/* copied from https://github.com/lujjjh/node-selection/blob/main/src/selection.cpp */
#include <napi.h>

#include "selection.hpp"

namespace selection {
using Napi::AsyncWorker;
using Napi::Boolean;
using Napi::Error;
using Napi::Function;
using Napi::HandleScope;
using Napi::Promise;
using Napi::String;
using Napi::TypeError;

class CheckAccessibilityPermissionsAsyncWorker : public AsyncWorker {
  bool prompt;
  bool result;
  Promise::Deferred deferred;

public:
  CheckAccessibilityPermissionsAsyncWorker(const Napi::CallbackInfo &info, bool prompt)
      : AsyncWorker(info.Env()), prompt(prompt), deferred(Promise::Deferred::New(info.Env())) {}

  Promise GetPromise() { return deferred.Promise(); }

  void Execute() override {
    try {
      result = uia_impl::CheckAccessibilityPermissions(prompt);
    } catch (const RuntimeException &e) {
      SetError(e.what());
    }
  }

  void OnOK() override { deferred.Resolve(Boolean::New(Env(), result)); }

  void OnError(const Error &e) override { deferred.Reject(e.Value()); }
};

class GetUIATextAsyncWorker : public AsyncWorker {
  Selection result;
  Promise::Deferred deferred;

public:
  GetUIATextAsyncWorker(const Napi::CallbackInfo &info)
      : AsyncWorker(info.Env()), deferred(Promise::Deferred::New(info.Env())) {}

  Promise GetPromise() { return deferred.Promise(); }

  void Execute() override {
    try {
      result = uia_impl::getTextByUIA();
    } catch (const RuntimeException &e) {
      SetError(e.what());
    }
  }

  void OnOK() override {
    Napi::Object selection = Napi::Object::New(Env());
    selection.Set("text", String::New(Env(), result.text));
    if (result.process) {
      auto process = Napi::Object::New(Env());
      process.Set("pid", Napi::Number::New(Env(), result.process->pid));
      if (result.process->name.has_value()) {
        process.Set("name", String::New(Env(), *result.process->name));
      }
      if (result.process->bundleIdentifier.has_value()) {
        process.Set("bundleIdentifier", String::New(Env(), *result.process->bundleIdentifier));
      }
      selection.Set("process", process);
    } else {
      selection.Set("process", Env().Null());
    }
    deferred.Resolve(selection);
  }

  void OnError(const Error &e) override { deferred.Reject(e.Value()); }
};

class GetClipboardTextAsyncWorker : public AsyncWorker {
  Selection result;
  Promise::Deferred deferred;

public:
  GetClipboardTextAsyncWorker(const Napi::CallbackInfo &info)
      : AsyncWorker(info.Env()), deferred(Promise::Deferred::New(info.Env())) {}

  Promise GetPromise() { return deferred.Promise(); }

  void Execute() override {
    try {
      result = clipboard_impl::getTextByClipboard();
    } catch (const RuntimeException &e) {
      SetError(e.what());
    }
  }

  void OnOK() override {
    Napi::Object selection = Napi::Object::New(Env());
    selection.Set("text", String::New(Env(), result.text));
    deferred.Resolve(selection);
  }

  void OnError(const Error &e) override { deferred.Reject(e.Value()); }
};

class GetWindowInformationAsyncWorker : public AsyncWorker {
  std::optional<WindowInfo> result;
  Promise::Deferred deferred;

public:
  GetWindowInformationAsyncWorker(const Napi::CallbackInfo &info)
      : AsyncWorker(info.Env()), deferred(Promise::Deferred::New(info.Env())) {}

  Promise GetPromise() { return deferred.Promise(); }

  void Execute() override {
    result = uia_impl::getWindowInformation();
  }

  void OnOK() override {
    if (!result) {
      deferred.Resolve(Env().Null());
      return;
    }

    Napi::Object window = Napi::Object::New(Env());
    window.Set("title", String::New(Env(), result->title));
    
    Napi::Object bounds = Napi::Object::New(Env());
    bounds.Set("x", Napi::Number::New(Env(), result->bounds.x));
    bounds.Set("y", Napi::Number::New(Env(), result->bounds.y));
    bounds.Set("width", Napi::Number::New(Env(), result->bounds.width));
    bounds.Set("height", Napi::Number::New(Env(), result->bounds.height));
    window.Set("bounds", bounds);

    deferred.Resolve(window);
  }

  void OnError(const Error &e) override { deferred.Reject(e.Value()); }
};

Napi::Value CheckAccessibilityPermissions(const Napi::CallbackInfo &info) {
  auto env = info.Env();

  if (info.Length() != 1) {
    TypeError::New(env, "expected 1 arguments").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!info[0].IsBoolean()) {
    TypeError::New(env, "prompt must be a boolean").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  auto prompt = info[0].As<Boolean>().Value();

  auto worker = new CheckAccessibilityPermissionsAsyncWorker(info, prompt);
  worker->Queue();
  return worker->GetPromise();
}

Napi::Value GetUIAText(const Napi::CallbackInfo &info) {
  auto worker = new GetUIATextAsyncWorker(info);
  worker->Queue();
  return worker->GetPromise();
}

Napi::Value GetClipboardText(const Napi::CallbackInfo &info) {
  auto worker = new GetClipboardTextAsyncWorker(info);
  worker->Queue();
  return worker->GetPromise();
}

Napi::Value GetActiveWindow(const Napi::CallbackInfo &info) {
  auto worker = new GetWindowInformationAsyncWorker(info);
  worker->Queue();
  return worker->GetPromise();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  uia_impl::Initialize();
  clipboard_impl::Initialize();
  exports.Set(String::New(env, "checkAccessibilityPermissions"),Napi::Function::New(env, CheckAccessibilityPermissions));
  exports.Set(String::New(env, "getTextByUIA"), Napi::Function::New(env, GetUIAText));
  exports.Set(String::New(env, "getTextByClipboard"), Napi::Function::New(env, GetClipboardText));
  exports.Set(String::New(env, "activeWindow"), Napi::Function::New(env, GetActiveWindow));
  return exports;
}

NODE_API_MODULE(selection, Init)

} // namespace selection
