const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/pharmacy.controller');

router.use(authenticate);

// ─── Drugs ────────────────────────────────────────────────────────
router.get('/drugs',        ctrl.listDrugs);
router.get('/drugs/:id',    ctrl.getDrug);

router.post('/drugs',
  authorize('admin', 'pharmacist'),
  [
    body('name').trim().notEmpty().withMessage('Drug name is required'),
    body('unit_price').isFloat({ min: 0 }).withMessage('unit_price must be a positive number'),
    body('quantity_in_stock').optional().isInt({ min: 0 }),
  ],
  validate,
  ctrl.createDrug
);

router.patch('/drugs/:id',
  authorize('admin', 'pharmacist'),
  [
    body('unit_price').optional().isFloat({ min: 0 }),
    body('quantity_in_stock').optional().isInt({ min: 0 }),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validate,
  ctrl.updateDrug
);

router.patch('/drugs/:id/stock',
  authorize('admin', 'pharmacist'),
  [body('adjustment').isInt().withMessage('adjustment must be an integer')],
  validate,
  ctrl.adjustStock
);

// ─── Prescriptions ────────────────────────────────────────────────
router.get('/prescriptions', ctrl.listPrescriptions);

router.patch('/prescriptions/:id/dispense',
  authorize('admin', 'pharmacist'),
  ctrl.dispense
);

module.exports = router;