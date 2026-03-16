import { Request, Response } from 'express';

export const logError = (req: Request, res: Response) => {
  const { message, stack, info, time } = req.body || {};

  console.error('[CLIENT LOG]', time || new Date().toISOString());
  console.error('Message:', message);
  if (stack) console.error('Stack:', stack);
  if (info) console.error('Info:', info);

  // Don't fail the client if logging fails
  return res.status(204).end();
};
