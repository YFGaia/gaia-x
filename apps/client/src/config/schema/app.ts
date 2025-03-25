export const appConfigSchema = {
    "app": {
        "title": "系统设置",
        "properties": {
            "app.theme": {
                "type": "string",
                "inputType": "radio",   
                "default": "light",
                "title": "主题",
                "description": "选择应用程序的主题",
                "enum": [
                    // {
                    //     "label": "跟随系统",
                    //     "value": "system"
                    // },
                    {
                        "label": "浅色主题",
                        "value": "light"
                    },
                    {
                        "label": "深色主题",
                        "value": "dark"
                    }
                ],
                "order": 1
            },
            // "app.autoUpdate": {
            //     "type": "boolean",
            //     "inputType": "switch",
            //     "default": true,
            //     "title": "自动更新",
            //     "order": 2
            // },
            "app.language": {
                "type": "string",
                "inputType": "radio",
                "default": "zh-CN",
                "title": "语言",
                "enum": [
                    {
                        "label": "简体中文",
                        "value": "zh-CN"
                    }
                ],
                "order": 3
            },
            "app.toolbarEnabled": {
                "type": "boolean",
                "inputType": "switch",
                "default": true,
                "title": "是否启用划词",
                "description": "手动关闭划词工具条",
                "order": 4
            },
            "app.toolbarTranslucent": {
                "type": "boolean",
                "inputType": "switch",
                "default": false,
                "title": "工具栏半透明",
                "description": "鼠标进入工具条区域之前，工具条保持半透明",
                "order": 5
            },
            "app.closeMode": {
                "type": "string",
                "inputType": "radio",   
                "default": "mini",
                "title": "关闭模式",
                "description": "选择应用程序的关闭模式",
                "enum": [
                    {
                        "label": "最小化",
                        "value": "mini"
                    },
                    {
                        "label": "关闭",
                        "value": "close"
                    }
                ],
                "order": 6
            },
        }
    }
}