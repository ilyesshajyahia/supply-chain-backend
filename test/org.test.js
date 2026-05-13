const request = require("supertest");
const app = require("../src/app");

describe("Organization API — Authentication Guard", () => {
  describe("GET /api/v1/org/users", () => {
    it("should reject without auth token", async () => {
      const res = await request(app).get("/api/v1/org/users");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });

    it("should reject with invalid Bearer token", async () => {
      const res = await request(app)
        .get("/api/v1/org/users")
        .set("Authorization", "Bearer invalid.jwt");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("GET /api/v1/org/metrics/gas", () => {
    it("should reject gas metrics without auth", async () => {
      const res = await request(app).get("/api/v1/org/metrics/gas?days=7");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("GET /api/v1/org/anchors/status", () => {
    it("should reject anchor status without auth", async () => {
      const res = await request(app).get("/api/v1/org/anchors/status");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("GET /api/v1/org/anchors", () => {
    it("should reject anchor list without auth", async () => {
      const res = await request(app).get("/api/v1/org/anchors");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("POST /api/v1/org/anchors/run", () => {
    it("should reject manual anchor run without auth", async () => {
      const res = await request(app).post("/api/v1/org/anchors/run");
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("PATCH /api/v1/org/users/:userId/active", () => {
    it("should reject user activation without auth", async () => {
      const res = await request(app)
        .patch("/api/v1/org/users/507f1f77bcf86cd799439011/active")
        .send({ isActive: true });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("PATCH /api/v1/org/users/:userId/admin", () => {
    it("should reject admin promotion without auth", async () => {
      const res = await request(app)
        .patch("/api/v1/org/users/507f1f77bcf86cd799439011/admin")
        .send({ isOrgAdmin: true });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });

  describe("POST /api/v1/org/batches/:batchNumber/flag", () => {
    it("should reject batch quarantine without auth", async () => {
      const res = await request(app)
        .post("/api/v1/org/batches/B-2023-XYZ/flag")
        .send({ status: "quarantined", reason: "test" });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty("ok", false);
    });
  });
});
