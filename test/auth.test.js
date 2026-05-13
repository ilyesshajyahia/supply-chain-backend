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

describe("Authentication API", () => {
  let authToken = null;

  describe("POST /api/v1/auth/signup", () => {
    it("should reject signup with empty body", async () => {
      const res = await request(app).post("/api/v1/auth/signup").send({});
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("ok", false);
    });

    it("should reject signup without password", async () => {
      const res = await request(app).post("/api/v1/auth/signup").send({
        name: "Test",
        email: "test@test.com",
        role: "manufacturer",
        orgId: "org_test",
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("ok", false);
    });

    it("should reject weak passwords", async () => {
      const res = await request(app).post("/api/v1/auth/signup").send({
        name: "Test",
        email: "weakpass-test@test.com",
        role: "manufacturer",
        orgId: "org_test",
        password: "weak",
      });
      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toMatch(/Password must be/);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should reject login with empty body", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({});
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("ok", false);
      expect(res.body.message).toMatch(/email and password are required/);
    });

    it("should reject login with wrong password", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "ilyesshajyahia@gmail.com",
        password: "WrongPassword123!",
      });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });

    it("should login successfully with valid credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "ilyesshajyahia@gmail.com",
        password: "Kappa123*",
      });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("ok", true);
      expect(res.body.data).toHaveProperty("token");
      expect(res.body.data).toHaveProperty("user");
      expect(res.body.data.user).toHaveProperty("email", "ilyesshajyahia@gmail.com");
      expect(res.body.data.user).toHaveProperty("role");
      expect(res.body.data.user).toHaveProperty("orgId");

      // Save token for subsequent tests
      authToken = res.body.data.token;
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should reject request without token", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });

    it("should reject request with malformed token", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid.token.here");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });

    it("should reject request with missing Bearer prefix", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "some-random-token");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });

    it("should return user profile with valid token", async () => {
      expect(authToken).toBeTruthy(); // ensure login test ran first
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("ok", true);
      expect(res.body.data).toHaveProperty("email", "ilyesshajyahia@gmail.com");
      expect(res.body.data).toHaveProperty("role");
      expect(res.body.data).toHaveProperty("orgId");
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("should reject refresh without token", async () => {
      const res = await request(app).post("/api/v1/auth/refresh");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });

    it("should reject refresh with invalid token", async () => {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Authorization", "Bearer expired.or.invalid");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });

    it("should refresh session with valid token", async () => {
      expect(authToken).toBeTruthy();
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("ok", true);
      expect(res.body.data).toHaveProperty("token");
    });
  });

  describe("GET /api/v1/auth/verify-email", () => {
    it("should reject verification without token query param", async () => {
      const res = await request(app).get("/api/v1/auth/verify-email");
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("GET /api/v1/auth/reset-password", () => {
    it("should reject reset redirect without token", async () => {
      const res = await request(app).get("/api/v1/auth/reset-password");
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("ok", false);
    });
  });
});
