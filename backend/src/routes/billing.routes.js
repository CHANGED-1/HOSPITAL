const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/billing.controller');

router.use(authenticate);

router.get('/summary', authorize('admin', 'accountant'), ctrl.summary);
router.get('/',        authorize('admin', 'accountant', 'receptionist'), ctrl.list);
router.get('/:id',     authorize('admin', 'accountant', 'receptionist'), ctrl.getOne);

router.post('/',
  authorize('admin', 'accountant', 'receptionist'),
  [
    body('patient_id').notEmpty().withMessage('patient_id is required'),
    body('bill_date').isDate().withMessage('Valid bill_date is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.description').notEmpty().withMessage('Item description is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be >= 1'),
    body('items.*.unit_price').isFloat({ min: 0 }).withMessage('Item unit_price must be >= 0'),
  ],
  validate,
  ctrl.create
);

router.patch('/:id/payment',
  authorize('admin', 'accountant', 'receptionist'),
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be positive'),
  ],
  validate,
  ctrl.recordPayment
);

module.exports = router;