const router = require('express').Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/users.controller');

const ROLES = ['admin', 'doctor', 'nurse', 'receptionist', 'accountant', 'pharmacist'];

// All user routes require authentication
router.use(authenticate);

router.get('/',    authorize('admin'), ctrl.list);
router.get('/:id', authorize('admin'), ctrl.getOne);

router.post('/',
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`),
    body('email').optional().isEmail().withMessage('Invalid email'),
  ],
  validate,
  ctrl.create
);

router.patch('/:id',
  authorize('admin'),
  [
    body('role').optional().isIn(ROLES).withMessage('Invalid role'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
    body('email').optional().isEmail().withMessage('Invalid email'),
  ],
  validate,
  ctrl.update
);

router.patch('/:id/password',
  authorize('admin'),
  [body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')],
  validate,
  ctrl.changePassword
);

router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;