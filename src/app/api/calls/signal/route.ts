import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { requireSession } from "@/lib/rbac";
import { handleApiError } from "@/lib/api-utils";

/**
 * In-App Pure WebRTC Call Signaling (WhatsApp Style)
 * Handled via Prisma ActivityLog with entityType="CALL"
 */

export async function GET(request: NextRequest) {
  try {
    const session = requireSession(await getSession());
    const { searchParams } = new URL(request.url);

    const poll = searchParams.get("poll");
    const callId = searchParams.get("callId");
    const since = searchParams.get("since");

    // 1. Poll for incoming calls directed to the current user
    if (poll === "incoming") {
      const thirtySecondsAgo = new Date(Date.now() - 35000);

      // Find any call initiated for this user in the last 35 seconds
      const incomingInitiations = await prisma.activityLog.findMany({
        where: {
          entityType: "CALL",
          entityId: session.userId,
          action: "CALL_INITIATE",
          createdAt: { gte: thirtySecondsAgo },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });

      if (incomingInitiations.length === 0) {
        return NextResponse.json({ activeCall: null });
      }

      const latestCall = incomingInitiations[0];
      if (!latestCall) {
        return NextResponse.json({ activeCall: null });
      }
      const meta = (latestCall.metadata as any) || {};

      // Check if this call was already ended or rejected
      const endedLogs = await prisma.activityLog.findFirst({
        where: {
          entityType: "CALL",
          action: "CALL_END",
          metadata: {
            path: ["callId"],
            equals: meta.callId,
          },
        },
      });

      if (endedLogs) {
        return NextResponse.json({ activeCall: null });
      }

      return NextResponse.json({
        activeCall: {
          callId: meta.callId,
          callerId: latestCall.actorId,
          callerName: meta.callerName || "Team Member",
          targetUserId: session.userId,
          callType: meta.callType || "audio",
          sdpOffer: meta.sdpOffer,
          createdAt: latestCall.createdAt.toISOString(),
        },
      });
    }

    // 2. Poll for signaling updates on a specific active callId (Answer, ICE candidates, End)
    if (callId) {
      const sinceDate = since ? new Date(since) : new Date(Date.now() - 60000);

      const signals = await prisma.activityLog.findMany({
        where: {
          entityType: "CALL",
          createdAt: { gt: sinceDate },
          metadata: {
            path: ["callId"],
            equals: callId,
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const formatted = signals.map((s) => ({
        id: s.id,
        action: s.action,
        actorId: s.actorId,
        metadata: s.metadata,
        createdAt: s.createdAt.toISOString(),
      }));

      return NextResponse.json({ signals: formatted });
    }

    return NextResponse.json({ error: "Missing poll or callId parameter" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(await getSession());
    const body = await request.json();

    const { action, callId, targetUserId, targetName, sdp, candidate, reason, callType } = body;

    if (!action || !callId) {
      return NextResponse.json({ error: "Action and callId are required" }, { status: 400 });
    }

    if (action === "CALL_INITIATE") {
      // Create initiate signal targeted to targetUserId
      const log = await prisma.activityLog.create({
        data: {
          entityType: "CALL",
          entityId: targetUserId || "all",
          actorId: session.userId,
          action: "CALL_INITIATE",
          metadata: {
            callId,
            callerId: session.userId,
            callerName: session.name,
            targetUserId,
            targetName,
            sdpOffer: sdp,
            callType: callType || "audio",
            status: "RINGING",
          },
        },
      });

      return NextResponse.json({ success: true, signalId: log.id });
    }

    if (action === "CALL_ANSWER") {
      // Receiver answered the call with SDP answer
      const log = await prisma.activityLog.create({
        data: {
          entityType: "CALL",
          entityId: callId,
          actorId: session.userId,
          action: "CALL_ANSWER",
          metadata: {
            callId,
            sdpAnswer: sdp,
            answeredById: session.userId,
            answeredByName: session.name,
            status: "CONNECTED",
          },
        },
      });

      return NextResponse.json({ success: true, signalId: log.id });
    }

    if (action === "CALL_ICE") {
      // ICE candidate exchange
      const log = await prisma.activityLog.create({
        data: {
          entityType: "CALL",
          entityId: callId,
          actorId: session.userId,
          action: "CALL_ICE",
          metadata: {
            callId,
            candidate,
            senderId: session.userId,
          },
        },
      });

      return NextResponse.json({ success: true, signalId: log.id });
    }

    if (action === "CALL_END" || action === "CALL_REJECT") {
      // Terminate call
      const log = await prisma.activityLog.create({
        data: {
          entityType: "CALL",
          entityId: callId,
          actorId: session.userId,
          action: "CALL_END",
          metadata: {
            callId,
            endedById: session.userId,
            reason: reason || action,
          },
        },
      });

      return NextResponse.json({ success: true, signalId: log.id });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
