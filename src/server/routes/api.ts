import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as chatController from '../controllers/chatController';
import * as messageController from '../controllers/messageController';
import * as groupController from '../controllers/groupController';

const router = Router();

// Chat routes
router.post(
  '/chats',
  authenticate,
  [
    body('customerId').isUUID(),
    body('metadata').optional().isObject()
  ],
  validate,
  chatController.createChat
);

router.get(
  '/chats',
  authenticate,
  chatController.getChats
);

router.get(
  '/chats/:chatId',
  authenticate,
  [param('chatId').isUUID()],
  validate,
  chatController.getChat
);

// Message routes
router.post(
  '/chats/:chatId/messages',
  authenticate,
  [
    param('chatId').isUUID(),
    body('content').isString(),
    body('type').isIn(['text', 'image', 'document', 'voice']),
    body('mediaUrl').optional().isURL()
  ],
  validate,
  messageController.sendMessage
);

router.get(
  '/chats/:chatId/messages',
  authenticate,
  [param('chatId').isUUID()],
  validate,
  messageController.getMessages
);

// Group routes
router.post(
  '/groups',
  authenticate,
  [
    body('chatId').isUUID(),
    body('name').isString(),
    body('participants').isArray()
  ],
  validate,
  groupController.createGroup
);

router.post(
  '/groups/:groupId/participants',
  authenticate,
  [
    param('groupId').isString(),
    body('participants').isArray()
  ],
  validate,
  groupController.addParticipants
);

router.delete(
  '/groups/:groupId/participants/:participantId',
  authenticate,
  [
    param('groupId').isString(),
    param('participantId').isString()
  ],
  validate,
  groupController.removeParticipant
);

export { router };