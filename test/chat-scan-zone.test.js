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

describe("Chat API — Authentication Guard", () => {
  describe("GET /api/v1/chat/messages", () => {
    it("should reject message listing without auth", async () => {
      const res = await request(app).get("/api/v1/chat/messages?qrId=QR-001");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("POST /api/v1/chat/messages", () => {
    it("should reject sending message without auth", async () => {
      const res = await request(app).post("/api/v1/chat/messages").send({
        qrId: "QR-001",
        text: "Hello from test",
        toRoles: ["distributor"],
      });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("GET /api/v1/chat/participants", () => {
    it("should reject participant listing without auth", async () => {
      const res = await request(app).get("/api/v1/chat/participants");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });
});

describe("Scan API — Public Endpoints", () => {
  describe("GET /api/v1/scans/public/:identifier/history", () => {
    it("should return scan history for a known product", async () => {
      const res = await request(app).get(
        "/api/v1/scans/public/QR-DEMO-9002/history"
      );
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("ok", true);
      expect(res.body.data).toHaveProperty("identifier", "QR-DEMO-9002");
      expect(res.body.data).toHaveProperty("scans");
      expect(Array.isArray(res.body.data.scans)).toBe(true);
    });
  });
});

describe("Zone API — Public Endpoints", () => {
  describe("GET /api/v1/zones/active", () => {
    it("should return active geofence zones", async () => {
      const res = await request(app).get("/api/v1/zones/active");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("ok", true);
      expect(res.body).toHaveProperty("data");
    });
  });
});
