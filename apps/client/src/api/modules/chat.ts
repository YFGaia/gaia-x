import request from "../request";
import { ApiResponse } from "../types";

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
}

export interface Message {
  id: string;
  status: string;
  message: string;
}

export const ChatApi = {
  getChatById: (chatId: string): Promise<ApiResponse<Chat>> =>
    request.get(`/api/chat/${chatId}`),
};
