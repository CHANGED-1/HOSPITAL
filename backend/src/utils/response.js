const success = (res, data = {}, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, message, data });

const created = (res, data = {}, message = 'Created') =>
  res.status(201).json({ success: true, message, data });

const paginated = (res, rows, total, page, limit) =>
  res.status(200).json({
    success: true,
    data: rows,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  });

const badRequest = (res, message = 'Bad request', errors = null) =>
  res.status(400).json({ success: false, message, ...(errors && { errors }) });

const unauthorized = (res, message = 'Unauthorized') =>
  res.status(401).json({ success: false, message });

const forbidden = (res, message = 'Forbidden') =>
  res.status(403).json({ success: false, message });

const notFound = (res, message = 'Not found') =>
  res.status(404).json({ success: false, message });

const serverError = (res, err) => {
  console.error(err);
  return res.status(500).json({ success: false, message: 'Internal server error' });
};

module.exports = { success, created, paginated, badRequest, unauthorized, forbidden, notFound, serverError };