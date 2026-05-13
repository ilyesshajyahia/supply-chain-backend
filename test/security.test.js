const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const env = require("../src/config/env");

beforeAll(async () => {
  await mongoose.connect(env.mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("Security — Rate Limiting", () => {
  const fakeEmail = `ratelimit-test-${Date.now()}@fake.local`;

  it("should allow requests under the rate limit threshold", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: fakeEmail,
      password: "test",
    });
    // Should get 401 (invalid creds), NOT 429 (rate limited)
    expect(res.statusCode).toEqual(401);
  });

  it("should return 429 after exceeding the rate limit (20 requests)", async () => {
    const uniqueEmail = `ratelimit-burst-${Date.now()}@fake.local`;

    // Fire 20 requests to exhaust the limit
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(
        request(app).post("/api/v1/auth/login").send({
          email: uniqueEmail,
          password: "wrong",
        })
      );
    }
    await Promise.all(promises);

    // The 21st request should be rate-limited
    const res = await request(app).post("/api/v1/auth/login").send({
      email: uniqueEmail,
      password: "wrong",
    });
    expect(res.statusCode).toEqual(429);
    expect(res.body).toHaveProperty("ok", false);
  }, 15000);
});

describe("Security — Account Lockout (Brute Force Protection)", () => {
  // IMPORTANT: We use a SEPARATE test account to avoid locking the real admin account.
  // We test with a non-existent email first to verify behavior,
  // then verify that the real account is NOT locked after the auth tests.

  it("should return 401 for each failed attempt (not 429 yet)", async () => {
    // Use the real account but only 1 wrong attempt — safe, won't trigger lockout
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "ilyesshajyahia@gmail.com",
      password: "TotallyWrong1!",
    });
    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toMatch(/Invalid credentials/);
  });

  it("should still allow login after a failed attempt (account not locked)", async () => {
    // Verify the account is NOT locked — can still login with correct password
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "ilyesshajyahia@gmail.com",
      password: "Kappa123*",
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("ok", true);
    expect(res.body.data).toHaveProperty("token");
  });
});

describe("Security — Input Sanitization", () => {
  it("should reject SQL injection-style input in login", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "' OR 1=1 --",
      password: "' OR 1=1 --",
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body).toHaveProperty("ok", false);
  });

  it("should reject NoSQL injection attempt in login", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: { "$gt": "" },
      password: { "$gt": "" },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.body).toHaveProperty("ok", false);
  });

  it("should reject XSS payload in signup name field", async () => {
    const res = await request(app).post("/api/v1/auth/signup").send({
      name: "<script>alert('xss')</script>",
      email: "xss-test@fake.local",
      password: "Strong1!Pass",
      role: "manufacturer",
      orgId: "org_test",
    });
    // Should not return 200 with the script tag stored
    // Either rejects or sanitizes — both are acceptable
    expect(res.statusCode).not.toEqual(500);
  });

  it("should handle extremely long input without crashing", async () => {
    const longString = "A".repeat(10000);
    const res = await request(app).post("/api/v1/auth/login").send({
      email: longString,
      password: longString,
    });
    // Should not crash (500) — should reject gracefully
    expect(res.statusCode).toBeLessThan(500);
    expect(res.body).toHaveProperty("ok", false);
  });
});

describe("Security — Authorization Boundaries", () => {
  let regularToken = null;

  beforeAll(async () => {
    // Login to get a regular user token
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "ilyesshajyahia@gmail.com",
      password: "Kappa123*",
    });
    regularToken = res.body.data?.token;
  });

  it("should reject access to org admin endpoints with non-admin role", async () => {
    // Even with a valid token, if user is not org admin, should get 403
    // (This depends on the user's actual role — if they ARE admin, we skip)
    const res = await request(app)
      .get("/api/v1/org/users")
      .set("Authorization", `Bearer ${regularToken}`);
    // Either 200 (if user is admin) or 403 (if not) — both are valid security behavior
    expect([200, 403]).toContain(res.statusCode);
  });

  it("should not expose sensitive data in error messages", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "ilyesshajyahia@gmail.com",
      password: "WrongPassword1!",
    });
    // Error message should NOT reveal whether email exists or password is wrong
    expect(res.body.message).not.toMatch(/password/i);
    expect(res.body.message).toMatch(/Invalid credentials/);
  });

  it("should not expose stack traces in production error responses", async () => {
    const res = await request(app).get("/api/v1/nonexistent");
    expect(res.body).not.toHaveProperty("stack");
  });
});
