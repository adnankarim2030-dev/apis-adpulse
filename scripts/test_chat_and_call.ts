import { prisma } from "../src/lib/prisma";

const BASE_URL = "http://localhost:3005";

async function loginUser(email: string, pass = "Password123!") {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}`);
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/apis_session=([^;]+)/);
  const cookie = match ? `apis_session=${match[1]}` : "";
  const data = await res.json();
  return { user: data.data, cookie };
}

async function main() {
  console.log("=== APIS CHAT & CALL SIGNALING AUDIT ===");

  // 1. Logins
  console.log("\n[1] Logging in CEO and Staff Member...");
  const ceo = await loginUser("adnan@apis.com", "Adnan#Tech95");
  const staff = await loginUser("abeel@apis.com", "Abeel*Pixel74");
  console.log(`✓ CEO logged in: ${ceo.user.name} (${ceo.user.id})`);
  console.log(`✓ Staff logged in: ${staff.user.name} (${staff.user.id})`);

  // 2. CEO sends message to Staff
  console.log("\n[2] Testing Direct Message Sending (CEO -> Staff)...");
  const testMsgContent = `Hello Abeel! Automated test message at ${Date.now()}`;
  const sendRes = await fetch(`${BASE_URL}/api/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: ceo.cookie,
    },
    body: JSON.stringify({
      channelType: "DIRECT",
      channelId: staff.user.id,
      content: testMsgContent,
    }),
  });

  if (!sendRes.ok) {
    const err = await sendRes.text();
    throw new Error(`Send message failed: ${err}`);
  }
  const sentData = await sendRes.json();
  console.log(`✓ Message sent by CEO. ID: ${sentData.data.id}`);

  // 3. Staff receives message
  console.log("\n[3] Testing Message Retrieval & Polling on Staff Side...");
  const getRes = await fetch(
    `${BASE_URL}/api/messages?channelType=DIRECT&channelId=${ceo.user.id}`,
    {
      headers: { Cookie: staff.cookie },
    }
  );
  if (!getRes.ok) throw new Error("Staff could not retrieve messages");
  const getData = await getRes.json();
  const foundMsg = getData.data.find((m: any) => m.content === testMsgContent);
  if (!foundMsg) throw new Error("Message not found in Staff inbox!");
  console.log(`✓ Staff successfully received message from ${foundMsg.senderName}: "${foundMsg.content.slice(0, 40)}..."`);

  // 4. Test WebRTC Call Signaling (Outgoing -> Incoming -> Answer -> End)
  console.log("\n[4] Testing Call Initiation & Incoming Call Popup Detection...");
  const testCallId = `call-test-${Date.now()}`;

  // CEO initiates call to Staff
  const initiateRes = await fetch(`${BASE_URL}/api/calls/signal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: ceo.cookie,
    },
    body: JSON.stringify({
      action: "CALL_INITIATE",
      callId: testCallId,
      targetUserId: staff.user.id,
      targetName: staff.user.name,
      sdp: { type: "offer", sdp: "v=0\r\ntest-offer-sdp" },
    }),
  });

  if (!initiateRes.ok) {
    throw new Error(`Call initiate failed: ${await initiateRes.text()}`);
  }
  console.log(`✓ Outgoing Call initiated by CEO (callId: ${testCallId})`);

  // Staff polls for incoming calls
  const incomingRes = await fetch(`${BASE_URL}/api/calls/signal?poll=incoming`, {
    headers: { Cookie: staff.cookie },
  });
  if (!incomingRes.ok) throw new Error("Incoming call poll failed");
  const incomingData = await incomingRes.json();

  if (!incomingData.activeCall || incomingData.activeCall.callId !== testCallId) {
    throw new Error(`Incoming call popup signal not found on Staff side! Got: ${JSON.stringify(incomingData)}`);
  }
  console.log(`✓ Incoming Call detected on Staff screen! Caller: "${incomingData.activeCall.callerName}", Target: Staff`);

  // 5. Staff Answers the Call
  console.log("\n[5] Testing Call Answer Signal...");
  const answerRes = await fetch(`${BASE_URL}/api/calls/signal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: staff.cookie,
    },
    body: JSON.stringify({
      action: "CALL_ANSWER",
      callId: testCallId,
      sdp: { type: "answer", sdp: "v=0\r\ntest-answer-sdp" },
    }),
  });
  if (!answerRes.ok) throw new Error("Call answer failed");
  console.log("✓ Staff accepted the call with SDP Answer signal");

  // CEO polls for answer
  const checkAnswerRes = await fetch(`${BASE_URL}/api/calls/signal?callId=${testCallId}`, {
    headers: { Cookie: ceo.cookie },
  });
  const checkAnswerData = await checkAnswerRes.json();
  const answerSignal = checkAnswerData.signals?.find((s: any) => s.action === "CALL_ANSWER");
  if (!answerSignal) throw new Error("Answer signal not detected by Caller!");
  console.log("✓ Caller detected Answer signal! Status: Connected 🟢");

  // 6. Terminate Call
  console.log("\n[6] Testing Call End / Hangup...");
  const endRes = await fetch(`${BASE_URL}/api/calls/signal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: ceo.cookie,
    },
    body: JSON.stringify({
      action: "CALL_END",
      callId: testCallId,
      reason: "TEST_COMPLETED",
    }),
  });
  if (!endRes.ok) throw new Error("Call end failed");
  console.log("✓ Call ended successfully.");

  // Verify staff poll reflects call ended
  const postEndRes = await fetch(`${BASE_URL}/api/calls/signal?poll=incoming`, {
    headers: { Cookie: staff.cookie },
  });
  const postEndData = await postEndRes.json();
  if (postEndData.activeCall !== null) {
    throw new Error("Active call should be null after hangup!");
  }
  console.log("✓ Verified: Incoming call popup dismisses automatically upon hangup.");

  console.log("\n🎉 ALL 6 CHAT & CALL SIGNAL TESTS PASSED 100%!");
}

main().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
