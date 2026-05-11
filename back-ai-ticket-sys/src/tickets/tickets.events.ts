import { Prisma, TicketEventType } from '@prisma/client';

interface LogEventArgs {
  tx: Prisma.TransactionClient;
  ticketId: string;
  actorId: string | null;
  eventType: TicketEventType;
  payload?: Record<string, unknown> | null;
}

export async function logTicketEvent(args: LogEventArgs) {
  return args.tx.ticketEvent.create({
    data: {
      ticketId: args.ticketId,
      actorId: args.actorId,
      eventType: args.eventType,
      payload: (args.payload ?? null) as Prisma.InputJsonValue | null,
    },
  });
}
