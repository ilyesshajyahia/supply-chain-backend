const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/app");
const env = require("../src/config/env");

let authToken = null;

beforeAll(async () => {
  await mongoose.connect(env.mongoUri);

  // Login to get a valid token for protected endpoints
  const res = await request(app).post("/api/v1/auth/login").send({
    email: "ilyesshajyahia@gmail.com",
    password: "Kappa123*",
  });
  authToken = res.body.data?.token;
});

afterAll(async () => {
  await mongoose.disconnect();
});

describe("Product API — Authentication Guard", () => {
  describe("POST /api/v1/products/register", () => {
    it("should reject product registration without auth token", async () => {
      const res = await request(app).post("/api/v1/products/register").send({
        name: "Test Product",
        batchNumber: "B-001",
      });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });

    it("should reject with malformed Bearer token", async () => {
      const res = await request(app)
        .post("/api/v1/products/register")
        .set("Authorization", "Bearer fake.jwt.token")
        .send({ name: "Test Product" });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("POST /api/v1/products/transfer", () => {
    it("should reject transfer without auth token", async () => {
      const res = await request(app).post("/api/v1/products/transfer").send({
        qrId: "QR-001",
        toAddress: "0x1234",
      });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("POST /api/v1/products/finalize-sale", () => {
    it("should reject sale finalization without auth token", async () => {
      const res = await request(app).post("/api/v1/products/finalize-sale").send({
        qrId: "QR-001",
      });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("POST /api/v1/products/:id/flag", () => {
    it("should reject product flagging without auth token", async () => {
      const res = await request(app)
        .post("/api/v1/products/PROD-001/flag")
        .send({ reason: "suspected counterfeit" });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("POST /api/v1/products/:id/report-fake", () => {
    it("should reject counterfeit report without auth token", async () => {
      const res = await request(app)
        .post("/api/v1/products/PROD-001/report-fake")
        .send({ reason: "duplicate QR code" });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });
});

describe("Product API — Product Lifecycle", () => {
  describe("GET /api/v1/products/:identifier/history", () => {
    it("should return full lifecycle history for a valid product", async () => {
      const res = await request(app).get("/api/v1/products/QR-DEMO-9002/history");
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("ok", true);
      expect(res.body).toHaveProperty("data");
      expect(res.body.data).toHaveProperty("product");
      expect(res.body.data).toHaveProperty("events");
      expect(Array.isArray(res.body.data.events)).toBe(true);
    });

    it("should include product metadata in history response", async () => {
      const res = await request(app).get("/api/v1/products/QR-DEMO-9002/history");
      const product = res.body.data.product;
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("qrId", "QR-DEMO-9002");
    });

    it("should return 404 for a non-existent product", async () => {
      const res = await request(app).get(
        "/api/v1/products/DOES-NOT-EXIST-999/history"
      );
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty("ok", false);
    });
  });
});
