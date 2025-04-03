import { Message } from '../types/chat';

export const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Hi! I need a quote for this product.',
    type: 'text',
    sender: 'user',
    timestamp: new Date('2024-03-15T10:00:00'),
    status: 'read',
    statusTimeline: {
      sent: new Date('2024-03-15T10:00:00'),
      delivered: new Date('2024-03-15T10:00:05'),
      read: new Date('2024-03-15T10:00:10')
    }
  },
  {
    id: '2',
    content: 'Of course! I can help you with that. Could you please share the product link?',
    type: 'text',
    sender: 'team',
    timestamp: new Date('2024-03-15T10:01:00')
  },
  {
    id: '3',
    type: 'link',
    content: 'https://www.aliexpress.com/item/123456789.html',
    sender: 'user',
    timestamp: new Date('2024-03-15T10:02:00'),
    status: 'read',
    statusTimeline: {
      sent: new Date('2024-03-15T10:02:00'),
      delivered: new Date('2024-03-15T10:02:05'),
      read: new Date('2024-03-15T10:02:10')
    },
    title: 'Wireless Earbuds Pro Max',
    description: 'True Wireless Earbuds with Active Noise Cancellation, 40Hr Battery Life',
    fileUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e'
  },
  {
    id: '4',
    content: "Thank you for sharing the link. I will analyze the product and prepare a quote for you. This usually takes about 15-20 minutes.",
    type: 'text',
    sender: 'team',
    timestamp: new Date('2024-03-15T10:03:00')
  },
  {
    id: '5',
    content: 'Great, thank you! I am particularly interested in bulk pricing for orders of 100+ units.',
    type: 'text',
    sender: 'user',
    timestamp: new Date('2024-03-15T10:04:00'),
    status: 'read',
    statusTimeline: {
      sent: new Date('2024-03-15T10:04:00'),
      delivered: new Date('2024-03-15T10:04:05'),
      read: new Date('2024-03-15T10:04:10')
    }
  }
];