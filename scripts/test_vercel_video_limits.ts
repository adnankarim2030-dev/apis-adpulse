export {};

const BASE_URL = "https://apis-management-system.vercel.app";

async function login(email = "adnan@apis.com", pass = "Adnan#Tech95") {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass }),
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const match = setCookie.match(/apis_session=([^;]+)/);
  return match ? `apis_session=${match[1]}` : "";
}

async function testPayloadSize(cookie: string, sizeInMB: number) {
  const rawBytes = Math.floor(sizeInMB * 1024 * 1024);
  const base64Chars = "A".repeat(rawBytes);
  const fakeVideoData = `data:video/mp4;base64,${base64Chars}`;

  const startTime = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        channelType: "GENERAL",
        channelId: "general",
        content: fakeVideoData,
      }),
    });

    const elapsed = Date.now() - startTime;
    return {
      sizeInMB,
      status: res.status,
      ok: res.ok,
      elapsedMs: elapsed,
      error: res.ok ? null : await res.text(),
    };
  } catch (err: any) {
    return {
      sizeInMB,
      status: 0,
      ok: false,
      elapsedMs: Date.now() - startTime,
      error: err.message,
    };
  }
}

async function run() {
  console.log("=== VERCEL LIVE VIDEO PAYLOAD LIMIT BENCHMARK ===");
  const cookie = await login();
  console.log("✓ Logged into Vercel production.");

  const testSizes = [0.5, 1.0, 2.0, 3.0, 4.0, 4.5, 5.0];

  for (const size of testSizes) {
    process.stdout.write(`Testing Vercel video payload of ${size} MB... `);
    const result = await testPayloadSize(cookie, size);
    if (result.ok) {
      console.log(`✅ SUCCESS (Status: ${result.status}, Took: ${result.elapsedMs}ms)`);
    } else {
      console.log(`❌ BLOCKED/FAILED (Status: ${result.status}, Message: ${result.error?.slice(0, 80)})`);
    }
  }
}

run();
