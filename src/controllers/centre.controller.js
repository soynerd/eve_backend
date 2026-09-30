import * as centreService from '../services/centre.service.js';
import { createCentreSchema, updateCentreSchema } from '../validators/centre.validator.js';
import { validate } from '../utils/validation.js';
import { ok, created, paginated } from '../utils/response.js';

const list = async (req, res) => {
  const { centres, meta } = await centreService.listCentres(req.query);
  return paginated(res, centres, meta);
};

const get = async (req, res) => {
  const centre = await centreService.getCentre(req.params.id);
  return ok(res, centre);
};

const create = async (req, res) => {
  const data = validate(createCentreSchema, req.body);
  const centre = await centreService.createCentre(data);
  return created(res, centre);
};

const update = async (req, res) => {
  const data = validate(updateCentreSchema, req.body);
  const centre = await centreService.updateCentre(req.params.id, data);
  return ok(res, centre);
};

const remove = async (req, res) => {
  await centreService.deleteCentre(req.params.id);
  return res.status(204).send();
};

const getTests = async (req, res) => {
  const { tests, meta } = await centreService.getCentreTests(req.params.id, req.query);
  return paginated(res, tests, meta);
};

export { list, get, create, update, remove, getTests };
