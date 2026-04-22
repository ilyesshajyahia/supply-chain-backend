const asyncHandler = require("../utils/asyncHandler");
const chatService = require("../services/chat.service");

const listMessages = asyncHandler(async (req, res) => {
  const data = await chatService.listMessagesForUser({
    user: req.user,
    qrId: req.query.qrId,
    limit: req.query.limit,
  });
  res.json({ ok: true, data });
});

const sendMessage = asyncHandler(async (req, res) => {
  const data = await chatService.sendMessage({
    user: req.user,
    qrId: req.body.qrId,
    text: req.body.text,
    toRoles: req.body.toRoles,
    attachments: req.body.attachments,
  });
  res.status(201).json({ ok: true, data });
});

const listParticipants = asyncHandler(async (req, res) => {
  const data = await chatService.listParticipantsForUser(req.user);
  res.json({ ok: true, data });
});

module.exports = { listMessages, sendMessage, listParticipants };
