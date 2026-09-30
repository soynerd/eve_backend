import * as authService from '../services/auth.service.js';
import { signupSchema, loginSchema } from '../validators/auth.validator.js';
import { validate } from '../utils/validation.js';
import { ok, created } from '../utils/response.js';

const signup = async (req, res) => {
  const data = validate(signupSchema, req.body);
  const result = await authService.signup(data);
  return created(res, result);
};

const login = async (req, res) => {
  const data = validate(loginSchema, req.body);
  const result = await authService.login(data);
  return ok(res, result);
};

export { signup, login };
