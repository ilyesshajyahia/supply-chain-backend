const request = require("supertest");
const app = require("../src/app");

describe("API Regression Tests", () => {
  describe("GET /", () => {
    it("should return API health status", async () => {
      const res = await request(app).get("/");
      expect(res.statusCode).toEqual(200);
      expect(res.text).toBe("ChainTrace backend is running");
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should reject unauthorized requests", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

});
