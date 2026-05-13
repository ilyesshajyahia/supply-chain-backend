const request = require("supertest");
const app = require("../src/app");

describe("API Server Bootstrap", () => {
  it("should return 200 on root endpoint", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toEqual(200);
    expect(res.text).toBe("ChainTrace backend is running");
  });
});
