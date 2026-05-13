const request = require("supertest");
const app = require("../src/app");

describe("Health & System API", () => {
  describe("GET /", () => {
    it("should return running status", async () => {
      const res = await request(app).get("/");
      expect(res.statusCode).toEqual(200);
      expect(res.text).toBe("ChainTrace backend is running");
    });
  });

  describe("GET /api/v1/health", () => {
    it("should return ok:true with timestamp", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("ok", true);
      expect(res.body).toHaveProperty("message", "Backend healthy");
      expect(res.body).toHaveProperty("timestamp");
    });

    it("should return a valid ISO timestamp", async () => {
      const res = await request(app).get("/api/v1/health");
      const date = new Date(res.body.timestamp);
      expect(date.toISOString()).toBe(res.body.timestamp);
    });
  });

  describe("GET /api/v1/health/details", () => {
    it("should return detailed system information", async () => {
      const res = await request(app).get("/api/v1/health/details");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("ok", true);
      expect(res.body).toHaveProperty("nodeEnv");
      expect(res.body).toHaveProperty("uptimeSeconds");
    });

    it("should include database connection status", async () => {
      const res = await request(app).get("/api/v1/health/details");
      expect(res.body).toHaveProperty("database");
      expect(res.body.database).toHaveProperty("connected");
      expect(res.body.database).toHaveProperty("readyState");
    });

    it("should include blockchain chain configuration", async () => {
      const res = await request(app).get("/api/v1/health/details");
      expect(res.body).toHaveProperty("chain");
      expect(res.body.chain).toHaveProperty("activeChain");
      expect(res.body.chain).toHaveProperty("l1");
      expect(res.body.chain).toHaveProperty("l2");
    });

    it("should include L1 chain details with contract addresses", async () => {
      const res = await request(app).get("/api/v1/health/details");
      const l1 = res.body.chain.l1;
      expect(l1).toHaveProperty("chainId");
      expect(l1).toHaveProperty("registryAddress");
      expect(l1).toHaveProperty("lifecycleAddress");
    });

    it("should include L2 anchoring configuration", async () => {
      const res = await request(app).get("/api/v1/health/details");
      expect(res.body).toHaveProperty("anchoring");
      expect(res.body.anchoring).toHaveProperty("enabled");
      expect(res.body.anchoring).toHaveProperty("batchSize");
      expect(res.body.anchoring).toHaveProperty("maxAgeHours");
    });

    it("should include email provider configuration", async () => {
      const res = await request(app).get("/api/v1/health/details");
      expect(res.body).toHaveProperty("email");
      expect(res.body.email).toHaveProperty("provider");
      expect(res.body.email).toHaveProperty("configured");
    });
  });
});

describe("Error Handling & Routing", () => {
  describe("404 — Unknown routes", () => {
    it("should return 404 for non-existent GET route", async () => {
      const res = await request(app).get("/api/v1/nonexistent");
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("ok", false);
      expect(res.body).toHaveProperty("message");
    });

    it("should return 404 for non-existent POST route", async () => {
      const res = await request(app).post("/api/v1/nonexistent").send({});
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("ok", false);
    });

    it("should return 404 for completely unknown path", async () => {
      const res = await request(app).get("/this/does/not/exist");
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("Response Format Consistency", () => {
    it("should include requestId in error responses", async () => {
      const res = await request(app).get("/api/v1/nonexistent");
      expect(res.body).toHaveProperty("requestId");
    });

    it("should include ok:false in all error responses", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.body).toHaveProperty("ok", false);
      expect(res.body).toHaveProperty("message");
    });

    it("health endpoint should return proper JSON content-type", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should set security headers via Helmet", async () => {
      const res = await request(app).get("/api/v1/health");
      expect(res.headers).toHaveProperty("x-content-type-options", "nosniff");
      expect(res.headers).toHaveProperty("x-frame-options");
    });
  });
});
