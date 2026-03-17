const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const productService = require("../services/product.service");

const register = asyncHandler(async (req, res) => {
  const data = await productService.registerProduct({ user: req.user, payload: req.body });
  res.status(201).json({ ok: true, data });
});

const transfer = asyncHandler(async (req, res) => {
  const data = await productService.transferProduct({ user: req.user, payload: req.body });
  res.json({ ok: true, data });
});

const finalizeSale = asyncHandler(async (req, res) => {
  const data = await productService.finalizeSale({ user: req.user, payload: req.body });
  res.json({ ok: true, data });
});

const history = asyncHandler(async (req, res) => {
  const data = await productService.getProductHistoryByQrId(req.params.qrId);
  if (!data) {
    throw new ApiError(404, "Product not found");
  }
  res.json({ ok: true, data });
});

module.exports = { register, transfer, finalizeSale, history };
