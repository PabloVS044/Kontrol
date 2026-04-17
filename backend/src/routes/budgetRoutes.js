import { Router } from 'express';
import { registerExpense } from '../controllers/budgetController.js';
import { expenseSchema } from '../schemas/budgetSchema.js';

const router = Router();

router.post('/register-expense', registerExpense);

export default router;