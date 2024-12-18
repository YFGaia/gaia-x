{
  "targets": [
    {
      "target_name": "key-mouse-listener",
      "sources": [
        "src/index.cc",
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "conditions": [
        [
          "OS=='win'", {
            "sources": [
              "src/win/mouse.cc",
              "src/win/keyboard.cc"
            ],
            "msvs_settings": {
              "VCCLCompilerTool": {
                "ExceptionHandling": 1
              }
            }
          }
        ],
        [
          "OS=='mac'", {
            "sources": [
              "src/mac/mouse.cc",
              "src/mac/keyboard.cc"
            ],
            "xcode_settings": {
              "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
              "CLANG_ENABLE_OBJC_ARC": "YES",
              "MACOSX_DEPLOYMENT_TARGET": "10.13",
              "OTHER_CFLAGS": [
                "-std=c++17",
                "-ObjC++"
              ]
            },
            "link_settings": {
              "libraries": [
                "CoreGraphics.framework",
                "Carbon.framework",
                "Foundation.framework",
                "AppKit.framework"
              ]
            }
          }
        ]
      ]
    }
  ]
}