import * as testService from '../services/test.service.js';
import {
  createTestSchema,
  updateTestSchema,
  addCentreToTestSchema,
} from '../validators/test.validator.js';
import { validate } from '../utils/validation.js';
import { ok, created, paginated } from '../utils/response.js';

const list = async (req, res) => {
  const { tests, meta } = await testService.listTests(req.query);
  return paginated(res, tests, meta);
};

const get = async (req, res) => {
  const test = await testService.getTest(req.params.id);
  return ok(res, test);
};

const create = async (req, res) => {
  const data = validate(createTestSchema, req.body);
  const test = await testService.createTest(data);
  return created(res, test);
};

const update = async (req, res) => {
  const data = validate(updateTestSchema, req.body);
  const test = await testService.updateTest(req.params.id, data);
  return ok(res, test);
};

const remove = async (req, res) => {
  await testService.deleteTest(req.params.id);
  return res.status(204).send();
};

const addCentre = async (req, res) => {
  const { centreId } = validate(addCentreToTestSchema, req.body);
  const centreTest = await testService.addTestToCentre(req.params.id, centreId);
  return created(res, centreTest);
};

const removeCentre = async (req, res) => {
  await testService.removeTestFromCentre(req.params.id, req.params.centreId);
  return res.status(204).send();
};

const getCentres = async (req, res) => {
  const { centres, meta } = await testService.getTestCentres(req.params.id, req.query);
  return paginated(res, centres, meta);
};

export { list, get, create, update, remove, addCentre, removeCentre, getCentres };
