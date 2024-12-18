{
  "variables": {
    "openssl_fips": "0"
  },
  "targets": [
    {
      "target_name": "selection",
      "sources": [
        "src/selection.cpp",
        "src/logger.cpp"
      ],
      "cflags!": [
        "-fno-exceptions"
      ],
      "cflags_cc!": [
        "-fno-exceptions"
      ],
      "cflags_cc": [
        "-std=c++17"
      ],
      "conditions": [
        [
          "OS==\"mac\"",
          {
            "sources": [
              "src/mac/clipboard.mm",
              "src/mac/uiautomation.mm"
            ],
            "xcode_settings": {
              "MACOSX_DEPLOYMENT_TARGET": "10.9",
              "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
              "CLANG_ENABLE_OBJC_ARC": "YES",
              "OTHER_CPLUSPLUSFLAGS": [
                "-std=c++17",
                "-x objective-c++"
              ],
              "OTHER_CFLAGS": [
                "-arch x86_64",
                "-arch arm64"
              ],
              "OTHER_LDFLAGS": [
                "-arch x86_64",
                "-arch arm64"
              ]
            },
            "link_settings": {
              "libraries": [
                "-framework AppKit",
                "-framework ApplicationServices",
                "-framework Foundation"
              ]
            }
          }
        ],
        [
          "OS==\"win\"",
          {
            "sources": [
              "src/win/clipboard.cpp",
              "src/win/uiautomation.cpp"
            ],
            "msvs_settings": {
              "VCCLCompilerTool": {
                "ExceptionHandling": 1,
                "AdditionalOptions": [
                  "-std:c++17"
                ]
              }
            },
            "defines": [
              "_HAS_EXCEPTIONS=1",
              "UNICODE",
              "_UNICODE"
            ],
            "libraries": [
              "Ole32.lib",
              "OleAut32.lib",
              "User32.lib",
              "UIAutomationCore.lib",
              "Oleacc.lib"
            ]
          }
        ]
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "<!(node -p \"require('node-addon-api').include_dir\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ]
    }
  ]
}