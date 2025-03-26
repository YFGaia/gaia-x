/*
 * Copyright 2024 CloudWeGo Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package einox

import (
	"fmt"
	"strings"

	"github.com/cloudwego/eino/schema"
)

// convertChatRequestToSchemaMessages 将ChatRequest中的消息转换为schema.Message格式
func convertChatRequestToSchemaMessages(req ChatRequest) []*schema.Message {
	schemaMessages := make([]*schema.Message, len(req.Messages))
	for i, msg := range req.Messages {
		// 创建基本消息结构
		schemaMsg := &schema.Message{
			Role:       schema.RoleType(msg.Role),
			Name:       msg.Name,
			ToolCallID: msg.ToolCallID,
		}

		// 处理内容 - 根据是否有多模态内容决定使用Content还是MultiContent
		if len(msg.MultiContent) > 0 {
			// 处理多模态内容
			multiContent := make([]schema.ChatMessagePart, len(msg.MultiContent))
			for j, part := range msg.MultiContent {
				chatPart := schema.ChatMessagePart{
					Type: schema.ChatMessagePartType(part.Type),
					Text: part.Text,
				}

				// 处理不同类型的媒体URL
				switch chatPart.Type {
				case schema.ChatMessagePartTypeImageURL:
					// 处理图片URL
					if part.ImageURL != nil {
						// 判断是否为URL格式，如果是则转换为BASE64
						if isURL(part.ImageURL.URL) {
							// 转换图片URL为BASE64
							base64Data, mimeType, err := convertImageURLToBase64(part.ImageURL.URL)
							if err != nil {
								// 记录错误但继续使用原URL
								fmt.Printf("转换图片URL到BASE64失败: %v\n", err)
							} else {
								// 使用转换后的BASE64数据
								part.ImageURL.URL = base64Data
								chatPart.ImageURL = &schema.ChatMessageImageURL{
									URL:      base64Data,
									Detail:   schema.ImageURLDetail(part.ImageURL.Detail),
									MIMEType: mimeType,
								}
							}
						} else {
							// 默认处理方式，可能已经是BASE64数据
							chatPart.ImageURL = &schema.ChatMessageImageURL{
								URL:      part.ImageURL.URL,
								Detail:   schema.ImageURLDetail(part.ImageURL.Detail),
								MIMEType: detectMIMEType(part.ImageURL.URL),
							}
						}
					}
				case schema.ChatMessagePartTypeAudioURL:
					// 处理音频URL (如果API支持)
					// 注意：目前go-openai未定义AudioURL等字段
					// 未来API支持后需要更新此处实现
					if part.ImageURL != nil { // 临时使用ImageURL字段
						chatPart.AudioURL = &schema.ChatMessageAudioURL{
							URL:      part.ImageURL.URL,
							MIMEType: "audio/mp3", // 默认MIME类型
						}
					}
				case schema.ChatMessagePartTypeVideoURL:
					// 处理视频URL (如果API支持)
					if part.ImageURL != nil { // 临时使用ImageURL字段
						chatPart.VideoURL = &schema.ChatMessageVideoURL{
							URL:      part.ImageURL.URL,
							MIMEType: "video/mp4", // 默认MIME类型
						}
					}
				case schema.ChatMessagePartTypeFileURL:
					// 处理文件URL (如果API支持)
					if part.ImageURL != nil { // 临时使用ImageURL字段
						chatPart.FileURL = &schema.ChatMessageFileURL{
							URL:      part.ImageURL.URL,
							MIMEType: "application/pdf", // 默认MIME类型
							//TODO 待完善
							Name: "file.pdf", // 默认文件名
						}
					}
				}

				multiContent[j] = chatPart
			}
			schemaMsg.MultiContent = multiContent
		} else {
			// 使用普通文本内容
			schemaMsg.Content = msg.Content
		}

		// 如果存在额外数据，添加到Extra字段 TODO 待完善
		if req.Extra != nil && len(req.Extra) > 0 {
			schemaMsg.Extra = req.Extra
		}

		// 保存转换后的消息
		schemaMessages[i] = schemaMsg
	}

	return schemaMessages
}

// detectMIMEType 根据URL或数据检测MIME类型
func detectMIMEType(urlOrData string) string {
	// 简单检测MIME类型
	if strings.HasPrefix(urlOrData, "data:image/png;") {
		return "image/png"
	} else if strings.HasPrefix(urlOrData, "data:image/jpeg;") {
		return "image/jpeg"
	} else if strings.HasPrefix(urlOrData, "data:image/gif;") {
		return "image/gif"
	} else if strings.HasPrefix(urlOrData, "data:image/webp;") {
		return "image/webp"
	} else if strings.HasPrefix(urlOrData, "data:image/") {
		return "image/png" // 默认图片类型
	} else if strings.HasSuffix(urlOrData, ".png") {
		return "image/png"
	} else if strings.HasSuffix(urlOrData, ".jpg") || strings.HasSuffix(urlOrData, ".jpeg") {
		return "image/jpeg"
	} else if strings.HasSuffix(urlOrData, ".gif") {
		return "image/gif"
	} else if strings.HasSuffix(urlOrData, ".webp") {
		return "image/webp"
	}

	return "image/jpeg" // 默认MIME类型
}
