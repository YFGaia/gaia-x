import { http } from 'msw'

const generateRandomChats = () => {
    const count = Math.floor(Math.random() * 5);
    const statuses = ['success', 'local', 'error'];
    
    return Array.from({ length: count }, (_, index) => ({
      message: `Random Message ${Math.random().toString(36).substring(7)}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      id: index + 1
    }));
  }

export const handlers = [
  http.get('/api/conversations', ({ request }) => {
    return Response.json([
      {
        key: '1',
        label: 'Mocked Conversation 1',
      },
      {
        key: '2',
        label: 'Mocked Conversation 2',
      }
    ])
  }),
  http.get('/api/chat/:chatId', ({ params })  => {
    if (params.chatId === "-1") {
      return Response.json([])
    }
    const randomChats = generateRandomChats();
    return Response.json({
      code: 200,
      message: "success",
      data: {
        id: 22,
        title: "Mocked Conversation 2",
        messages: randomChats,
      },
    })
  })
] 