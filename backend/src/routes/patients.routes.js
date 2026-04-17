const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/patients.controller');

router.use(authenticate);

// Any authenticated staff can view patients
router.get('/',    ctrl.list);
router.get('/:id', ctrl.getOne);
router.get('/:id/history', ctrl.history);

// Receptionists, doctors, nurses, and admins can create/edit
const canEdit = authorize('admin', 'doctor', 'nurse', 'receptionist');

router.post('/',
  canEdit,
  [
    body('first_name').trim().notEmpty().withMessage('First name is required'),
    body('last_name').trim().notEmpty().withMessage('Last name is required'),
    body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
    body('date_of_birth').optional().isDate().withMessage('Invalid date of birth'),
  ],
  validate,
  ctrl.create
);

router.patch('/:id',
  canEdit,
  [
    body('gender').optional().isIn(['male', 'female', 'other']),
    body('status').optional().isIn(['active', 'inactive', 'deceased']),
  ],
  validate,
  ctrl.update
);

module.exports = router;