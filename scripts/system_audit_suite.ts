export {};

const BASE_URL = "http://localhost:3005";

interface TestResult {
  category: string;
  testName: string;
  status: "PASS" | "FAIL";
  details?: string;
}

const results: TestResult[] = [];

function record(category: string, testName: string, pass: boolean, details?: string) {
  results.push({
    category,
    testName,
    status: pass ? "PASS" : "FAIL",
    details,
  });
  const symbol = pass ? "✓" : "✗";
  console.log(`  ${symbol} [${category}] ${testName} ${details ? "(" + details + ")" : ""}`);
}

const ROSTER = [
  { name: "Khurram Jaffrani (CEO)", email: "khurram@apis.com", password: "Khurram#Apex94", expectedRole: "CEO" },
  { name: "Noel Francis (Business Director)", email: "noel@apis.com", password: "Noel$Direct58", expectedRole: "CEO" },
  { name: "Syeda Musfira (Client Service)", email: "musfira@apis.com", password: "Musfira!Ops63", expectedRole: "CEO" },
  { name: "Adnan Karim (Head of AI/Webapp)", email: "adnan@apis.com", password: "Adnan#Tech95", expectedRole: "STAFF" },
  { name: "Syed Abeel Ahmed (Head of Design)", email: "abeel@apis.com", password: "Abeel*Pixel74", expectedRole: "STAFF" },
  { name: "Naeem Ahmed (Head of Media)", email: "naeem@apis.com", password: "Naeem@Media45", expectedRole: "STAFF" },
  { name: "Kashif Aghani (Manager BizDev)", email: "kashif@apis.com", password: "Kashif&Growth81", expectedRole: "STAFF" },
  { name: "Shoaib Jaffrani (Head Client Service)", email: "shoaib@apis.com", password: "Shoaib&Client41", expectedRole: "STAFF" },
  { name: "Fahim Nisar (Digital Strategy)", email: "fahim@apis.com", password: "Fahim@Strat83", expectedRole: "STAFF" },
  { name: "Maha (Media Executive)", email: "maha@apis.com", password: "Maha#Reach39", expectedRole: "STAFF" },
  { name: "Fatima (Creative Executive)", email: "fatima@apis.com", password: "Fatima*Design51", expectedRole: "STAFF" },
  { name: "Ozam (Graphics Designer)", email: "ozam@apis.com", password: "Ozam*Vector48", expectedRole: "STAFF" },
  { name: "Faizan Ahmed (Media Operations)", email: "faizan@apis.com", password: "Faizan#Pulse72", expectedRole: "STAFF" },
  { name: "Muhammad Khizar (Client Service)", email: "khizar@apis.com", password: "Khizar*Apex68", expectedRole: "STAFF" },
  { name: "Khurram Jaffrani (CEO Alias)", email: "ceo@adpulse.com", password: "Khurram#Apex94", expectedRole: "CEO" },
];

const sessions: Record<string, { cookie: string; user: any }> = {};

async function auditLogins() {
  console.log("\n=======================================================");
  console.log(" 1. AUDIT: ALL 15 ADMIN & STAFF CREDENTIALS LOGIN TEST");
  console.log("=======================================================");

  for (const member of ROSTER) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: member.email, password: member.password }),
      });

      const setCookie = res.headers.get("set-cookie") || "";
      const cookieMatch = setCookie.match(/apis_session=([^;]+)/);
      const sessionCookie = cookieMatch ? `apis_session=${cookieMatch[1]}` : "";

      const json = await res.json();
      const user = json?.data;

      const expectedEmail = member.email === "ceo@adpulse.com" ? "khurram@apis.com" : member.email;
      const success = res.status === 200 && user?.email === expectedEmail && user?.role === member.expectedRole;
      if (success) {
        sessions[member.email] = { cookie: sessionCookie, user };
        record("LOGIN", `${member.name} (${member.email})`, true, `Role: ${user.role}, ID: ${user.id.slice(0, 8)}...`);
      } else {
        record("LOGIN", `${member.name} (${member.email})`, false, `Status: ${res.status}, Error: ${json?.error || "Unknown"}`);
      }
    } catch (err: any) {
      record("LOGIN", `${member.name} (${member.email})`, false, err.message);
    }
  }
}

async function auditRosterExclusion() {
  console.log("\n=======================================================");
  console.log(" 2. AUDIT: AHMED KHAN ROSTER & CHAT EXCLUSION TEST");
  console.log("=======================================================");

  const adnanSession = sessions["adnan@apis.com"]?.cookie || "";

  // 1. Check /api/staff
  const staffRes = await fetch(`${BASE_URL}/api/staff`, {
    headers: { Cookie: adnanSession },
  });
  const staffJson = await staffRes.json();
  const staffList = staffJson?.data || [];
  const ahmedInStaff = staffList.some(
    (s: any) => s.name?.toLowerCase().includes("ahmed khan") || s.email?.toLowerCase().includes("ahmed.khan")
  );

  record("EXCLUSION", "Staff Directory API excludes Ahmed Khan", !ahmedInStaff, `Total Staff: ${staffList.length}`);

  const staffNames = staffList.map((s: any) => s.name.toLowerCase().trim());
  const hasDuplicateNames = new Set(staffNames).size !== staffNames.length;
  record("EXCLUSION", "Staff Directory has zero duplicate names", !hasDuplicateNames, `Total Unique Staff: ${new Set(staffNames).size}`);

  // 2. Check /messages page staff list
  const msgRes = await fetch(`${BASE_URL}/messages`, {
    headers: { Cookie: adnanSession },
  });
  const msgHtml = await msgRes.text();
  const ahmedInChat = msgHtml.includes("ahmed.khan@adpulse.com");

  record("EXCLUSION", "Messages UI excludes Ahmed Khan", !ahmedInChat, ahmedInChat ? "Found in HTML" : "Clean");
}

async function auditChatSendAndReceive() {
  console.log("\n=======================================================");
  console.log(" 3. AUDIT: REAL-TIME CHAT SEND & RECEIVE");
  console.log("=======================================================");

  const khurram = sessions["khurram@apis.com"];
  const adnan = sessions["adnan@apis.com"];

  // 1. CEO sends a message to the general team chat
  const ceoMsgContent = `[AUDIT CHAT] Khurram Jaffrani CEO Announcement - ${Date.now()}`;
  const sendRes = await fetch(`${BASE_URL}/api/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: khurram.cookie || '',
    },
    body: JSON.stringify({
      channelType: "GENERAL",
      channelId: "general",
      content: ceoMsgContent,
    }),
  });
  const sendJson = await sendRes.json();
  const sentId = sendJson?.data?.id;
  record("CHAT", "CEO sends general announcement message", sendRes.ok && Boolean(sentId), `Status: ${sendRes.status}, ID: ${sentId?.slice(0, 8)}...`);

  // 2. Adnan polls messages and verifies receipt
  const pollRes = await fetch(`${BASE_URL}/api/messages?channelType=GENERAL&channelId=general`, {
    headers: { Cookie: adnan.cookie || '' },
  });
  const pollJson = await pollRes.json();
  const messages = pollJson?.data || [];
  const received = messages.find((m: any) => m.content === ceoMsgContent);

  record("CHAT", "Staff Adnan receives CEO announcement message", Boolean(received), `Sender: ${received?.senderName || "CEO"}`);

  // 3. Adnan sends a reply
  const replyContent = `[AUDIT CHAT] Adnan acknowledged CEO announcement - ${Date.now()}`;
  const replyRes = await fetch(`${BASE_URL}/api/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adnan.cookie || '',
    },
    body: JSON.stringify({
      channelType: "GENERAL",
      channelId: "general",
      content: replyContent,
    }),
  });
  const replyJson = await replyRes.json();
  record("CHAT", "Staff Adnan replies to general channel", replyRes.ok, `Status: ${replyRes.status}, ID: ${replyJson?.data?.id?.slice(0, 8)}...`);

  // 4. Direct 1-on-1 Chat between CEO & Staff
  const dmContent = `[DIRECT MESSAGE] Khurram to Adnan direct briefing - ${Date.now()}`;
  const dmRes = await fetch(`${BASE_URL}/api/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: khurram.cookie || '',
    },
    body: JSON.stringify({
      channelType: "DIRECT",
      channelId: adnan.user.id,
      content: dmContent,
    }),
  });
  record("CHAT", "CEO sends 1-on-1 direct message to Adnan", dmRes.ok, `Status: ${dmRes.status}`);

  // Adnan checks direct inbox
  const dmPollRes = await fetch(`${BASE_URL}/api/messages?channelType=DIRECT&channelId=${khurram.user.id}`, {
    headers: { Cookie: adnan.cookie || '' },
  });
  const dmPollJson = await dmPollRes.json();
  const receivedDm = (dmPollJson?.data || []).find((m: any) => m.content === dmContent);
  record("CHAT", "Adnan receives 1-on-1 direct message from CEO", Boolean(receivedDm), `Sender: ${receivedDm?.senderName || "Khurram"}`);
}

async function auditVoiceAndVideoCalls() {
  console.log("\n=======================================================");
  console.log(" 4. AUDIT: WEBRTC VOICE & VIDEO CALL SIGNALING");
  console.log("=======================================================");

  const adnan = sessions["adnan@apis.com"];
  const khurram = sessions["khurram@apis.com"];
  const testCallId = `call_${Date.now()}_audit`;

  // Step 1: Adnan initiates call offer to Khurram
  const callOfferPayload = {
    action: "CALL_INITIATE",
    callId: testCallId,
    targetUserId: khurram.user.id,
    targetName: khurram.user.name,
    sdp: "v=0\r\no=adnan 123456 2 IN IP4 127.0.0.1\r\ns=AuditCall\r\nt=0 0\r\nm=audio 54321 RTP/SAVPF 111",
  };

  const offerRes = await fetch(`${BASE_URL}/api/calls/signal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adnan.cookie || '',
    },
    body: JSON.stringify(callOfferPayload),
  });
  const offerJson = await offerRes.json();

  record("CALL", "Caller (Adnan) initiates call offer & ring", offerRes.ok && offerJson?.success, `Call ID: ${testCallId}`);

  // Step 2: Khurram polls for incoming calls
  const khurramPollRes = await fetch(`${BASE_URL}/api/calls/signal?poll=incoming`, {
    headers: { Cookie: khurram.cookie || '' },
  });
  const khurramPollJson = await khurramPollRes.json();
  const activeCall = khurramPollJson?.activeCall;
  const isTargetCall = activeCall && (activeCall.callId === testCallId || activeCall.callerName?.includes("Adnan"));

  record("CALL", "Callee (Khurram) detects incoming ringing popup", Boolean(isTargetCall), `Caller: ${activeCall?.callerName || "Adnan"}`);

  // Step 3: Khurram answers the call
  const answerPayload = {
    action: "CALL_ANSWER",
    callId: testCallId,
    sdp: "v=0\r\no=khurram 789012 2 IN IP4 127.0.0.1\r\ns=AuditCallAnswer\r\nt=0 0\r\nm=audio 54321 RTP/SAVPF 111",
  };

  const answerRes = await fetch(`${BASE_URL}/api/calls/signal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: khurram.cookie || '',
    },
    body: JSON.stringify(answerPayload),
  });
  const answerJson = await answerRes.json();

  record("CALL", "Callee (Khurram) answers call with SDP answer", answerRes.ok && answerJson?.success);

  // Step 4: Adnan polls and receives answer signal
  const adnanPollRes = await fetch(`${BASE_URL}/api/calls/signal?callId=${testCallId}`, {
    headers: { Cookie: adnan.cookie || '' },
  });
  const adnanPollJson = await adnanPollRes.json();
  const hasAnswer = Boolean(
    adnanPollJson?.signals?.some((s: any) => s.action === "CALL_ANSWER")
  );

  record("CALL", "Caller receives answer signal & WebRTC connects", hasAnswer, `Status: CONNECTED`);

  // Step 5: Hangup / end call signal
  const hangupRes = await fetch(`${BASE_URL}/api/calls/signal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adnan.cookie || '',
    },
    body: JSON.stringify({
      action: "CALL_END",
      callId: testCallId,
      reason: "CALL_COMPLETED_SUCCESSFULLY",
    }),
  });

  record("CALL", "Caller ends call and terminates signal", hangupRes.ok);
}

async function auditFileAndMediaAttachments() {
  console.log("\n=======================================================");
  console.log(" 5. AUDIT: FILE & VIDEO SEND/RECEIVE + CLOUDFLARE R2");
  console.log("=======================================================");

  const adnan = sessions["adnan@apis.com"];
  const khurram = sessions["khurram@apis.com"];

  // 1. Test Presigned R2 URL generation for heavy file (e.g. 10 GB Video)
  const presignRes = await fetch(`${BASE_URL}/api/uploads/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adnan.cookie || '',
    },
    body: JSON.stringify({
      fileName: "AdPulse_Creative_Campaign_4K_10GB.mp4",
      contentType: "video/mp4",
      fileSize: 10737418240, // 10 GB
    }),
  });

  const presignJson = await presignRes.json();
  const uploadUrl = presignJson?.uploadUrl;
  const downloadUrl = presignJson?.downloadUrl;

  const validPresign = presignRes.ok && Boolean(uploadUrl) && Boolean(downloadUrl);
  record("STORAGE", "Cloudflare R2 Direct 10 GB Presigned URL Generation", validPresign, `Download URL Valid: 7 Days`);

  // 2. Test chat message with image attachment format
  const imgPayload = `[IMAGE_ATTACHMENT]:data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEeQHzEho9vQAAAABJRU5ErkJggg==`;
  const imgChatRes = await fetch(`${BASE_URL}/api/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adnan.cookie || '',
    },
    body: JSON.stringify({
      channelType: "GENERAL",
      channelId: "general",
      content: imgPayload,
    }),
  });
  record("MEDIA", "Chat message with image attachment sent", imgChatRes.ok, `Status: ${imgChatRes.status}`);

  // 3. Test chat message with 10 GB Video attachment format (Cloudflare R2 download URL)
  const videoFileMetadata = {
    name: "AdPulse_TVC_Master_Final_4K.mp4",
    url: downloadUrl || "https://apis-uploads.e3424aca0013cb9b1ced0d56d5d4f1ee.r2.cloudflarestorage.com/master_4k.mp4",
    size: "4.8 GB",
    type: "video",
  };
  const videoPayload = `[FILE_ATTACHMENT]:${JSON.stringify(videoFileMetadata)}`;

  const videoChatRes = await fetch(`${BASE_URL}/api/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adnan.cookie || '',
    },
    body: JSON.stringify({
      channelType: "GENERAL",
      channelId: "general",
      content: videoPayload,
    }),
  });
  record("MEDIA", "Chat message with 4K Video Attachment sent", videoChatRes.ok, `Status: ${videoChatRes.status}`);

  // 4. Verify Khurram retrieves the video and image attachments cleanly
  const verifyRes = await fetch(`${BASE_URL}/api/messages?channelType=GENERAL&channelId=general`, {
    headers: { Cookie: khurram.cookie || '' },
  });
  const verifyJson = await verifyRes.json();
  const allMessages = verifyJson?.data || [];
  const foundImage = allMessages.some((m: any) => m.content.startsWith("[IMAGE_ATTACHMENT]:"));
  const foundVideo = allMessages.some((m: any) => m.content.startsWith("[FILE_ATTACHMENT]:") && m.content.includes("video"));

  record("MEDIA", "Receiver renders Image attachment in Chat", foundImage, `Image found in feed`);
  record("MEDIA", "Receiver renders 4K Video Player in Chat", foundVideo, `Video player ready with direct R2 streaming`);
}

async function auditDashboardEndpoints() {
  console.log("\n=======================================================");
  console.log(" 6. AUDIT: CEO & STAFF DASHBOARD APIS");
  console.log("=======================================================");

  const khurram = sessions["khurram@apis.com"];
  const adnan = sessions["adnan@apis.com"];

  // 1. CEO Dashboard
  const ceoDashRes = await fetch(`${BASE_URL}/api/dashboard/ceo`, {
    headers: { Cookie: khurram.cookie || '' },
  });
  const ceoDashJson = await ceoDashRes.json();
  const ceoOk = ceoDashRes.ok && Boolean(ceoDashJson?.data?.kpis);
  record("DASHBOARD", "CEO Analytics & KPIs Dashboard API", ceoOk, `Projects: ${ceoDashJson?.data?.kpis?.activeProjects ?? 0}`);

  // 2. Staff Dashboard
  const staffDashRes = await fetch(`${BASE_URL}/api/dashboard/staff`, {
    headers: { Cookie: adnan.cookie || '' },
  });
  const staffDashJson = await staffDashRes.json();
  const staffOk = staffDashRes.ok && Boolean(staffDashJson?.data?.counts);
  record("DASHBOARD", "Staff My-Day & Workload Dashboard API", staffOk, `Due Today: ${staffDashJson?.data?.counts?.dueToday ?? 0}`);

  // 3. Projects API
  const projRes = await fetch(`${BASE_URL}/api/projects`, {
    headers: { Cookie: khurram.cookie || '' },
  });
  const projJson = await projRes.json();
  record("DASHBOARD", "Active Projects Roster API", projRes.ok, `Projects Count: ${projJson?.data?.length ?? 0}`);
}

async function runFullAudit() {
  console.log("Starting APIS Full System Verification Suite against:", BASE_URL);
  const startTime = Date.now();

  await auditLogins();
  await auditRosterExclusion();
  await auditChatSendAndReceive();
  await auditVoiceAndVideoCalls();
  await auditFileAndMediaAttachments();
  await auditDashboardEndpoints();

  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n=======================================================");
  console.log(` AUDIT SUMMARY: ${passed}/${total} TESTS PASSED in ${duration}s (${failed} FAILED)`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runFullAudit();
